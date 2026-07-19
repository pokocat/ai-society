#!/usr/bin/env bash
# 小程序端到端旅程验证：完全模拟 miniprogram 前端的请求序列
set -uo pipefail
BASE="http://127.0.0.1:8080/api/v1"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); printf '  \033[32mOK\033[0m  %s\n' "$*"; }
bad() { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$*"; }
say() { printf '\n\033[1;36m── %s\033[0m\n' "$*"; }
jqv() { python3 -c "import json,sys;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }

S=$RANDOM$RANDOM

say "A1. 用户A 首次打开小程序：wx.login → /mp/login（无邀请码）"
RA=$(curl -s "$BASE/mp/login" -H 'Content-Type: application/json' -d "{\"code\":\"e2e-A-$S\"}")
TA=$(echo "$RA" | jqv "['data']['token']"); NA=$(echo "$RA" | jqv "['data']['memberNo']")
[ -n "$TA" ] && ok "A 登录建档 $NA" || bad "A 登录失败: $RA"
HA="Authorization: Bearer $TA"

say "A2. 首页数据：/mp/me（未开通）"
ME=$(curl -s "$BASE/mp/me" -H "$HA")
PAID=$(echo "$ME" | jqv "['data']['hasPaidEntitlement']")
[ "$PAID" = "False" ] && ok "初始未开通会员" || bad "hasPaidEntitlement 异常: $PAID"

say "A3. 购买会员：/mp/plans → 下单 → Mock 支付"
PLANS=$(curl -s "$BASE/mp/plans" -H "$HA")
PC=$(echo "$PLANS" | jqv "['data'][0]['plan_code']")
[ -n "$PC" ] && ok "取到套餐 $PC" || bad "无套餐: $PLANS"
ORD=$(curl -s "$BASE/mp/orders" -H "$HA" -H 'Content-Type: application/json' -d "{\"planCode\":\"$PC\",\"channel\":\"android\"}")
ON=$(echo "$ORD" | jqv "['data']['order_no']")
[ -n "$ON" ] && ok "下单 $ON" || bad "下单失败: $ORD"
PAY=$(curl -s -X POST "$BASE/mp/orders/$ON/pay" -H "$HA")
PST=$(echo "$PAY" | jqv "['data']['status']")
[ "$PST" = "已支付" ] && ok "支付回调成功（$PST）" || bad "支付失败: $PAY"
ME2=$(curl -s "$BASE/mp/me" -H "$HA")
PAID2=$(echo "$ME2" | jqv "['data']['hasPaidEntitlement']")
[ "$PAID2" = "True" ] && ok "权益已生效" || bad "支付后权益未生效: $(echo "$ME2" | head -c 300)"

say "A4. 社群页：/mp/my-group（付费后应有进度/提示）"
G=$(curl -s "$BASE/mp/my-group" -H "$HA")
GOK=$(echo "$G" | jqv "['code']")
[ "$GOK" = "0" ] && ok "my-group 可用：$(echo "$G" | jqv "['data'].get('hint') or (['data']['assignment'] and '已有安置')")" || bad "my-group: $G"

say "A5. 邀请页：/mp/invite 取邀请码"
IV=$(curl -s "$BASE/mp/invite" -H "$HA")
CODE=$(echo "$IV" | jqv "['data']['inviteCode']")
SP=$(echo "$IV" | jqv "['data']['sharePath']")
[ -n "$CODE" ] && ok "邀请码 $CODE" || bad "取邀请码失败: $IV"
echo "$SP" | grep -q "inviteCode=$CODE" && ok "sharePath 带邀请码: $SP" || bad "sharePath 异常: $SP"

say "B1. 用户B 通过 A 的分享打开：/mp/login 携带 inviteCode（关系链绑定）"
RB=$(curl -s "$BASE/mp/login" -H 'Content-Type: application/json' -d "{\"code\":\"e2e-B-$S\",\"inviteCode\":\"$CODE\"}")
TB=$(echo "$RB" | jqv "['data']['token']"); NB=$(echo "$RB" | jqv "['data']['memberNo']")
REF=$(echo "$RB" | jqv "['data']['referral']")
[ -n "$TB" ] && ok "B 登录建档 $NB（referral: $REF）" || bad "B 登录失败: $RB"
HB="Authorization: Bearer $TB"

say "B2. A 的邀请树应出现 B（LV1），影响力+1"
IV2=$(curl -s "$BASE/mp/invite" -H "$HA")
echo "$IV2" | grep -q "$NB" && ok "A 下线含 $NB" || bad "A 下线缺 B: $(echo "$IV2" | head -c 400)"
INF=$(echo "$IV2" | jqv "['data']['influence']")
[ "$INF" -ge 1 ] 2>/dev/null && ok "影响力 = $INF (≥1)" || bad "影响力异常: $INF"

say "B3. B 的档案：推荐人应为 A"
PB=$(curl -s "$BASE/mp/profile" -H "$HB")
PREF=$(echo "$PB" | jqv "['data']['referrer']['member_no']")
[ "$PREF" = "$NA" ] && ok "B 的推荐人 = $NA" || bad "推荐人异常: $PREF（期望 $NA）"

say "B4. C 经 B 邀请（二级链）：A 影响力应含二级"
IVB=$(curl -s "$BASE/mp/invite" -H "$HB")
CODEB=$(echo "$IVB" | jqv "['data']['inviteCode']")
RC=$(curl -s "$BASE/mp/login" -H 'Content-Type: application/json' -d "{\"code\":\"e2e-C-$S\",\"inviteCode\":\"$CODEB\"}")
NC=$(echo "$RC" | jqv "['data']['memberNo']")
[ -n "$NC" ] && ok "C 建档 $NC（经 B 邀请）" || bad "C 登录失败"
IV3=$(curl -s "$BASE/mp/invite" -H "$HA")
LV2=$(echo "$IV3" | python3 -c "import json,sys;d=json.load(sys.stdin);print(sum(1 for x in d['data']['downline'] if int(x['level'])==2))")
[ "$LV2" -ge 1 ] 2>/dev/null && ok "A 的二级下线数 = $LV2 (≥1)" || bad "二级链未记录: LV2=$LV2"

say "A6. 邀请成长值：A 应有邀请奖励"
IG=$(echo "$IV3" | jqv "['data']['inviteGrowth']")
[ "$IG" -ge 1 ] 2>/dev/null && ok "A 邀请成长值 = $IG" || bad "邀请成长值 = $IG"

say "A7. 任务页：/mp/tasks（列表可用；有任务则完成得积分）"
TK=$(curl -s "$BASE/mp/tasks" -H "$HA")
TKC=$(echo "$TK" | jqv "['code']")
[ "$TKC" = "0" ] && ok "任务列表可用（$(echo "$TK" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['data']))") 项）" || bad "任务列表: $TK"
TID=$(echo "$TK" | python3 -c "import json,sys;d=json.load(sys.stdin)['data'];print(next((t['id'] for t in d if not t['done']),''))")
if [ -n "$TID" ]; then
  DONE=$(curl -s -X POST "$BASE/mp/tasks/$TID/complete" -H "$HA")
  PTS=$(echo "$DONE" | jqv "['data']['pointsAwarded']")
  [ -n "$PTS" ] && ok "完成任务#$TID 得 $PTS 积分" || bad "完成任务失败: $DONE"
fi

say "A8. 收益/提现：/mp/earnings + 申请提现（幂等）"
EA=$(curl -s "$BASE/mp/earnings" -H "$HA")
WD=$(echo "$EA" | jqv "['data']['summary']['withdrawable']")
ok "可提现 = $WD"
IDEM="mpwd-e2e-$S"
if python3 -c "exit(0 if float('$WD')>=100 else 1)" 2>/dev/null; then
  W1=$(curl -s "$BASE/mp/withdrawals" -H "$HB" -H "$HA" -H 'Content-Type: application/json' -H "Idempotency-Key: $IDEM" -d '{"amount":100,"method":"微信"}')
  WID=$(echo "$W1" | jqv "['data']['withdrawalId']")
  [ -n "$WID" ] && ok "提现受理 #$WID（进入审批）" || bad "提现失败: $W1"
  W2=$(curl -s "$BASE/mp/withdrawals" -H "$HA" -H 'Content-Type: application/json' -H "Idempotency-Key: $IDEM" -d '{"amount":100,"method":"微信"}')
  WID2=$(echo "$W2" | jqv "['data']['withdrawalId']")
  [ "$WID2" = "$WID" ] && ok "幂等键重放返回同一单 #$WID2" || bad "幂等失效: $WID2 vs $WID"
else
  ok "余额不足 100，跳过提现（前端按钮同样禁用）"
fi

say "A9. 其余页面接口：courses / faq / profile"
for ep in courses faq profile; do
  C=$(curl -s "$BASE/mp/$ep" -H "$HA" | jqv "['code']")
  [ "$C" = "0" ] && ok "/mp/$ep 可用" || bad "/mp/$ep 异常"
done

say "A10. token 失效自愈：伪 token 应返回 4030（前端会清态重登）"
BADR=$(curl -s "$BASE/mp/me" -H "Authorization: Bearer invalid-token-xyz")
BC=$(echo "$BADR" | jqv "['code']")
[ "$BC" = "4030" ] && ok "无效 token → code 4030" || bad "无效 token 返回: $BADR"

printf '\n\033[1m结果：%d 通过 / %d 失败\033[0m\n' "$PASS" "$FAIL"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
