package com.fenglema.scp.ops;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.IdempotencyGuard;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.common.UserContext;
import com.fenglema.scp.identity.MemberService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 交易与收益只读镜像 + 提现审批协同（SPEC §2.2：订单佣金财务归外部系统，中台只镜像与协同）。
 */
@RestController
@RequestMapping("/api/v1")
public class EarningsController {

    private final JdbcClient db;
    private final MemberService memberService;
    private final IdempotencyGuard idempotency;
    private final WithdrawalService withdrawalService;

    public EarningsController(JdbcClient db, MemberService memberService, IdempotencyGuard idempotency,
                              WithdrawalService withdrawalService) {
        this.db = db;
        this.memberService = memberService;
        this.idempotency = idempotency;
        this.withdrawalService = withdrawalService;
    }

    @GetMapping("/order-references")
    @Perm(module = "orders")
    public ApiResponse<List<Map<String, Object>>> orders(@RequestParam(required = false) String status,
                                                         @RequestParam(required = false) String memberNo) {
        Long memberId = memberNo == null ? null : memberService.idOf(memberNo);
        return ApiResponse.ok(db.sql("""
                        SELECT o.*, m.member_no, m.name AS member_name
                        FROM order_reference o LEFT JOIN member m ON m.id = o.member_id
                        WHERE (CAST(:status AS text) IS NULL OR o.status = :status)
                          AND (CAST(:mid AS text) IS NULL OR o.member_id = :mid)
                        ORDER BY o.external_time DESC LIMIT 200
                        """)
                .param("status", status).param("mid", memberId)
                .query(Rows.MAP).list());
    }

    @GetMapping("/earnings/summary")
    @Perm(module = "users")
    public ApiResponse<Map<String, Object>> earnings(@RequestParam String memberNo,
                                                     @RequestParam(required = false) String projectId) {
        UserContext.assertMemberAccess(memberNo);
        long memberId = memberService.idOf(memberNo);
        Map<String, Object> snapshot = db.sql("""
                        SELECT * FROM earnings_snapshot
                        WHERE member_id = :mid AND ((CAST(:pid AS text) IS NULL AND project_id IS NULL) OR project_id = :pid)
                        """)
                .param("mid", memberId).param("pid", projectId)
                .query(Rows.MAP).optional()
                .orElse(Map.of("member_id", memberId, "total_est", 0, "withdrawable", 0, "pending", 0, "frozen", 0));
        return ApiResponse.ok(Map.of(
                "summary", snapshot,
                "withdrawals", db.sql("SELECT * FROM withdrawal_request WHERE member_id = :mid ORDER BY created_at DESC LIMIT 20")
                        .param("mid", memberId).query(Rows.MAP).list()));
    }

    public record WithdrawalReq(@NotBlank String memberNo, @NotNull BigDecimal amount,
                                @NotBlank String method, String accountInfo) {
    }

    /**
     * 提现申请：校验与落库统一在 WithdrawalService（与小程序端共用，SPEC §11.2 审批协同）。
     */
    @PostMapping("/withdrawals")
    @Perm(module = "users", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> withdraw(@RequestBody WithdrawalReq req,
                                                     @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        UserContext.assertMemberAccess(req.memberNo());
        if (!idempotency.tryRegister(key, "/withdrawals")) {
            return ApiResponse.ok(Map.of("result", "重复提交，已按首次受理", "idempotent", true));
        }
        long memberId = memberService.idOf(req.memberNo());
        return ApiResponse.ok(withdrawalService.apply(memberId, req.amount(), req.method(),
                req.accountInfo(), key, operatorName()));
    }

    private String operatorName() {
        var user = UserContext.getOrNull();
        return user != null ? user.displayName() : "系统";
    }
}
