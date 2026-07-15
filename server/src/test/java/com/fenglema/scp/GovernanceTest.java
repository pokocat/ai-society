package com.fenglema.scp;

import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.governance.ApprovalService;
import com.fenglema.scp.ops.EarningsController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 治理域：提现校验→审批回调执行器；审计日志 append-only（SPEC §11.2/§11.3/§16-8）。 */
class GovernanceTest extends TestSupport {

    @Autowired
    EarningsController earningsController;

    @Autowired
    ApprovalService approvalService;

    /** 直调控制器绕过了拦截器,需手动置登录态(创始人 ALL 范围,通过 IDOR 兜底)。 */
    @org.junit.jupiter.api.BeforeEach
    void login() {
        com.fenglema.scp.common.UserContext.set(
                new com.fenglema.scp.common.CurrentUser(1L, "boss", "王总·创始人", "founder", "ALL", null));
    }

    @org.junit.jupiter.api.AfterEach
    void logout() {
        com.fenglema.scp.common.UserContext.clear();
    }

    private String memberWithBalance(String balance) {
        String memberNo = ingestMember("提现" + uid(), "北京", "flm-membership", "运营商", null);
        syncService.ingestEarnings("mock-project-system", memberNo, null,
                new BigDecimal(balance), new BigDecimal(balance), BigDecimal.ZERO, BigDecimal.ZERO);
        return memberNo;
    }

    @Test
    void withdrawalValidations() {
        String memberNo = memberWithBalance("1000");
        assertThrows(BusinessException.class, () -> earningsController.withdraw(
                new EarningsController.WithdrawalReq(memberNo, new BigDecimal("50"), "支付宝", "a@b.com"), null),
                "低于 100 必须拒绝");
        assertThrows(BusinessException.class, () -> earningsController.withdraw(
                new EarningsController.WithdrawalReq(memberNo, new BigDecimal("100.5"), "支付宝", "a@b.com"), null),
                "非整数必须拒绝");
        assertThrows(BusinessException.class, () -> earningsController.withdraw(
                new EarningsController.WithdrawalReq(memberNo, new BigDecimal("2000"), "支付宝", "a@b.com"), null),
                "超余额必须拒绝");
    }

    @Test
    void approveWithdrawalExecutesCallbackAndReducesMirror() {
        String memberNo = memberWithBalance("1000");
        var resp = earningsController.withdraw(
                new EarningsController.WithdrawalReq(memberNo, new BigDecimal("500"), "支付宝", "zhao@x.com"),
                "wd-" + uid());
        long approvalId = ((Number) resp.data().get("approvalId")).longValue();
        long withdrawalId = ((Number) resp.data().get("withdrawalId")).longValue();

        approvalService.decide(approvalId, true, "同意打款");

        Map<String, Object> withdrawal = db.sql("SELECT * FROM withdrawal_request WHERE id = :id")
                .param("id", withdrawalId).query(Rows.MAP).single();
        assertEquals("已打款", withdrawal.get("status"));
        assertTrue(withdrawal.get("external_payout_ref").toString().startsWith("MOCK-PAYOUT-"));
        BigDecimal remaining = db.sql("""
                        SELECT withdrawable FROM earnings_snapshot WHERE member_id = :m AND project_id IS NULL
                        """)
                .param("m", memberIdOf(memberNo)).query(BigDecimal.class).single();
        assertEquals(0, remaining.compareTo(new BigDecimal("500")), "镜像余额应减少 500");
    }

    @Test
    void rejectWithdrawalKeepsBalance() {
        String memberNo = memberWithBalance("800");
        var resp = earningsController.withdraw(
                new EarningsController.WithdrawalReq(memberNo, new BigDecimal("300"), "银行卡", "6222***"),
                "wd-" + uid());
        long approvalId = ((Number) resp.data().get("approvalId")).longValue();
        approvalService.decide(approvalId, false, "信息不全");
        String status = db.sql("SELECT status FROM withdrawal_request WHERE approval_id = :id")
                .param("id", approvalId).query(String.class).single();
        assertEquals("已拒绝", status);
        BigDecimal remaining = db.sql("SELECT withdrawable FROM earnings_snapshot WHERE member_id = :m AND project_id IS NULL")
                .param("m", memberIdOf(memberNo)).query(BigDecimal.class).single();
        assertEquals(0, remaining.compareTo(new BigDecimal("800")), "拒绝后余额不动");
    }

