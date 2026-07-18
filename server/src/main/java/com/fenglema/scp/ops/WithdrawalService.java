package com.fenglema.scp.ops;

import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Json;
import com.fenglema.scp.identity.MemberService;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 提现审批协同（SPEC §2.2）：中台只受理申请并建审批单，打款归外部系统。
 * PC 运营端（EarningsController）与会员小程序端（MpController）共用同一套校验与落库，
 * 防止两处各写一份后规则漂移。
 */
@Service
public class WithdrawalService {

    private final JdbcClient db;
    private final MemberService memberService;

    public WithdrawalService(JdbcClient db, MemberService memberService) {
        this.db = db;
        this.memberService = memberService;
    }

    /**
     * 提现申请：整数金额、≥100、(在途待审+已批准)+本次 ≤ 可提余额；
     * 建 withdrawal_request + 「提现审批」approval + 会员时间线，同一事务。
     */
    @Transactional
    public Map<String, Object> apply(long memberId, BigDecimal amount, String method,
                                     String accountInfo, String idempotencyKey, String operatorName) {
        if (amount.scale() > 0 && amount.stripTrailingZeros().scale() > 0) {
            throw new BusinessException("仅支持整数金额提现");
        }
        if (amount.compareTo(BigDecimal.valueOf(100)) < 0) {
            throw new BusinessException("提现金额不得低于 100 元");
        }
        BigDecimal withdrawable = db.sql("""
                        SELECT COALESCE(withdrawable, 0) FROM earnings_snapshot
                        WHERE member_id = :mid AND project_id IS NULL
                        """)
                .param("mid", memberId)
                .query(BigDecimal.class).optional().orElse(BigDecimal.ZERO);
        // 在途累计校验：多张待审/已批未打款单叠加不得超可提余额（否则镜像可被扣负）
        BigDecimal inFlight = db.sql("""
                        SELECT COALESCE(SUM(amount), 0) FROM withdrawal_request
                        WHERE member_id = :mid AND status IN ('待审核','已批准')
                        """)
                .param("mid", memberId)
                .query(BigDecimal.class).optional().orElse(BigDecimal.ZERO);
        if (inFlight.add(amount).compareTo(withdrawable) > 0) {
            throw BusinessException.conflict("提现金额超过可提现余额 ¥" + withdrawable
                    + (inFlight.signum() > 0 ? "（已有在途提现 ¥" + inFlight + "）" : ""));
        }
        Long withdrawalId = db.sql("""
                        INSERT INTO withdrawal_request (member_id, amount, method, account_info, idempotency_key)
                        VALUES (:mid, :amount, :method, :account, :key)
                        RETURNING id
                        """)
                .param("mid", memberId).param("amount", amount)
                .param("method", method).param("account", accountInfo).param("key", idempotencyKey)
                .query(Long.class).single();
        String memberName = db.sql("SELECT name FROM member WHERE id = :id").param("id", memberId)
                .query(String.class).single();
        Long approvalId = db.sql("""
                        INSERT INTO approval (approval_type, title, submitter, detail, callback_type, callback_ref)
                        VALUES ('提现审批', :title, :submitter, CAST(:detail AS jsonb), 'WITHDRAWAL', :ref)
                        RETURNING id
                        """)
                .param("title", memberName + " 提现 ¥" + amount + " 至" + method)
                .param("submitter", memberName)
                .param("detail", Json.obj(
                        "提现金额", "¥" + amount,
                        "提现渠道", method,
                        "账户", accountInfo == null ? "" : accountInfo,
                        "可提余额", "¥" + withdrawable,
                        "申请人", memberName))
                .param("ref", String.valueOf(withdrawalId))
                .query(Long.class).single();
        db.sql("UPDATE withdrawal_request SET approval_id = :aid WHERE id = :id")
                .param("aid", approvalId).param("id", withdrawalId).update();
        memberService.appendTimeline(memberId, null, "提现",
                "发起提现 ¥" + amount + "（" + method + "），进入审批中心", operatorName);
        return Map.of("withdrawalId", withdrawalId, "approvalId", approvalId, "status", "待审核",
                "message", "提现申请已提交，进入 PC 审批中心");
    }
}
