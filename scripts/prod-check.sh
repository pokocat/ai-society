#!/usr/bin/env bash
# 上线就绪自检：对着一个**已按生产变量启动**的实例跑，逐条验证收口是否真的生效。
# 用法：BASE=https://api.example.com/api/v1 PUBLIC=https://api.example.com bash scripts/prod-check.sh
#
# 这是「部署上去直接能用」的最后一道闸：每条都是线上出事故的真实入口，
# 只看环境变量设没设不算数——必须打到接口上确认行为。
set -uo pipefail
BASE="${BASE:-http://127.0.0.1:8080/api/v1}"
PUBLIC="${PUBLIC:-${BASE%/api/v1}}"
# 探测一律打实际服务地址；PUBLIC 只用于校验对外基址是否合规（它可能尚未解析到本机）
ORIGIN="${BASE%/api/v1}"
PASS=0; FAIL=0; WARN=0
ok()   { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$*"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$*"; }
warn() { WARN=$((WARN+1)); printf '  \033[33mWARN\033[0m %s\n' "$*"; }
say()  { printf '\n\033[1;36m── %s\033[0m\n' "$*"; }
code() { curl -s -o /dev/null -w '%{http_code}' -m 8 "$@" 2>/dev/null; }

say "1. mock 注入口必须整组下线（SCP_MOCK_ENDPOINTS=false）"
C=$(code -X POST "$BASE/mock/push-pending-member" -H 'Content-Type: application/json' -d '{"name":"probe"}')
[ "$C" = "404" ] && ok "mock 进线口已下线（404）" \
  || bad "mock 进线口仍可达（HTTP $C）—— 任何人可无鉴权灌数据，必须设 SCP_MOCK_ENDPOINTS=false"

C=$(code "$ORIGIN/mock/qrcode/G-0001.png")
case "$C" in
  404) ok "演示活码图已下线（404）";;
  000) warn "演示活码图无法探测（$ORIGIN 不可达），请手工确认";;
  *)   bad "演示活码图仍可达（HTTP $C）——生产会把假二维码发给会员";;
esac

say "2. 演示支付必须禁用（SCP_MOCK_PAY=false）"
T=$(curl -s -m 8 "$BASE/mp/login" -H 'Content-Type: application/json' -d '{"code":"prodcheck-probe"}' \
    | python3 -c "import json,sys;print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null)
if [ -n "$T" ]; then
  R=$(curl -s -m 8 -X POST "$BASE/mp/orders/PROBE/pay" -H "Authorization: Bearer $T")
  echo "$R" | grep -q "不支持演示支付" && ok "演示支付已禁用（只认微信支付回调）" \
    || bad "演示支付未禁用：$(echo "$R" | head -c 90) —— 客户端可直报支付成功，必须设 SCP_MOCK_PAY=false"
else
  warn "无法取得小程序 token，跳过演示支付检查（检查 WX 凭证）"
fi

say "3. 微信凭证必须实连（WX_MOCK=false + WX_SECRET）"
R=$(curl -s -m 8 "$BASE/mp/login" -H 'Content-Type: application/json' -d '{"code":"obviously-invalid-code"}')
echo "$R" | grep -q '"code":0' \
  && bad "非法 code 仍登录成功 —— WX_MOCK 仍为 true，任何人可伪造身份登录" \
  || ok "非法 code 被拒（已走真实 code2Session）"

say "4. 企微回调必须验签（SCP_WEBHOOK_VERIFY=true）"
# 注意：本服务统一信封 {code,message,data}，HTTP 恒 200，鉴权结果看业务码而非 HTTP 码
R=$(curl -s -m 8 -X POST "$BASE/webhook/wecom/group-event" -H 'Content-Type: application/json' \
    -d '{"eventType":"join","groupId":"G-0001","memberNo":"U-1"}')
echo "$R" | grep -qE '"code":(4030|4003)' && ok "无签名回调被拒（$(echo "$R" | head -c 60)）" \
  || bad "无签名回调未被拒：$(echo "$R" | head -c 90) —— 伪造入群事件可刷人数/骗奖励，必须设 SCP_WEBHOOK_VERIFY=true+TOKEN"

say "5. JWT 密钥不得为开发默认值"
R=$(curl -s -m 8 "$BASE/auth/login" -H 'Content-Type: application/json' \
    -d '{"username":"boss","password":"demo123"}')
if echo "$R" | grep -q '"code":0'; then
  warn "演示账号 boss/demo123 仍可登录 —— 上线前请改密或停用演示账号"
else
  ok "演示账号已不可用"
fi

say "6. 对外基址必须是 https 备案域名（SCP_PUBLIC_BASE_URL）"
case "$PUBLIC" in
  https://*) ok "public-base-url 为 https（$PUBLIC）";;
  *) bad "public-base-url 非 https（$PUBLIC）—— 小程序只允许 https，活码图会加载失败";;
esac

say "7. CORS 不得为通配（SCP_CORS_ORIGINS）"
H=$(curl -s -m 8 -I -X OPTIONS "$BASE/mp/plans" -H 'Origin: https://evil.example.com' \
    -H 'Access-Control-Request-Method: GET' 2>/dev/null | grep -i 'access-control-allow-origin' | tr -d '\r')
echo "$H" | grep -q 'evil.example.com' \
  && bad "任意 Origin 被放行（$H）—— 必须用 SCP_CORS_ORIGINS 收敛到管理台域名" \
  || ok "陌生 Origin 未被放行"

printf '\n\033[1m上线自检：%d 通过 / %d 失败 / %d 提醒\033[0m\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ] && printf '\033[32m可以上线\033[0m\n' || printf '\033[31m存在阻断项，先修再上\033[0m\n'
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
