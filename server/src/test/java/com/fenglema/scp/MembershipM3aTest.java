package com.fenglema.scp;

import com.fenglema.scp.assignment.AssignmentService;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.membership.EntitlementService;
import com.fenglema.scp.membership.MembershipOrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.OffsetDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * M3a 权益域测试：订单状态机 / 支付回调幂等 / 付费门控（引擎准入 + confirm 前置）/
 * 归属优先（第 0 级）/ 到期作业。自建数据 + 唯一后缀（护栏 24）。
 */
class MembershipM3aTest extends TestSupport {

    static final String PROJECT = "flm-membership";

    @Autowired
    MembershipOrderService orderService;
    @Autowired
    EntitlementService entitlement;
    @Autowired
    AssignmentService assignmentService;
    @Autowired
    com.fenglema.scp.assignment.RecommendEngine engine;
    @Autowired
    com.fenglema.scp.identity.MemberService memberService;

    /** 建无付费权益的会员（游客进线，不触发 TestSupport 的付费档自动补有效期）。 */
    private String ingestVisitor(String name) {
        return ingestMember(name + uid(), "北京", PROJECT, "游客", null);
    }

    private void stripEntitlement(String memberNo) {
        db.sql("""
                UPDATE member_project_identity SET valid_until = NULL
                WHERE member_id = (SELECT id FROM member WHERE member_no = :no) AND project_id = :p
                """)
                .param("no", memberNo).param("p", PROJECT).update();
    }

    // ── 订单状态机 + 回调幂等 ──

    @Test
    void orderLifecycleAndCallbackIdempotency() {
        String memberNo = ingestVisitor("订单会员");
        long memberId = memberIdOf(memberNo);

        Map<String, Object> order = orderService.createOrder(memberNo, "MPLAN-PRO-M", "android", PROJECT);
        String orderNo = (String) order.get("order_no");
        assertEquals("待支付", order.get("status"));

        // 非法迁移：待支付 → 退款中
        assertThrows(BusinessException.class, () -> orderService.changeStatus(orderNo, "退款中", "test"));
        // 人工直改已支付被拒（只能走回调）
        assertThrows(BusinessException.class, () -> orderService.changeStatus(orderNo, "已支付", "test"));

        // 支付回调 → 已支付 + 权益生效
        String cb = "CB-" + uid();
        Map<String, Object> paid = orderService.paymentCallback(orderNo, cb);
        assertEquals("已支付", paid.get("status"));
        assertTrue(entitlement.hasPaidEntitlement(memberId, PROJECT), "支付后应持有效付费权益");
        OffsetDateTime validUntil = db.sql("""
                        SELECT valid_until FROM member_project_identity WHERE member_id = :m AND project_id = :p
                        """)
                .param("m", memberId).param("p", PROJECT)
                .query(OffsetDateTime.class).single();
        assertNotNull(validUntil);

        // 幂等：同 callbackId 重复回调 → 返回首次结果，不叠加权益
        Map<String, Object> replay = orderService.paymentCallback(orderNo, cb);
        assertEquals(Boolean.TRUE, replay.get("idempotent"));
        OffsetDateTime after = db.sql("""
                        SELECT valid_until FROM member_project_identity WHERE member_id = :m AND project_id = :p
                        """)
                .param("m", memberId).param("p", PROJECT)
                .query(OffsetDateTime.class).single();
        assertEquals(validUntil, after, "重复回调不得二次叠加有效期");

        // 换一个 callbackId 再回调 → 已支付不可再迁移到已支付，拒绝
        assertThrows(BusinessException.class, () -> orderService.paymentCallback(orderNo, "CB2-" + uid()));

        // 退款链路：已支付 → 退款中 → 已退款（回收权益）
        orderService.changeStatus(orderNo, "退款中", "用户申请");
        Map<String, Object> refunded = orderService.changeStatus(orderNo, "已退款", "审批通过");
        assertEquals("已退款", refunded.get("status"));
        assertFalse(entitlement.hasPaidEntitlement(memberId, PROJECT), "退款后权益应被回收");
    }

    // ── 付费门控：引擎准入（注入点①）+ confirm 前置（注入点②） ──

    @Test
    void paidGateFiltersEngineAndBlocksConfirm() {
        String memberNo = ingestVisitor("门控会员");
        long memberId = memberIdOf(memberNo);
        String paidGroup = createServiceableGroup("北京", "PRO会员群", 100, 0);
        String exemptGroup = createServiceableGroup("北京", "游客群", 100, 0);

        // 引擎：无权益 → 候选只剩豁免群类型
        var candidates = engine.recommend(memberId, PROJECT);
        assertTrue(candidates.stream().noneMatch(c -> c.groupId().equals(paidGroup)),
                "无权益会员的候选不应含付费档群");
        assertTrue(candidates.stream().anyMatch(c -> c.groupId().equals(exemptGroup)),
                "豁免群类型（游客群）应保留");

        // confirm 前置：绕过引擎直接确认进付费档群 → 门控阻断
        Long assignmentId = db.sql("""
                        INSERT INTO member_group_assignment (member_id, project_id, group_id, status, assign_way)
                        VALUES (:m, :p, :g, '已推荐', '人工调整') RETURNING id
                        """)
                .param("m", memberId).param("p", PROJECT).param("g", paidGroup)
                .query(Long.class).single();
        BusinessException blocked = assertThrows(BusinessException.class,
                () -> assignmentService.confirm(assignmentId, paidGroup, "测试强塞"));
        assertTrue(blocked.getMessage().contains("付费门控"), "阻断原因应为付费门控：" + blocked.getMessage());

        // 购买会员后 → 引擎放行付费档群
        Map<String, Object> order = orderService.createOrder(memberNo, "MPLAN-PRO-M", "android", PROJECT);
        orderService.paymentCallback((String) order.get("order_no"), "CB-" + uid());
        var after = engine.recommend(memberId, PROJECT);
        assertTrue(after.stream().anyMatch(c -> c.groupId().equals(paidGroup)),
                "购买后付费档群应回到候选集");
    }

