#!/usr/bin/env bash
# 目标链路验证：小程序用户「注册 → 购买 → 进待分配池 → 运营安置 → 入群」全流程闭环。
# 覆盖 SPEC §4.7 入群八态漏斗 + M3 付费门控 + 企微/个微拉群任务派发。
# 与 smoke.sh 的区别：smoke 从外部系统进线（sync）；本脚本从**小程序自助注册+付费**起步，
# 验证 C 端用户不依赖运营手工建档也能走完入群。
set -uo pipefail
BASE="${BASE:-http://127.0.0.1:8080/api/v1}"
PASS=0; FAIL=0
say()  { printf '\n\033[1;36m── %s\033[0m\n' "$*"; }
ok()   { PASS=$((PASS+1)); printf '  \033[32mOK\033[0m  %s\n' "$*"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$*"; }
jqv()  { python3 -c "import json,sys;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }
S=$RANDOM$RANDOM

say "1. 小程序自助登录建档（wx.login → /mp/login）"
RA=$(curl -s "$BASE/mp/login" -H 'Content-Type: application/json' -d "{\"code\":\"join-$S\"}")
TA=$(echo "$RA" | jqv "['data']['token']"); NA=$(echo "$RA" | jqv "['data']['memberNo']")
HA="Authorization: Bearer $TA"
[ -n "$TA" ] && ok "会员建档 $NA" || { bad "登录失败: $RA"; exit 1; }

say "2. 购买会员（下单 → 支付回调 → 权益生效）"
PC=$(curl -s "$BASE/mp/plans" -H "$HA" | jqv "['data'][0]['plan_code']")
ON=$(curl -s "$BASE/mp/orders" -H "$HA" -H 'Content-Type: application/json' \
      -d "{\"planCode\":\"$PC\",\"channel\":\"android\"}" | jqv "['data']['order_no']")
PST=$(curl -s -X POST "$BASE/mp/orders/$ON/pay" -H "$HA" | jqv "['data']['status']")
[ "$PST" = "已支付" ] && ok "订单 $ON 已支付" || bad "支付失败: $PST"
PAID=$(curl -s "$BASE/mp/me" -H "$HA" | jqv "['data']['hasPaidEntitlement']")
[ "$PAID" = "True" ] && ok "付费权益已生效" || bad "权益未生效"

say "3. 【关键】付费即进待分配池——运营在 PC 端能看到这个人"
TOKEN=$(curl -s "$BASE/auth/login" -H 'Content-Type: application/json' \
        -d '{"username":"boss","password":"demo123"}' | jqv "['data']['token']")
AUTH="Authorization: Bearer $TOKEN"
PENDING=$(curl -s "$BASE/assignment/pending?projectId=flm-membership" -H "$AUTH")
echo "$PENDING" | grep -q "$NA" && ok "待分配池含 $NA（购买→安置链路已闭合）" \
  || bad "待分配池缺 $NA —— 付费用户卡死，运营看不到"

say "4. 小程序侧提示：应显示排队中而非空白"
G1=$(curl -s "$BASE/mp/my-group" -H "$HA")
echo "$G1" | jqv "['data']['hint']" | grep -q "匹配\|安置\|排队" && ok "已给出等待提示" || bad "提示缺失"

say "5. 运营推荐群方案（推荐引擎）"
REC=$(curl -s "$BASE/assignment/recommend" -H "$AUTH" -H 'Content-Type: application/json' \
      -d "{\"memberNo\":\"$NA\",\"projectId\":\"flm-membership\"}")
AID=$(echo "$REC" | jqv "['data']['assignmentId']")
RGID=$(echo "$REC" | jqv "['data']['recommendation']['best']['groupId']")
[ -n "$AID" ] && ok "推荐方案 #$AID → 群 ${RGID:-?}" || bad "推荐失败: $(echo "$REC" | head -c 300)"

say "6. 确认安置（容量预占 + 派发加好友任务）"
CONF=$(curl -s "$BASE/assignment/confirm" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"assignmentId\":$AID}")
CST=$(echo "$CONF" | jqv "['data']['status']")
TASK_ID=$(echo "$CONF" | jqv "['data']['taskId']")
GID=$(echo "$CONF" | jqv "['data']['groupId']")
[ "$CST" = "待加好友" ] && ok "安置确认 → $CST（已派发个微加好友任务）" || bad "确认异常: $CST"

say "7. 客服回填加好友结果 → 派发邀请任务"
curl -s "$BASE/tasks/$TASK_ID/attempts" -H "$AUTH" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: join-$S-f" -d '{"result":"成功"}' > /dev/null
A1=$(curl -s "$BASE/assignment/$AID" -H "$AUTH")
FST=$(echo "$A1" | jqv "['data']['status']")
INVITE_TASK=$(echo "$A1" | jqv "['data']['invite_task_id']")
[ "$FST" = "待邀请" ] && ok "加好友回填 → $FST（自动派生邀请任务 #$INVITE_TASK）" || bad "好友回填异常: $FST"

say "8. 邀请回填 → 已邀请"
curl -s "$BASE/tasks/$INVITE_TASK/attempts" -H "$AUTH" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: join-$S-i" -d '{"result":"成功"}' > /dev/null
IST=$(curl -s "$BASE/assignment/$AID" -H "$AUTH" | jqv "['data']['status']")
[ "$IST" = "已邀请" ] && ok "邀请回填 → $IST" || bad "邀请回填异常: $IST"

say "9. 企微入群事件 webhook → 已入群（唯一可置已入群的两条路径之一）"
WH=$(curl -s "$BASE/webhook/wecom/group-event" -H 'Content-Type: application/json' \
     -d "{\"eventType\":\"join\",\"groupId\":\"$GID\",\"memberNo\":\"$NA\"}")
echo "$WH" | grep -q '"code":0' && ok "企微入群事件已受理（群 $GID）" || bad "webhook 失败: $(echo "$WH" | head -c 200)"

say "10. 小程序侧：用户应看到「已入群」+ 群信息"
G2=$(curl -s "$BASE/mp/my-group" -H "$HA")
JST=$(echo "$G2" | jqv "['data']['assignment']['status']")
[ "$JST" = "已入群" ] && ok "小程序显示已入群（链路闭环）" || bad "小程序状态: $JST"
GNAME=$(echo "$G2" | jqv "['data']['assignment']['group_name']")
[ -n "$GNAME" ] && ok "群名可见：$GNAME" || bad "群名缺失"

say "11. 安置完成后应退出待分配池（避免重复投池）"
PENDING2=$(curl -s "$BASE/assignment/pending?projectId=flm-membership" -H "$AUTH")
echo "$PENDING2" | grep -q "$NA" && bad "已入群仍在待分配池（会被重复安置）" \
  || ok "已退出待分配池"

say "12. 裂变：被邀请人经该用户邀请码注册，关系链入账"
CODE=$(curl -s "$BASE/mp/invite" -H "$HA" | jqv "['data']['inviteCode']")
RB=$(curl -s "$BASE/mp/login" -H 'Content-Type: application/json' \
     -d "{\"code\":\"join-B-$S\",\"inviteCode\":\"$CODE\"}")
NB=$(echo "$RB" | jqv "['data']['memberNo']")
INF=$(curl -s "$BASE/mp/invite" -H "$HA" | jqv "['data']['influence']")
[ -n "$NB" ] && ok "被邀请人 $NB 建档" || bad "邀请注册失败"
[ "$INF" -ge 1 ] 2>/dev/null && ok "邀请人影响力 = $INF" || bad "关系链未入账"

printf '\n\033[1m结果：%d 通过 / %d 失败\033[0m\n' "$PASS" "$FAIL"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
