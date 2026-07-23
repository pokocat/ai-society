package com.fenglema.scp;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.CurrentUser;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.common.UserContext;
import com.fenglema.scp.governance.ApprovalService;
import com.fenglema.scp.identity.MemberService;
import com.fenglema.scp.mp.MpController;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 会员小程序「我的」自助域：收益镜像、提现（复用 WithdrawalService）、任务打卡（复用
 * MemberTaskService，重点验证归属校验兜底 403）、档案卡、我的群客服信息。
 * 直调 MpController 绕过拦截器，手动置 SELF 范围登录态模拟小程序端真实调用路径（同 GovernanceTest 惯例）。
 */
class MpSelfServiceTest extends TestSupport {

    static final String PROJECT = "flm-membership";

    @Autowired
    MpController mpController;
    @Autowired
    ApprovalService approvalService;
    @Autowired
    MemberService memberService;

    @AfterEach
    void logout() {
        UserContext.clear();
    }

    private String memberWithBalance(String label, String balance) {
        String memberNo = ingestMember(label + uid(), "北京", PROJECT, "运营商", null);
        syncService.ingestEarnings("mock-project-system", memberNo, null,
                new BigDecimal(balance), new BigDecimal(balance), BigDecimal.ZERO, BigDecimal.ZERO);
        return memberNo;
    }

    private void loginAs(String memberNo) {
        long id = memberIdOf(memberNo);
        UserContext.set(new CurrentUser(id, "mp:" + memberNo, "会员" + memberNo, "member", "SELF", memberNo));
    }

    // ---------- a. /mp/earnings ----------