    @Test
    void withdrawalIdempotency() {
        String memberNo = memberWithBalance("1000");
        String key = "wd-idem-" + uid();
        earningsController.withdraw(new EarningsController.WithdrawalReq(memberNo, new BigDecimal("200"), "支付宝", "a@b.com"), key);
        var repeat = earningsController.withdraw(new EarningsController.WithdrawalReq(memberNo, new BigDecimal("200"), "支付宝", "a@b.com"), key);
        assertTrue(Boolean.TRUE.equals(repeat.data().get("idempotent")), "同幂等键重复提交必须单次生效");
        int count = db.sql("SELECT count(*) FROM withdrawal_request WHERE member_id = :m")
                .param("m", memberIdOf(memberNo)).query(Integer.class).single();
        assertEquals(1, count);
    }

    @Test
    void inFlightWithdrawalsCannotExceedBalance() {
        // H3 回归：多张待审提现叠加不得超过可提余额（原来各自 ≤ 余额即放行，可超额批准致镜像为负）
        String memberNo = memberWithBalance("800");
        earningsController.withdraw(
                new EarningsController.WithdrawalReq(memberNo, new BigDecimal("500"), "支付宝", "a@b.com"), "wd-" + uid());
        assertThrows(BusinessException.class, () -> earningsController.withdraw(
                new EarningsController.WithdrawalReq(memberNo, new BigDecimal("500"), "支付宝", "a@b.com"), "wd-" + uid()),
                "在途 500 + 本单 500 > 余额 800，第二单必须被拒");
        int count = db.sql("SELECT count(*) FROM withdrawal_request WHERE member_id = :m")
                .param("m", memberIdOf(memberNo)).query(Integer.class).single();
        assertEquals(1, count, "超额的第二单不得入库");
    }

    @Test
    void selfScopeUserCannotAccessOtherMembers() {
        // IDOR 回归：dataScope=SELF 的会员/运营商只能访问自己的 memberNo
        try {
            com.fenglema.scp.common.UserContext.set(
                    new com.fenglema.scp.common.CurrentUser(2L, "liyuntian", "李云天", "member", "SELF", "U-100024"));
            assertThrows(BusinessException.class,
                    () -> com.fenglema.scp.common.UserContext.assertMemberAccess("U-100086"),
                    "SELF 用户访问他人 memberNo 必须被拒");
            com.fenglema.scp.common.UserContext.assertMemberAccess("U-100024"); // 自己 → 放行
            // ALL 范围（创始人）→ 任意放行
            com.fenglema.scp.common.UserContext.set(
                    new com.fenglema.scp.common.CurrentUser(1L, "boss", "王总", "founder", "ALL", null));
            com.fenglema.scp.common.UserContext.assertMemberAccess("U-100086");
        } finally {
            com.fenglema.scp.common.UserContext.clear();
        }
    }

    @Test
    void auditLogIsAppendOnly() {
        db.sql("""
                INSERT INTO audit_log (object_type, object_id, action, operator) VALUES ('test', :id, '测试', '测试')
                """).param("id", uid()).update();
        Long id = db.sql("SELECT max(id) FROM audit_log").query(Long.class).single();
        assertThrows(DataAccessException.class,
                () -> db.sql("UPDATE audit_log SET action = '篡改' WHERE id = :id").param("id", id).update(),
                "审计日志 UPDATE 必须被数据库触发器拒绝");
        assertThrows(DataAccessException.class,
                () -> db.sql("DELETE FROM audit_log WHERE id = :id").param("id", id).update(),
                "审计日志 DELETE 必须被数据库触发器拒绝");
    }
}
