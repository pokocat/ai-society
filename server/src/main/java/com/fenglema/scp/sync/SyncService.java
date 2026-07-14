package com.fenglema.scp.sync;

import com.fenglema.scp.common.Rows;
import com.fenglema.scp.identity.MemberService;
import com.fenglema.scp.identity.ReferralService;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;

/**
 * 同步与集成层（SPEC §13.2）：外部系统数据经此进中台。
 * 每次进线记 sync_job（游标/计数），失败记 sync_error（幂等键/重试）；对账走 /sync/reconcile。
 */
@Service
public class SyncService {

    private final JdbcClient db;
    private final MemberService memberService;
    private final ReferralService referralService;
    /** 作业/错误记录独立提交（REQUIRES_NEW）：主事务回滚也要留痕。自调用下注解代理不生效，故用模板。 */
    private final TransactionTemplate independentTx;

    public SyncService(JdbcClient db, MemberService memberService, ReferralService referralService,
                       PlatformTransactionManager txManager) {
        this.db = db;
        this.memberService = memberService;
        this.referralService = referralService;
        this.independentTx = new TransactionTemplate(txManager);
        this.independentTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public record IncomingMember(String name, String phone, String city, String sourceChannel,
                                 String projectId, String identity, String referrerNo, String inviteCode,
                                 String unionid, String wechatId) {
    }

    /** 待分配会员进线（SPEC §6.4）：统一会员匹配（去重）→ 项目身份（待分配）→ 可选推荐关系绑定。 */
    @Transactional
    public Map<String, Object> ingestPendingMember(String sourceSystem, String jobType, IncomingMember in) {
        long jobId = startJob(jobType, sourceSystem, "统一会员档案");
        try {
            // 统一会员匹配：按标识优先级查重（SPEC §6.4「先完成统一会员匹配」）
            Long existing = null;
            if (in.unionid() != null) {
                existing = findByIdentifier("unionid", in.unionid());
            }
            if (existing == null && in.phone() != null) {
                existing = findByIdentifier("手机号", in.phone());
            }
            if (existing == null && in.wechatId() != null) {
                existing = findByIdentifier("个微号", in.wechatId());
            }
            long memberId;
            String memberNo;
            boolean created = existing == null;
            if (created) {
                memberNo = nextMemberNo();
                memberId = db.sql("""
                                INSERT INTO member (member_no, name, phone, city, source_channel)
                                VALUES (:no, :name, :phone, :city, :source) RETURNING id
                                """)
                        .param("no", memberNo).param("name", in.name()).param("phone", in.phone())
                        .param("city", in.city()).param("source", in.sourceChannel())
                        .query(Long.class).single();
                registerIdentifier(memberId, "手机号", in.phone(), sourceSystem);
                registerIdentifier(memberId, "unionid", in.unionid(), sourceSystem);
                registerIdentifier(memberId, "个微号", in.wechatId(), sourceSystem);
            } else {
                memberId = existing;
                memberNo = db.sql("SELECT member_no FROM member WHERE id = :id").param("id", memberId)
                        .query(String.class).single();
            }
            // 项目身份：待分配（不存在则建，存在则不动）
            db.sql("""
                    INSERT INTO member_project_identity (member_id, project_id, identity, status, source)
                    VALUES (:mid, :pid, COALESCE(:identity, '游客'), '待分配', :source)
                    ON CONFLICT (member_id, project_id) DO NOTHING
                    """)
                    .param("mid", memberId).param("pid", in.projectId())
                    .param("identity", in.identity()).param("source", in.sourceChannel())
                    .update();
            // 推荐关系（可选；已绑定则跳过，不视为失败）
            String referralNote = null;
            if (in.referrerNo() != null) {
                boolean bound = !db.sql("SELECT 1 FROM referral_relation WHERE member_id = :id")
                        .param("id", memberId).query(Rows.MAP).list().isEmpty();
                if (!bound) {
                    referralService.bind(memberNo, in.referrerNo(),
                            in.sourceChannel() == null ? "推广码" : in.sourceChannel(), in.inviteCode());
                    referralNote = "已绑定推荐人 " + in.referrerNo();
                } else {
                    referralNote = "已有推荐人，跳过绑定";
                }
            }
            memberService.appendTimeline(memberId, in.projectId(), "同步",
                    "外部系统进线（" + sourceSystem + "），进入待分配池", "同步");
            finishJob(jobId, 1, 1, 0);
            return Map.of("memberNo", memberNo, "memberId", memberId, "created", created,
                    "referral", referralNote == null ? "无" : referralNote, "syncJobId", jobId);
        } catch (RuntimeException e) {
            recordError(jobId, "{\"member\":\"" + in.name() + "\"}", e.getMessage());
            finishJob(jobId, 1, 0, 1);
            throw e;
        }
    }

    /** 订单事件进线：只读镜像 upsert（sync_version 递增）。 */
    @Transactional
    public Map<String, Object> ingestOrder(String sourceSystem, String externalOrderNo, String memberNo,
                                           String projectId, String productName, java.math.BigDecimal amount, String status) {
        long jobId = startJob("Webhook", sourceSystem, "订单");
        Long memberId = memberNo == null ? null : memberService.idOf(memberNo);
        db.sql("""
                INSERT INTO order_reference (external_order_no, source_system, member_id, project_id, product_name, amount, status, external_time)
                VALUES (:no, :src, :mid, :pid, :product, :amount, :status, now())
                ON CONFLICT (source_system, external_order_no)
                DO UPDATE SET status = EXCLUDED.status, amount = EXCLUDED.amount,
                              synced_at = now(), sync_version = order_reference.sync_version + 1
                """)
                .param("no", externalOrderNo).param("src", sourceSystem).param("mid", memberId)
                .param("pid", projectId).param("product", productName).param("amount", amount).param("status", status)
                .update();
        if (memberId != null) {
            memberService.appendTimeline(memberId, projectId, "订单",
                    productName + " ¥" + amount + "（" + status + "）", "同步");
        }
        finishJob(jobId, 1, 1, 0);
        return Map.of("externalOrderNo", externalOrderNo, "syncJobId", jobId);
    }

    /** 收益快照进线：外部财务口径整体覆盖（SPEC §13.1 保留来源与版本）。 */
    @Transactional
    public Map<String, Object> ingestEarnings(String sourceSystem, String memberNo, String projectId,
                                              java.math.BigDecimal totalEst, java.math.BigDecimal withdrawable,
                                              java.math.BigDecimal pending, java.math.BigDecimal frozen) {
        long jobId = startJob("定时同步", sourceSystem, "收益");
        long memberId = memberService.idOf(memberNo);
        db.sql("""
                INSERT INTO earnings_snapshot (member_id, project_id, total_est, withdrawable, pending, frozen, source_system)
                VALUES (:mid, :pid, :total, :wd, :pending, :frozen, :src)
                ON CONFLICT (member_id, project_id)
                DO UPDATE SET total_est = EXCLUDED.total_est, withdrawable = EXCLUDED.withdrawable,
                              pending = EXCLUDED.pending, frozen = EXCLUDED.frozen, synced_at = now()
                """)
                .param("mid", memberId).param("pid", projectId)
                .param("total", totalEst).param("wd", withdrawable)
                .param("pending", pending).param("frozen", frozen).param("src", sourceSystem)
                .update();
        finishJob(jobId, 1, 1, 0);
        return Map.of("memberNo", memberNo, "syncJobId", jobId);
    }

    /** 对账（SPEC §16-3/§16-9）：聚合值 vs 明细逐项 diff。 */
    public List<Map<String, Object>> reconcile() {
        return db.sql("""
                SELECT 'group_member_count' AS check_item, g.id AS object_id,
                       g.member_count AS counter_value,
                       (SELECT count(*) FROM member_group_assignment a
                         WHERE a.group_id = g.id AND a.status = '已入群') AS detail_value,
                       '群人数计数器 vs 已入群明细（差值=外部存量成员）' AS note
                FROM community_group g
                UNION ALL
                SELECT 'wechat_serving_groups', a.id,
                       a.serving_group_count,
                       (SELECT count(*) FROM group_staffing gs WHERE gs.account_id = a.id AND gs.role = '个微客服'),
                       '个微服务群数 vs 编组明细（应相等）'
                FROM account a WHERE a.account_type = '个人微信'
                ORDER BY 1, 2
                """).query(Rows.MAP).list();
    }

    public List<Map<String, Object>> jobs() {
        return db.sql("SELECT * FROM sync_job ORDER BY started_at DESC LIMIT 100").query(Rows.MAP).list();
    }

    public List<Map<String, Object>> errors() {
        return db.sql("SELECT * FROM sync_error WHERE status = '待重试' ORDER BY created_at DESC LIMIT 100")
                .query(Rows.MAP).list();
    }

    private Long findByIdentifier(String type, String value) {
        if (value == null) {
            return null;
        }
        return db.sql("""
                        SELECT COALESCE(m.merged_into, m.id) FROM member_identifier mi
                        JOIN member m ON m.id = mi.member_id
                        WHERE mi.id_type = :t AND mi.id_value = :v
                        """)
                .param("t", type).param("v", value)
                .query(Long.class).optional().orElse(null);
    }

    private void registerIdentifier(long memberId, String type, String value, String source) {
        if (value == null) {
            return;
        }
        db.sql("""
                INSERT INTO member_identifier (member_id, id_type, id_value, source_system)
                VALUES (:m, :t, :v, :s) ON CONFLICT (id_type, id_value) DO NOTHING
                """)
                .param("m", memberId).param("t", type).param("v", value).param("s", source)
                .update();
    }

    private String nextMemberNo() {
        Long next = db.sql("SELECT COALESCE(MAX(CAST(SUBSTRING(member_no FROM 3) AS bigint)), 100000) + 1 FROM member WHERE member_no ~ '^U-[0-9]+$'")
                .query(Long.class).single();
        return "U-" + next;
    }

    private long startJob(String jobType, String sourceSystem, String resource) {
        return independentTx.execute(tx -> db.sql("""
                        INSERT INTO sync_job (job_type, source_system, resource) VALUES (:t, :s, :r) RETURNING id
                        """)
                .param("t", jobType).param("s", sourceSystem).param("r", resource)
                .query(Long.class).single());
    }

    private void finishJob(long jobId, int total, int success, int errors) {
        independentTx.executeWithoutResult(tx -> db.sql("""
                UPDATE sync_job SET status = CASE WHEN :e = 0 THEN '已完成' WHEN :ok > 0 THEN '部分失败' ELSE '失败' END,
                       total_count = :t, success_count = :ok, error_count = :e, finished_at = now()
                WHERE id = :id
                """)
                .param("t", total).param("ok", success).param("e", errors).param("id", jobId)
                .update());
    }

    private void recordError(long jobId, String payload, String message) {
        independentTx.executeWithoutResult(tx -> db.sql("""
                INSERT INTO sync_error (job_id, payload, error_msg) VALUES (:j, CAST(:p AS jsonb), :m)
                """)
                .param("j", jobId).param("p", payload).param("m", message)
                .update());
    }
}