    // ── 第 0 级归属优先 ──

    @Test
    void affinityFirstRestrictsToAgentOwnedGroups() {
        // 代理 A（identity=代理，非付费档，进线即有效）
        String agentNo = ingestMember("归属代理" + uid(), "北京", PROJECT, "代理", null);
        long agentId = memberIdOf(agentNo);
        db.sql("UPDATE member_project_identity SET status = '有效' WHERE member_id = :m AND project_id = :p")
                .param("m", agentId).param("p", PROJECT).update();
        // 代理名下群 + 普通群（体验官群豁免门控，且与新会员身份匹配）
        String ownedGroup = createServiceableGroup("北京", "体验官群", 100, 0);
        db.sql("UPDATE community_group SET owner_member_id = :o WHERE id = :g")
                .param("o", agentId).param("g", ownedGroup).update();
        String plainGroup = createServiceableGroup("北京", "体验官群", 100, 0);

        // 新会员 B 由代理 A 邀请进线
        String invitee = ingestMember("被邀会员" + uid(), "北京", PROJECT, "体验官", agentNo);
        long inviteeId = memberIdOf(invitee);

        var candidates = engine.recommend(inviteeId, PROJECT);
        assertTrue(candidates.stream().anyMatch(c -> c.groupId().equals(ownedGroup)),
                "代理名下群应在候选集");
        assertTrue(candidates.stream().noneMatch(c -> c.groupId().equals(plainGroup)),
                "归属优先生效时候选集应限定为代理名下群");

        // 关闭 affinity_first → 退化为全量候选（软加分保留）
        db.sql("UPDATE resource_rules SET affinity_first = FALSE WHERE id = 1").update();
        try {
            var relaxed = engine.recommend(inviteeId, PROJECT);
            assertTrue(relaxed.stream().anyMatch(c -> c.groupId().equals(plainGroup)),
                    "关闭归属优先后普通群应回到候选集");
        } finally {
            db.sql("UPDATE resource_rules SET affinity_first = TRUE WHERE id = 1").update();
        }
    }

    // ── 到期作业 ──

    @Test
    void expiryJobExpiresAndCreatesRenewalTask() {
        String memberNo = ingestMember("到期会员" + uid(), "北京", PROJECT, "PRO会员", null);
        long memberId = memberIdOf(memberNo);
        db.sql("""
                UPDATE member_project_identity SET status = '有效', valid_until = now() - interval '1 day'
                WHERE member_id = :m AND project_id = :p
                """)
                .param("m", memberId).param("p", PROJECT).update();

        orderService.runExpiry();

        String status = db.sql("""
                        SELECT status FROM member_project_identity WHERE member_id = :m AND project_id = :p
                        """)
                .param("m", memberId).param("p", PROJECT)
                .query(String.class).single();
        assertEquals("已过期", status);
        int renewalTasks = db.sql("""
                        SELECT count(*) FROM task_item
                        WHERE member_id = :m AND task_type = '回访' AND title LIKE '会员到期续费提醒%'
                        """)
                .param("m", memberId).query(Integer.class).single();
        assertEquals(1, renewalTasks, "到期应生成一条续费回访任务");
        int timeline = db.sql("""
                        SELECT count(*) FROM member_timeline
                        WHERE member_id = :m AND title LIKE '付费身份到期%'
                        """)
                .param("m", memberId).query(Integer.class).single();
        assertEquals(1, timeline);
    }

    // ── 群发派发额度（每群每天≤1条） ──

    @Autowired
    com.fenglema.scp.content.ContentService contentService;

    @Test
    void broadcastQuotaSkipsGroupsAlreadyServedToday() {
        String g = createServiceableGroup("北京", "PRO会员群", 100, 1);
        db.sql("UPDATE community_group SET status = '服务中' WHERE id = :g").param("g", g).update();

        Map<String, Object> plan1 = contentService.createBroadcast("测试群发A" + uid(),
                Map.of("text", "今晚课程提醒"), Map.of("groupType", "PRO会员群"));
        Map<String, Object> r1 = contentService.dispatchBroadcast(((Number) plan1.get("id")).longValue());
        assertTrue(((Number) r1.get("taskCreated")).intValue() >= 1);

        // 同日第二次派发同一群 → 额度跳过（如实计入 skippedByQuota）
        Map<String, Object> plan2 = contentService.createBroadcast("测试群发B" + uid(),
                Map.of("text", "重复推送"), Map.of("groupType", "PRO会员群"));
        Map<String, Object> r2 = contentService.dispatchBroadcast(((Number) plan2.get("id")).longValue());
        int tasksForGroupToday = db.sql("""
                        SELECT count(*) FROM task_item
                        WHERE group_id = :g AND task_type = '群发确认' AND created_at::date = now()::date
                        """)
                .param("g", g).query(Integer.class).single();
        assertEquals(1, tasksForGroupToday, "同群同日只允许一条群发确认任务");
        assertTrue(((Number) r2.get("skippedByQuota")).intValue() >= 1, "第二次派发应报告被额度跳过的群数");
    }
}