    @Test
    void earningsReturnsSummaryPaidOutAndWithdrawals() {
        String memberNo = memberWithBalance("收益", "1000");
        loginAs(memberNo);

        var withdrawResp = mpController.withdraw(
                new MpController.MpWithdrawal(new BigDecimal("300"), "支付宝", "a@b.com"), "mp-earn-" + uid());
        long approvalId = ((Number) withdrawResp.data().get("approvalId")).longValue();
        approvalService.decide(approvalId, true, "同意打款");

        ApiResponse<Map<String, Object>> resp = mpController.earnings();
        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) resp.data().get("summary");
        assertEquals(0, new BigDecimal(summary.get("withdrawable").toString()).compareTo(new BigDecimal("700")),
                "提现300已批准打款，可提余额应剩700");
        assertEquals(0, new BigDecimal(resp.data().get("paidOut").toString()).compareTo(new BigDecimal("300")));
        @SuppressWarnings("unchecked")
        var withdrawals = (java.util.List<Map<String, Object>>) resp.data().get("withdrawals");
        assertTrue(withdrawals.stream().anyMatch(w -> "已打款".equals(w.get("status"))
                && new BigDecimal(w.get("amount").toString()).compareTo(new BigDecimal("300")) == 0));
    }

    // ---------- b. /mp/withdrawals ----------

    @Test
    void withdrawRejectsBelowMinimumAndOverBalance() {
        String memberNo = memberWithBalance("提现拒", "500");
        loginAs(memberNo);
        assertThrows(BusinessException.class, () -> mpController.withdraw(
                new MpController.MpWithdrawal(new BigDecimal("50"), "支付宝", null), null),
                "低于100必须拒绝");
        assertThrows(BusinessException.class, () -> mpController.withdraw(
                new MpController.MpWithdrawal(new BigDecimal("999"), "支付宝", null), null),
                "超可提余额必须拒绝");
        int count = db.sql("SELECT count(*) FROM withdrawal_request WHERE member_id = :m")
                .param("m", memberIdOf(memberNo)).query(Integer.class).single();
        assertEquals(0, count, "被拒绝的申请不得入库");
    }

    @Test
    void withdrawCreatesRequestAndApprovalForLegalAmount() {
        String memberNo = memberWithBalance("提现建单", "1000");
        loginAs(memberNo);
        var resp = mpController.withdraw(
                new MpController.MpWithdrawal(new BigDecimal("200"), "微信", "wxpay-a"), "mp-wd-" + uid());
        assertEquals("待审核", resp.data().get("status"));
        long withdrawalId = ((Number) resp.data().get("withdrawalId")).longValue();
        long approvalId = ((Number) resp.data().get("approvalId")).longValue();
        Map<String, Object> row = db.sql("SELECT * FROM withdrawal_request WHERE id = :id")
                .param("id", withdrawalId).query(Rows.MAP).single();
        assertEquals(memberIdOf(memberNo), ((Number) row.get("member_id")).longValue());
        Map<String, Object> approval = db.sql("SELECT approval_type FROM approval WHERE id = :id")
                .param("id", approvalId).query(Rows.MAP).single();
        assertEquals("提现审批", approval.get("approval_type"));
    }

    @Test
    void withdrawIdempotencyKeyPreventsDuplicateSubmission() {
        String memberNo = memberWithBalance("提现幂等", "1000");
        loginAs(memberNo);
        String key = "mp-wd-idem-" + uid();
        mpController.withdraw(new MpController.MpWithdrawal(new BigDecimal("300"), "支付宝", "a@b.com"), key);
        var repeat = mpController.withdraw(new MpController.MpWithdrawal(new BigDecimal("300"), "支付宝", "a@b.com"), key);
        assertTrue(Boolean.TRUE.equals(repeat.data().get("idempotent")), "同幂等键重复提交只受理一次");
        int count = db.sql("SELECT count(*) FROM withdrawal_request WHERE member_id = :m")
                .param("m", memberIdOf(memberNo)).query(Integer.class).single();
        assertEquals(1, count);
    }

    // ---------- c. /mp/tasks + complete（含 403 横向越权） ----------

    private long insertTask(String memberNo, String title, int points) {
        return db.sql("""
                        INSERT INTO member_task (member_id, title, task_type, points)
                        VALUES (:m, :title, '每日签到', :points) RETURNING id
                        """)
                .param("m", memberIdOf(memberNo)).param("title", title).param("points", points)
                .query(Long.class).single();
    }

    @Test
    void memberListsAndCompletesOwnTaskEarningPoints() {
        String memberNo = ingestMember("任务甲" + uid(), "北京", PROJECT, "运营商", null);
        long taskId = insertTask(memberNo, "打卡任务" + uid(), 15);
        loginAs(memberNo);

        var list = mpController.tasks();
        assertTrue(list.data().stream().anyMatch(t -> ((Number) t.get("id")).longValue() == taskId));

        var completed = mpController.completeTask(taskId);
        assertEquals(15, ((Number) completed.data().get("pointsAwarded")).intValue());

        Long balance = db.sql("SELECT COALESCE(SUM(delta),0) FROM points_ledger WHERE member_id = :m")
                .param("m", memberIdOf(memberNo)).query(Long.class).single();
        assertTrue(balance >= 15, "积分应入账");
    }

    @Test
    void completingOthersTaskIsForbidden() {
        String owner = ingestMember("任务归属主" + uid(), "北京", PROJECT, "运营商", null);
        String intruder = ingestMember("越权者" + uid(), "北京", PROJECT, "运营商", null);
        long taskId = insertTask(owner, "他人任务" + uid(), 20);

        loginAs(intruder);
        BusinessException ex = assertThrows(BusinessException.class, () -> mpController.completeTask(taskId),
                "完成他人任务必须被拒（横向越权拦截）");
        assertEquals(4030, ex.getCode(), "应为越权错误码 4030");

        // 越权尝试不得产生副作用：任务仍未完成、积分未入账
        Map<String, Object> task = db.sql("SELECT done FROM member_task WHERE id = :id")
                .param("id", taskId).query(Rows.MAP).single();
        assertEquals(Boolean.FALSE, task.get("done"), "越权尝试不应改变任务状态");
        Long balance = db.sql("SELECT COALESCE(SUM(delta),0) FROM points_ledger WHERE member_id = :m")
                .param("m", memberIdOf(owner)).query(Long.class).single();
        assertEquals(0L, balance, "越权尝试不应给任何人发积分");
    }

    @Test
    void completingTaskTwiceIsConflict() {
        String memberNo = ingestMember("重复完成" + uid(), "北京", PROJECT, "运营商", null);
        long taskId = insertTask(memberNo, "重复任务" + uid(), 10);
        loginAs(memberNo);
        mpController.completeTask(taskId);
        BusinessException ex = assertThrows(BusinessException.class, () -> mpController.completeTask(taskId));
        assertEquals(4090, ex.getCode(), "重复完成应报冲突 4090");
    }

    // ---------- d. /mp/profile ----------

    @Test
    void profileReturnsOwnCardWithReferrer() {
        String inviterNo = ingestMember("档案推荐人" + uid(), "上海", PROJECT, "运营商", null);
        String memberNo = ingestMember("档案本人" + uid(), "上海", PROJECT, "运营商", inviterNo);
        memberService.addIdentifier(memberNo, "个微号", "wx_profile_" + uid(), "test");
        loginAs(memberNo);

        var resp = mpController.profile();
        assertEquals(memberNo, resp.data().get("member_no"));
        assertNotNull(resp.data().get("wechatId"));
        @SuppressWarnings("unchecked")
        Map<String, Object> referrer = (Map<String, Object>) resp.data().get("referrer");
        assertNotNull(referrer, "应带出推荐人");
        assertEquals(inviterNo, referrer.get("member_no"));
    }

    // ---------- e. myGroup serviceTeacher ----------

    @Test
    void myGroupReturnsServiceTeacherFromGroupStaffing() {
        String groupId = createServiceableGroup("北京", "PRO会员群", 100, 10);
        String memberNo = ingestMember("客服归属" + uid(), "北京", PROJECT, "运营商", null);
        db.sql("""
                        INSERT INTO member_group_assignment (member_id, project_id, group_id, status, joined_at)
                        VALUES (:m, :p, :g, '已入群', now())
                        """)
                .param("m", memberIdOf(memberNo)).param("p", PROJECT).param("g", groupId).update();
        String expectedName = db.sql("""
                        SELECT e.name FROM group_staffing gs JOIN employee e ON e.id = gs.employee_id
                        WHERE gs.group_id = :g AND gs.role = '个微客服' AND gs.is_primary
                        """)
                .param("g", groupId).query(String.class).single();
        loginAs(memberNo);

        var resp = mpController.myGroup(PROJECT);
        @SuppressWarnings("unchecked")
        Map<String, Object> teacher = (Map<String, Object>) resp.data().get("serviceTeacher");
        assertNotNull(teacher, "已入群且有主责客服编组应返回服务老师");
        assertEquals(expectedName, teacher.get("name"));
        assertEquals("个微客服", teacher.get("role"));
    }
}
