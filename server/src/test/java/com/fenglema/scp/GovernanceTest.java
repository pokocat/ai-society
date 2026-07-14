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
