package com.fenglema.scp.membership;

import com.fenglema.scp.common.AuditService;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Json;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.identity.MemberService;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * 会员费订单（M3 §4.1，一方交易事实源——区别于 order_reference 只读镜像，边界变更见方案 §3）。
 * 状态机 TRANSITIONS 管控，禁直改；支付回调以 callback_id 幂等（重复回调返回首次结果）。
 * 支付成功事务内：订单置已支付 → upsert 会员项目身份（valid_until 续费叠加）→ 时间线 → 审计。
 */
@Service
public class MembershipOrderService {

    /** 订单合法迁移表（dict:membership_order_status）。 */
    static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "待支付", Set.of("已支付", "已关闭"),
            "已支付", Set.of("退款中"),
            "退款中", Set.of("已退款", "已支付"));   // 退款驳回 → 回到已支付

    private final JdbcClient db;
    private final MemberService memberService;
    private final AuditService audit;

    public MembershipOrderService(JdbcClient db, MemberService memberService, AuditService audit) {
        this.db = db;
        this.memberService = memberService;
        this.audit = audit;
    }

    public List<Map<String, Object>> plans(boolean onSaleOnly) {
        return db.sql("""
                        SELECT * FROM membership_plan
                        WHERE (NOT :onSale OR status = '上架')
                        ORDER BY grant_identity, duration_days
                        """)
                .param("onSale", onSaleOnly)
                .query(Rows.MAP).list();
    }

    /** 新建套餐（默认上架）。 */
    @Transactional
    public Map<String, Object> createPlan(String planCode, String name, String grantIdentity,
                                          int durationDays, int priceCents, Integer iosPriceCents,
                                          String projectScope) {
        db.sql("""
                INSERT INTO membership_plan (plan_code, name, grant_identity, duration_days,
                                             price_cents, ios_price_cents, project_scope)
                VALUES (:code, :name, :ident, :days, :price, :iosPrice, :scope)
                """)
                .param("code", planCode).param("name", name).param("ident", grantIdentity)
                .param("days", durationDays).param("price", priceCents)
                .param("iosPrice", iosPriceCents).param("scope", projectScope)
                .update();
        audit.log("membership_plan", planCode, "新建会员套餐");
        return db.sql("SELECT * FROM membership_plan WHERE plan_code = :c").param("c", planCode)
                .query(Rows.MAP).single();
    }

    /** 套餐上架/下架。 */
    @Transactional
    public Map<String, Object> setPlanStatus(long planId, String status) {
        if (!"上架".equals(status) && !"下架".equals(status)) {
            throw new BusinessException("套餐状态仅支持 上架/下架");
        }
        Map<String, Object> before = db.sql("SELECT * FROM membership_plan WHERE id = :id")
                .param("id", planId)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("套餐"));
        db.sql("UPDATE membership_plan SET status = :s, updated_at = now() WHERE id = :id")
                .param("s", status).param("id", planId).update();
        audit.log("membership_plan", (String) before.get("plan_code"), "套餐" + status,
                Map.of("status", before.get("status")), Map.of("status", status), null, null, null);
        return db.sql("SELECT * FROM membership_plan WHERE id = :id").param("id", planId)
                .query(Rows.MAP).single();
    }

    public List<Map<String, Object>> orders(String memberNo, String status) {
        return db.sql("""
                        SELECT o.*, m.member_no, m.name AS member_name, p.plan_code, p.name AS plan_name,
                               p.grant_identity, p.duration_days
                        FROM membership_order o
                        JOIN member m ON m.id = o.member_id
                        JOIN membership_plan p ON p.id = o.plan_id
                        WHERE (CAST(:no AS text) IS NULL OR m.member_no = :no)
                          AND (CAST(:status AS text) IS NULL OR o.status = :status)
                        ORDER BY o.created_at DESC
                        """)
                .param("no", memberNo).param("status", status)
                .query(Rows.MAP).list();
    }

    /** 下单（待支付）。全生态套餐必须显式传权益落地项目。 */
    @Transactional
    public Map<String, Object> createOrder(String memberNo, String planCode, String channel, String projectId) {
        long memberId = memberService.idOf(memberNo);
        // M6：渠道服务端白名单校验（非法值原会撞 CHECK 变 500）。渠道决定入账金额/费率快照，
        // M3c 真实回调应由支付平台裁定渠道并经 paymentCallback 的金额校验兜底，不纯信客户端自报。
        if (!Set.of("ios", "android", "other").contains(channel)) {
            throw new BusinessException("非法支付渠道：" + channel + "（仅 ios/android/other）");
        }
        Map<String, Object> plan = db.sql("SELECT * FROM membership_plan WHERE plan_code = :c AND status = '上架'")
                .param("c", planCode)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("上架套餐 " + planCode));
        String targetProject = plan.get("project_scope") != null ? (String) plan.get("project_scope") : projectId;
        if (targetProject == null) {
            throw new BusinessException("全生态套餐下单必须指定权益落地项目 projectId");
        }
        int amount = "ios".equals(channel) && plan.get("ios_price_cents") != null
                ? ((Number) plan.get("ios_price_cents")).intValue()
                : ((Number) plan.get("price_cents")).intValue();
        // 费率快照：iOS 12%（苹果佣金，腾讯 5% 暂免）/ 安卓主动支付 1%（2026-07 官方限时价，政策会变故留痕）
        String feeRate = "ios".equals(channel) ? "0.1200" : "0.0100";
        String orderNo = "MO-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        db.sql("""
                INSERT INTO membership_order (order_no, member_id, plan_id, project_id, channel,
                                              amount_cents, fee_rate_snapshot)
                VALUES (:no, :m, :p, :pid, :ch, :amt, CAST(:fee AS numeric))
                """)
                .param("no", orderNo).param("m", memberId).param("p", plan.get("id"))
                .param("pid", targetProject).param("ch", channel).param("amt", amount).param("fee", feeRate)
                .update();
        Map<String, Object> order = db.sql("SELECT * FROM membership_order WHERE order_no = :no")
                .param("no", orderNo).query(Rows.MAP).single();
        audit.log("membership_order", orderNo, "创建会员费订单", null,
                Map.of("planCode", planCode, "channel", channel, "amountCents", amount),
                targetProject, null, null);
        return order;
    }

    /**
     * 支付成功回调（幂等：同 callback_id 重复回调返回首次结果）。
     * Mock 阶段由 /mock/virtual-pay 触发；M3c 接真实虚拟支付回调（验签后调本方法）。
     */
    public Map<String, Object> paymentCallback(String orderNo, String callbackId) {
        return paymentCallback(orderNo, callbackId, null);
    }

    /**
     * 支付成功回调（幂等：同 callback_id 重复回调返回首次结果）。
     * H1 修复：仅接受「待支付」订单——「退款驳回」（退款中→已支付）改走 changeStatus 且不重发权益，
     * 杜绝退款窗口内二次回调净多发一个周期。
     * M6：paidAmountCents 非空时（M3c 真实回调）校验实付金额与订单一致，late/伪造回调无法被金额兜底绕过。
     */
    @Transactional
    public Map<String, Object> paymentCallback(String orderNo, String callbackId, Integer paidAmountCents) {
        if (callbackId == null || callbackId.isBlank()) {
            throw new BusinessException("回调缺少幂等键 callbackId");
        }
        // 幂等短路：该回调已处理过 → 返回首次结果
        var handled = db.sql("SELECT * FROM membership_order WHERE callback_id = :c")
                .param("c", callbackId).query(Rows.MAP).optional();
        if (handled.isPresent()) {
            Map<String, Object> out = new HashMap<>(handled.get());
            out.put("idempotent", true);
            return out;
        }
        Map<String, Object> order = db.sql("SELECT * FROM membership_order WHERE order_no = :no FOR UPDATE")
                .param("no", orderNo)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("订单 " + orderNo));
        String from = (String) order.get("status");
        if (!"待支付".equals(from)) {
            throw BusinessException.conflict("支付回调仅接受待支付订单（当前「" + from + "」）");
        }
        if (paidAmountCents != null
                && paidAmountCents.intValue() != ((Number) order.get("amount_cents")).intValue()) {
            throw BusinessException.conflict("回调实付金额 " + paidAmountCents
                    + " 与订单金额 " + order.get("amount_cents") + " 不符");
        }
        transition(order, "已支付");
        db.sql("""
                UPDATE membership_order SET status = '已支付', paid_at = now(), callback_id = :c, updated_at = now()
                WHERE id = :id
                """)
                .param("c", callbackId).param("id", order.get("id")).update();
        applyEntitlement(order, +1);
        audit.log("membership_order", orderNo, "支付成功·权益生效",
                Map.of("status", order.get("status")), Map.of("status", "已支付", "callbackId", callbackId),
                (String) order.get("project_id"), null, null);
        return db.sql("SELECT * FROM membership_order WHERE order_no = :no").param("no", orderNo)
                .query(Rows.MAP).single();
    }

    /** 关闭未支付订单 / 发起退款 / 退款完成（退款完成回收权益时长）。 */
    @Transactional
    public Map<String, Object> changeStatus(String orderNo, String to, String reason) {
        Map<String, Object> order = db.sql("SELECT * FROM membership_order WHERE order_no = :no FOR UPDATE")
                .param("no", orderNo)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("订单 " + orderNo));
        // H1：置「已支付」仅两条合法来源——①待支付经支付回调（幂等，走 paymentCallback）；
        // ②退款中→已支付的「退款驳回」（此处，且权益从未被撤，故不重发）。其余一律禁止人工直改。
        String fromStatus = (String) order.get("status");
        if ("已支付".equals(to) && !"退款中".equals(fromStatus)) {
            throw BusinessException.conflict("置「已支付」只能经支付回调（幂等），不可人工直改");
        }
        transition(order, to);
        db.sql("UPDATE membership_order SET status = :s, close_reason = :r, updated_at = now() WHERE id = :id")
                .param("s", to).param("r", reason).param("id", order.get("id")).update();
        if ("已退款".equals(to)) {
            applyEntitlement(order, -1);   // 回收本单授予的权益时长
        }
        audit.log("membership_order", orderNo, "订单状态变更",
                Map.of("status", order.get("status")), Map.of("status", to),
                (String) order.get("project_id"), reason, null);
        return db.sql("SELECT * FROM membership_order WHERE order_no = :no").param("no", orderNo)
                .query(Rows.MAP).single();
    }

    private void transition(Map<String, Object> order, String to) {
        String from = (String) order.get("status");
        if (!TRANSITIONS.getOrDefault(from, Set.of()).contains(to)) {
            throw BusinessException.conflict("订单状态「" + from + "」不可迁移至「" + to + "」");
        }
    }

    /**
     * 权益写入（同事务）：direction=+1 支付生效（valid_until 在「现有效期与今天的较晚者」上叠加时长，续费不吃亏）；
     * direction=-1 退款回收（扣减时长，最早收敛到 now → 到期作业置已过期）。
     */
    private void applyEntitlement(Map<String, Object> order, int direction) {
        Map<String, Object> plan = db.sql("SELECT * FROM membership_plan WHERE id = :id")
                .param("id", order.get("plan_id")).query(Rows.MAP).single();
        long memberId = ((Number) order.get("member_id")).longValue();
        String projectId = (String) order.get("project_id");
        String identity = (String) plan.get("grant_identity");
        int days = ((Number) plan.get("duration_days")).intValue() * direction;
        if (direction > 0) {
            // 发放/续期：身份升级到套餐档位，有效期在「现有效期与今天的较晚者」上叠加时长（续费不吃亏）
            db.sql("""
                    INSERT INTO member_project_identity (member_id, project_id, identity, status, source, valid_from, valid_until)
                    VALUES (:m, :p, :ident, '有效', '会员购买', now(), now() + make_interval(days => :days))
                    ON CONFLICT (member_id, project_id) DO UPDATE SET
                      identity = EXCLUDED.identity,
                      status = '有效',
                      source = '会员购买',
                      valid_until = GREATEST(
                          GREATEST(COALESCE(member_project_identity.valid_until, now()), now())
                              + make_interval(days => :days),
                          now())
                    """)
                    .param("m", memberId).param("p", projectId).param("ident", identity).param("days", days)
                    .update();
            enterPendingPoolIfUnplaced(memberId, projectId);
        } else {
            // M10 退款回收：仅扣减本单时长（最早收敛到 now），不改写身份档位、不强制 status——
            // 跨档叠加（先买年卡尊享官、后买月卡PRO 再退月卡）时避免把身份误降级为被退套餐档位。
            // 局限：多单叠加的精确按单核销需权益流水账（后续迭代），当前退款按时长近似回收。
            db.sql("""
                    UPDATE member_project_identity
                    SET valid_until = GREATEST(COALESCE(valid_until, now()) + make_interval(days => :days), now())
                    WHERE member_id = :m AND project_id = :p
                    """)
                    .param("m", memberId).param("p", projectId).param("days", days)
                    .update();
        }
        String memberNo = db.sql("SELECT member_no FROM member WHERE id = :id").param("id", memberId)
                .query(String.class).single();
        db.sql("""
                INSERT INTO member_timeline (member_id, project_id, event_type, title, detail, operator)
                VALUES (:m, :p, '身份变更', :title, CAST(:detail AS jsonb), '系统')
                """)
                .param("m", memberId).param("p", projectId)
                .param("title", direction > 0 ? "会员购买生效：" + plan.get("name") : "退款回收权益：" + plan.get("name"))
                .param("detail", Json.obj("orderNo", order.get("order_no"), "identity", identity,
                        "days", days, "memberNo", memberNo))
                .update();
    }

    /**
     * 付费即进待分配池（闭合「购买 → 入群」链路）。
     *
     * 背景：`pendingPool` 以 `member_project_identity.status = '待分配'` 取人，而权益判定
     * （EntitlementService.hasPaidEntitlement）认 '有效' 与 '待分配' 两种状态——即「待分配」
     * 的语义是「权益已生效、尚未安置进群」。此前支付后一律写 '有效'，付费会员因此不进池，
     * 运营在 PC 待分配池看不到人，小程序永远停留在「运营正在为你匹配」。
     *
     * 故：支付成功且该会员在本项目下无在途/已入群安置时，把身份状态收敛到 '待分配'。
     * 已入群（或安置在途）的续费用户保持 '有效'，避免已安置的人被重复投池。
     */
    private void enterPendingPoolIfUnplaced(long memberId, String projectId) {
        int updated = db.sql("""
                UPDATE member_project_identity SET status = '待分配'
                WHERE member_id = :m AND project_id = :p AND status = '有效'
                  AND NOT EXISTS (
                      SELECT 1 FROM member_group_assignment a
                      WHERE a.member_id = :m AND a.project_id = :p
                        AND a.status IN ('待匹配','已推荐','待确认','待加好友','已加好友','待邀请','已邀请','已入群'))
                """)
                .param("m", memberId).param("p", projectId)
                .update();
        if (updated > 0) {
            memberService.appendTimeline(memberId, projectId, "待分配",
                    "会员购买生效，进入待分配池等待安置", "系统");
        }
    }

    /**
     * 到期作业（M3 §4.1）：付费身份 valid_until 已过 → 置已过期 + 生成续费回访任务。
     * 不自动踢群——移群走人工任务，避免误伤（方案明确）。每日 02:30 跑；也可经端点手动触发。
     */
    @Scheduled(cron = "0 30 2 * * *")
    @Transactional
    public Map<String, Object> runExpiry() {
        List<Map<String, Object>> due = db.sql("""
                        SELECT mpi.id, mpi.member_id, mpi.project_id, mpi.identity, m.member_no, m.name
                        FROM member_project_identity mpi
                        JOIN member m ON m.id = mpi.member_id
                        JOIN dict_entry d ON d.dict_code = 'paid_identity' AND d.item_label = mpi.identity AND d.enabled
                        WHERE mpi.status = '有效' AND mpi.valid_until IS NOT NULL AND mpi.valid_until < now()
                        FOR UPDATE OF mpi
                        """)
                .query(Rows.MAP).list();
        for (Map<String, Object> row : due) {
            db.sql("UPDATE member_project_identity SET status = '已过期' WHERE id = :id")
                    .param("id", row.get("id")).update();
            db.sql("""
                    INSERT INTO task_item (task_type, title, project_id, member_id, priority, status, due_at)
                    VALUES ('回访', :title, :p, :m, '高', '待领取', now() + interval '3 days')
                    """)
                    .param("title", "会员到期续费提醒：" + row.get("name") + "（" + row.get("identity") + "）")
                    .param("p", row.get("project_id")).param("m", row.get("member_id"))
                    .update();
            db.sql("""
                    INSERT INTO member_timeline (member_id, project_id, event_type, title, operator)
                    VALUES (:m, :p, '身份变更', :title, '系统')
                    """)
                    .param("m", row.get("member_id")).param("p", row.get("project_id"))
                    .param("title", "付费身份到期：" + row.get("identity"))
                    .update();
            audit.log("member_project_identity", String.valueOf(row.get("id")), "付费身份到期",
                    Map.of("status", "有效"), Map.of("status", "已过期"),
                    (String) row.get("project_id"), "到期作业", null);
        }
        return Map.of("expired", due.size());
    }
}
