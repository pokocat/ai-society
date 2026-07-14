package com.fenglema.scp.ops;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.IdempotencyGuard;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.common.UserContext;
import com.fenglema.scp.identity.MemberService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
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

    public EarningsController(JdbcClient db, MemberService memberService, IdempotencyGuard idempotency) {
        this.db = db;
        this.memberService = memberService;
        this.idempotency = idempotency;
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
     * 提现申请：≥100 整数、≤可提余额；创建后自动建「提现审批」单进审批中心（SPEC §11.2），
     * 打款由外部系统执行（审批回调 Mock 回执）。
     */
    @PostMapping("/withdrawals")
    @Perm(module = "users", action = Perm.Action.CREATE)
    @Transactional
    public ApiResponse<Map<String, Object>> withdraw(@RequestBody WithdrawalReq req,
                                                     @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        if (!idempotency.tryRegister(key, "/withdrawals")) {
            return ApiResponse.ok(Map.of("result", "重复提交，已按首次受理", "idempotent", true));
        }
        long memberId = memberService.idOf(req.memberNo());
        if (req.amount().scale() > 0 && req.amount().stripTrailingZeros().scale() > 0) {
            throw new BusinessException("仅支持整数金额提现");
        }
        if (req.amount().compareTo(BigDecimal.valueOf(100)) < 0) {
            throw new BusinessException("提现金额不得低于 100 元");
        }
        BigDecimal withdrawable = db.sql("""
                        SELECT COALESCE(withdrawable, 0) FROM earnings_snapshot
                        WHERE member_id = :mid AND project_id IS NULL
                        """)
                .param("mid", memberId)
                .query(BigDecimal.class).optional().orElse(BigDecimal.ZERO);
        if (req.amount().compareTo(withdrawable) > 0) {
            throw BusinessException.conflict("提现金额超过可提现余额 ¥" + withdrawable);
        }
        Long withdrawalId = db.sql("""
                        INSERT INTO withdrawal_request (member_id, amount, method, account_info, idempotency_key)
                        VALUES (:mid, :amount, :method, :account, :key)
                        RETURNING id
                        """)
                .param("mid", memberId).param("amount", req.amount())
                .param("method", req.method()).param("account", req.accountInfo()).param("key", key)
                .query(Long.class).single();
        String memberName = db.sql("SELECT name FROM member WHERE id = :id").param("id", memberId)
                .query(String.class).single();
        Long approvalId = db.sql("""
                        INSERT INTO approval (approval_type, title, submitter, detail, callback_type, callback_ref)
                        VALUES ('提现审批', :title, :submitter, CAST(:detail AS jsonb), 'WITHDRAWAL', :ref)
                        RETURNING id
                        """)
                .param("title", memberName + " 提现 ¥" + req.amount() + " 至" + req.method())
                .param("submitter", memberName)
                .param("detail", "{\"提现金额\":\"¥" + req.amount() + "\",\"提现渠道\":\"" + req.method()
                        + "\",\"账户\":\"" + (req.accountInfo() == null ? "" : req.accountInfo())
                        + "\",\"可提余额\":\"¥" + withdrawable + "\",\"申请人\":\"" + memberName + "\"}")
                .param("ref", String.valueOf(withdrawalId))
                .query(Long.class).single();
        db.sql("UPDATE withdrawal_request SET approval_id = :aid WHERE id = :id")
                .param("aid", approvalId).param("id", withdrawalId).update();
        memberService.appendTimeline(memberId, null, "提现",
                "发起提现 ¥" + req.amount() + "（" + req.method() + "），进入审批中心", operatorName());
        return ApiResponse.ok(Map.of("withdrawalId", withdrawalId, "approvalId", approvalId, "status", "待审核",
                "message", "提现申请已提交，进入 PC 审批中心"));
    }

    private String operatorName() {
        var user = UserContext.getOrNull();
        return user != null ? user.displayName() : "系统";
    }
}
