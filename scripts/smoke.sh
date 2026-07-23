#!/usr/bin/env bash
# 端到端冒烟（SPEC §16-2/§16-4 + M3 付费闭环）：
# 登录 → mock 外部系统进线待分配会员（带推荐人）→ 会员购买（虚拟支付 Mock，权益生效=付费门控放行）
# → 推荐 → 确认 → 加好友回填 → 自动邀请任务 → 邀请回填 → webhook 入群事件
# → 断言：状态/群人数/预占消耗/档案时间线/影响力/成长值 → 超载阻断。
#
# 前置：服务须以 dev profile 启动（开 mock 注入口/演示支付）：
#   SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run
set -uo pipefail
BASE="${BASE:-http://127.0.0.1:8080/api/v1}"
PASS=0; FAIL=0

say()  { printf '\n\033[1;36m── %s\033[0m\n' "$*"; }
ok()   { PASS=$((PASS+1)); printf '  \033[32mOK\033[0m  %s\n' "$*"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$*"; }
assert_eq() { [ "$1" = "$2" ] && ok "$3 = $1" || bad "$3 期望 $2 实际 $1"; }
assert_ge() { [ "$1" -ge "$2" ] && ok "$3 = $1 (≥$2)" || bad "$3 期望 ≥$2 实际 $1"; }
jqv() { python3 -c "import json,sys;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }

say "1. 登录（创始人）"
TOKEN=$(curl -s "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"boss","password":"demo123"}' | jqv "['data']['token']")
[ -n "$TOKEN" ] && ok "取得 JWT" || { bad "登录失败"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

say "2. mock 外部系统进线：新会员 烟测小明（推荐人=赵一川 U-100086）"
SUFFIX=$RANDOM$RANDOM
RESP=$(curl -s "$BASE/mock/push-pending-member" -H 'Content-Type: application/json' -d "{
  \"name\":\"烟测小明$SUFFIX\",\"phone\":\"139$SUFFIX\",\"city\":\"北京\",\"sourceChannel\":\"推广码\",
  \"projectId\":\"flm-membership\",\"identity\":\"PRO会员\",\"referrerNo\":\"U-100086\"}")
MEMBER_NO=$(echo "$RESP" | jqv "['data']['memberNo']")
[ -n "$MEMBER_NO" ] && ok "统一会员建档 $MEMBER_NO，已绑定推荐关系" || bad "进线失败: $RESP"

say "3. 成长值：赵一川应 +288（默认规则）"
GROWTH=$(PGPASSWORD=scp_dev_pw psql -h 127.0.0.1 -U scp -d scp_dev -tAc \
  "SELECT delta FROM growth_ledger WHERE reason='邀请成功' ORDER BY id DESC LIMIT 1")
assert_eq "$GROWTH" "288" "邀请成长值"

say "4. 待分配池应包含新会员"
PENDING=$(curl -s "$BASE/assignment/pending?projectId=flm-membership" -H "$AUTH")
echo "$PENDING" | grep -q "$MEMBER_NO" && ok "待分配池含 $MEMBER_NO" || bad "待分配池缺失"

say "4b. M3 付费闭环：下单（MPLAN-PRO-M）→ Mock 虚拟支付回调 → 权益生效"
ORDER=$(curl -s "$BASE/membership/orders" -H "$AUTH" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: smoke-order-$SUFFIX" \
  -d "{\"memberNo\":\"$MEMBER_NO\",\"planCode\":\"MPLAN-PRO-M\",\"channel\":\"android\",\"projectId\":\"flm-membership\"}")
ORDER_NO=$(echo "$ORDER" | jqv "['data']['order_no']")
[ -n "$ORDER_NO" ] && ok "会员费订单 $ORDER_NO（待支付）" || bad "下单失败: $ORDER"
PAID=$(curl -s -X POST "$BASE/membership/orders/$ORDER_NO/mock-pay" -H "$AUTH")
assert_eq "$(echo "$PAID" | jqv "['data']['status']")" "已支付" "支付回调后订单状态"
ENT=$(curl -s "$BASE/membership/entitlements/$MEMBER_NO?projectId=flm-membership" -H "$AUTH")
assert_eq "$(echo "$ENT" | jqv "['data']['hasPaidEntitlement']")" "True" "付费权益生效（门控放行）"

say "5. 推荐引擎"
REC=$(curl -s "$BASE/assignment/recommend" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"memberNo\":\"$MEMBER_NO\",\"projectId\":\"flm-membership\"}")
ASSIGNMENT_ID=$(echo "$REC" | jqv "['data']['assignmentId']")
BEST_GROUP=$(echo "$REC" | jqv "['data']['recommendation']['best']['groupId']")
BEST_SCORE=$(echo "$REC" | jqv "['data']['recommendation']['best']['score']")
[ -n "$BEST_GROUP" ] && ok "Top1=$BEST_GROUP score=$BEST_SCORE（含命中规则/风险提示/备选）" || bad "推荐失败: $REC"

say "6. 确认分配（好友分支 + 预占）"
CONFIRM=$(curl -s "$BASE/assignment/confirm" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"assignmentId\":$ASSIGNMENT_ID}")
STATUS=$(echo "$CONFIRM" | jqv "['data']['status']")
TASK_ID=$(echo "$CONFIRM" | jqv "['data']['taskId']")
GROUP_ID=$(echo "$CONFIRM" | jqv "['data']['groupId']")
assert_eq "$STATUS" "待加好友" "确认后状态（非好友先加好友）"
RESV=$(PGPASSWORD=scp_dev_pw psql -h 127.0.0.1 -U scp -d scp_dev -tAc \
  "SELECT count(*) FROM capacity_reservation WHERE assignment_id=$ASSIGNMENT_ID AND status='生效'")
assert_eq "$RESV" "2" "生效预占（群容量+好友额度）"

say "7. 加好友任务回填成功（幂等键）"
KEY="smoke-$SUFFIX"
curl -s "$BASE/tasks/$TASK_ID/attempts" -H "$AUTH" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" -d '{"result":"成功"}' > /dev/null
REPEAT=$(curl -s "$BASE/tasks/$TASK_ID/attempts" -H "$AUTH" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" -d '{"result":"成功"}' | jqv "['data']['idempotent']")
assert_eq "$REPEAT" "True" "重复回填被幂等拦截"
A1=$(curl -s "$BASE/assignment/$ASSIGNMENT_ID" -H "$AUTH")
assert_eq "$(echo "$A1" | jqv "['data']['status']")" "待邀请" "加好友成功后状态"
INVITE_TASK=$(echo "$A1" | jqv "['data']['invite_task_id']")
[ -n "$INVITE_TASK" ] && ok "自动派生邀请任务 #$INVITE_TASK" || bad "未生成邀请任务"

say "8. 邀请回填成功 → 已邀请"
curl -s "$BASE/tasks/$INVITE_TASK/attempts" -H "$AUTH" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: smoke-inv-$SUFFIX" -d '{"result":"成功"}' > /dev/null
assert_eq "$(curl -s "$BASE/assignment/$ASSIGNMENT_ID" -H "$AUTH" | jqv "['data']['status']")" "已邀请" "邀请后状态"

say "9. webhook 入群事件 → 已入群 + 回写"
BEFORE=$(PGPASSWORD=scp_dev_pw psql -h 127.0.0.1 -U scp -d scp_dev -tAc \
  "SELECT member_count FROM community_group WHERE id='$GROUP_ID'")
curl -s "$BASE/webhook/wecom/group-event" -H 'Content-Type: application/json' \
  -d "{\"eventType\":\"join\",\"groupId\":\"$GROUP_ID\",\"memberNo\":\"$MEMBER_NO\"}" > /dev/null
AFTER=$(PGPASSWORD=scp_dev_pw psql -h 127.0.0.1 -U scp -d scp_dev -tAc \
  "SELECT member_count FROM community_group WHERE id='$GROUP_ID'")
assert_eq "$(curl -s "$BASE/assignment/$ASSIGNMENT_ID" -H "$AUTH" | jqv "['data']['status']")" "已入群" "最终状态"
assert_eq "$AFTER" "$((BEFORE+1))" "群人数 +1"
CONSUMED=$(PGPASSWORD=scp_dev_pw psql -h 127.0.0.1 -U scp -d scp_dev -tAc \
  "SELECT count(*) FROM capacity_reservation WHERE assignment_id=$ASSIGNMENT_ID AND status='已消耗'")
assert_eq "$CONSUMED" "2" "预占已消耗"

say "10. 档案时间线含全过程（同步/关系绑定/入群）"
TL=$(curl -s "$BASE/members/$MEMBER_NO/timeline" -H "$AUTH")
for kw in 入群 推荐人 待分配; do
  echo "$TL" | grep -q "$kw" && ok "时间线含「$kw」" || bad "时间线缺「$kw」"
done

say "11. 影响力：赵一川矩阵含新增一级 PRO会员"
MATRIX=$(curl -s "$BASE/referral/U-100086/influence-matrix" -H "$AUTH")
echo "$MATRIX" | grep -q "PRO会员" && ok "矩阵含 PRO会员 维度" || bad "矩阵缺维度: $MATRIX"

say "12. 提现闭环：新会员发起提现 → 审批中心 → 打款"
curl -s "$BASE/mock/push-earnings" -H 'Content-Type: application/json' \
  -d "{\"memberNo\":\"$MEMBER_NO\",\"totalEst\":1000,\"withdrawable\":1000}" > /dev/null
WD=$(curl -s "$BASE/withdrawals" -H "$AUTH" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: smoke-wd-$SUFFIX" \
  -d "{\"memberNo\":\"$MEMBER_NO\",\"amount\":500,\"method\":\"支付宝\",\"accountInfo\":\"smoke@test.com\"}")
APPROVAL_ID=$(echo "$WD" | jqv "['data']['approvalId']")
[ -n "$APPROVAL_ID" ] && ok "提现进入审批中心 #$APPROVAL_ID" || bad "提现失败: $WD"
curl -s "$BASE/approvals/$APPROVAL_ID/decision" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"approve":true,"comment":"冒烟通过"}' > /dev/null
WD_STATUS=$(PGPASSWORD=scp_dev_pw psql -h 127.0.0.1 -U scp -d scp_dev -tAc \
  "SELECT status FROM withdrawal_request ORDER BY id DESC LIMIT 1")
assert_eq "$WD_STATUS" "已打款" "审批同意后提现状态"

say "13. 超载阻断（SPEC §16-4）：向仅剩 0 余量的小群塞人"
PGPASSWORD=scp_dev_pw psql -h 127.0.0.1 -U scp -d scp_dev -q <<SQL
INSERT INTO community_group (id,name,group_type,city,region,builder_account_id,project_id,target_capacity,member_count,status)
VALUES ('SMK-$SUFFIX','冒烟满群','PRO会员群','北京','华北区','WX-E-001','flm-membership',1,1,'服务中')
ON CONFLICT (id) DO NOTHING;
INSERT INTO group_staffing (group_id,role,employee_id,account_id,is_primary) VALUES
 ('SMK-$SUFFIX','企微客服',1,'WX-E-001',TRUE),('SMK-$SUFFIX','个微客服',1,'WX-P-001',TRUE);
SQL
RESP2=$(curl -s "$BASE/mock/push-pending-member" -H 'Content-Type: application/json' -d "{
  \"name\":\"烟测阻断$SUFFIX\",\"phone\":\"138$SUFFIX\",\"city\":\"北京\",
  \"projectId\":\"flm-membership\",\"identity\":\"PRO会员\"}")
M2=$(echo "$RESP2" | jqv "['data']['memberNo']")
# M2 也先完成付费（否则 confirm 在容量校验前先被付费门控拦截，测不到超载阻断）
O2=$(curl -s "$BASE/membership/orders" -H "$AUTH" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: smoke-order2-$SUFFIX" \
  -d "{\"memberNo\":\"$M2\",\"planCode\":\"MPLAN-PRO-M\",\"channel\":\"android\",\"projectId\":\"flm-membership\"}")
O2_NO=$(echo "$O2" | jqv "['data']['order_no']")
curl -s -X POST "$BASE/membership/orders/$O2_NO/mock-pay" -H "$AUTH" > /dev/null
REC2=$(curl -s "$BASE/assignment/recommend" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"memberNo\":\"$M2\",\"projectId\":\"flm-membership\"}")
AID2=$(echo "$REC2" | jqv "['data']['assignmentId']")
BLOCK=$(curl -s "$BASE/assignment/confirm" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"assignmentId\":$AID2,\"groupId\":\"SMK-$SUFFIX\",\"overrideReason\":\"\"}")
echo "$BLOCK" | grep -qE '容量不足|已阻断|必须填写' && ok "满群分配被阻断：$(echo "$BLOCK" | jqv "['message']")" || bad "未阻断: $BLOCK"

say "14. 对账报告可用"
curl -s "$BASE/sync/reconcile" -H "$AUTH" | grep -q group_member_count && ok "聚合 vs 明细对账正常返回" || bad "对账失败"

printf '\n\033[1m结果：%d 通过 / %d 失败\033[0m\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
