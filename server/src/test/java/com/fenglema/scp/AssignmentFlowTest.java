package com.fenglema.scp;

import com.fenglema.scp.assignment.AssignmentService;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.task.TaskService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 入群闭环端到端（SPEC §6.4–§6.7 / §8.4 / §16-2）：
 * 进线→推荐→确认→加好友回填（幂等）→自动邀请任务→邀请回填→入群事件→回写全查验。
 */
class AssignmentFlowTest extends TestSupport {

    @Autowired
    AssignmentService assignmentService;

    @Autowired
    TaskService taskService;

    /** M2：企微活码入群不得写个微「好友」边（会与 account.friend_count 口径矛盾、误导下次 isFriend 判断）。 */
    @Test
    void wecomConfirmJoinDoesNotWritePhantomFriendEdge() {
        String groupId = createServiceableGroup("北京", "PRO会员群", 100, 5);
        db.sql("UPDATE community_group SET wecom_chat_id = :c WHERE id = :g")
                .param("c", "wecom-chat-" + uid()).param("g", groupId).update();
        String wechatId = db.sql("SELECT account_id FROM group_staffing WHERE group_id = :g AND role = '个微客服' AND is_primary")
                .param("g", groupId).query(String.class).single();
        String memberNo = ingestMember("企微入群会员" + uid(), "北京", "flm-membership", "PRO会员", null);
        long memberId = memberIdOf(memberNo);
        long assignmentId = db.sql("""
                        INSERT INTO member_group_assignment (member_id, project_id, group_id, status, assign_way, personal_wechat_id)
                        VALUES (:m, 'flm-membership', :g, '已邀请', 'AI推荐', :w) RETURNING id
                        """)
                .param("m", memberId).param("g", groupId).param("w", wechatId)
                .query(Long.class).single();

        assignmentService.confirmJoin(assignmentId, "webhook");

        int friendEdges = db.sql("""
                        SELECT count(*) FROM member_wechat_relation
                        WHERE member_id = :m AND account_id = :a AND relation = '好友'
                        """)
                .param("m", memberId).param("a", wechatId).query(Integer.class).single();
        assertEquals(0, friendEdges, "企微客户群入群不应产生个微好友关系");
        assertEquals("已入群", db.sql("SELECT status FROM member_group_assignment WHERE id = :id")
                .param("id", assignmentId).query(String.class).single());
    }

    @Test
    void fullJoinLoopWithWritebacks() {
        String groupId = createServiceableGroup("北京", "PRO会员群", 100, 10);
        String memberNo = ingestMember("闭环会员" + uid(), "北京", "flm-membership", "PRO会员", null);
        long memberId = memberIdOf(memberNo);

        // 推荐（新建测试群应为首选或至少可确认到指定群）
        Map<String, Object> rec = assignmentService.recommend(memberNo, "flm-membership");
        long assignmentId = ((Number) rec.get("assignmentId")).longValue();

        // 确认到指定测试群（非首选时属于人工调整 → 必须填覆盖原因）
        Map<String, Object> confirmed = assignmentService.confirm(assignmentId, groupId, "测试指定承接群");
        assertEquals("待加好友", confirmed.get("status"), "非好友应先走加好友任务");
        long friendTaskId = ((Number) confirmed.get("taskId")).longValue();

        // 预占生效：群容量 + 个微好友额度
        int reservations = db.sql("SELECT count(*) FROM capacity_reservation WHERE assignment_id = :id AND status = '生效'")
                .param("id", assignmentId).query(Integer.class).single();
        assertEquals(2, reservations);

        // 加好友回填（幂等键重复 → 第二次不再执行）
        String key = "test-key-" + uid();
        taskService.attempt(friendTaskId, "成功", null, key);
        Map<String, Object> repeat = taskService.attempt(friendTaskId, "成功", null, key);
        assertTrue(Boolean.TRUE.equals(repeat.get("idempotent")), "同幂等键重复回填必须被拦截");

        Map<String, Object> afterFriend = assignmentService.get(assignmentId);
        assertEquals("待邀请", afterFriend.get("status"));
        assertNotNull(afterFriend.get("invite_task_id"), "加好友成功应自动派生邀请任务");

        // 好友关系已回写（人工回填）
        int relation = db.sql("""
                        SELECT count(*) FROM member_wechat_relation
                        WHERE member_id = :m AND relation = '好友' AND confirm_way = '人工回填'
                        """).param("m", memberId).query(Integer.class).single();
        assertEquals(1, relation);

        // 邀请回填 → 已邀请
        long inviteTaskId = ((Number) afterFriend.get("invite_task_id")).longValue();
        taskService.attempt(inviteTaskId, "成功", null, "test-key-" + uid());
        assertEquals("已邀请", assignmentService.get(assignmentId).get("status"));

        // 入群事件确认 → 已入群 + 回写
        int beforeCount = db.sql("SELECT member_count FROM community_group WHERE id = :g").param("g", groupId)
                .query(Integer.class).single();
        assignmentService.confirmJoin(assignmentId, "webhook");

        Map<String, Object> done = assignmentService.get(assignmentId);
        assertEquals("已入群", done.get("status"));
        int afterCount = db.sql("SELECT member_count FROM community_group WHERE id = :g").param("g", groupId)
                .query(Integer.class).single();
        assertEquals(beforeCount + 1, afterCount, "群人数应 +1");
        int consumed = db.sql("SELECT count(*) FROM capacity_reservation WHERE assignment_id = :id AND status = '已消耗'")
                .param("id", assignmentId).query(Integer.class).single();
        assertEquals(2, consumed, "预占应转为已消耗");

        // 档案时间线含全过程（SPEC §16-2/§16-6）
        List<Map<String, Object>> timeline = db.sql("SELECT * FROM member_timeline WHERE member_id = :m")
                .param("m", memberId).query(Rows.MAP).list();
        assertTrue(timeline.stream().anyMatch(t -> "入群".equals(t.get("event_type"))));
        assertTrue(timeline.stream().anyMatch(t -> "同步".equals(t.get("event_type"))));
    }

    @Test
    void illegalTransitionRejected() {
        String groupId = createServiceableGroup("北京", "PRO会员群", 100, 0);
        String memberNo = ingestMember("非法迁移" + uid(), "北京", "flm-membership", "PRO会员", null);
        Map<String, Object> rec = assignmentService.recommend(memberNo, "flm-membership");
        long assignmentId = ((Number) rec.get("assignmentId")).longValue();
        // 已推荐 → 已入群 是非法跳变
        BusinessException ex = assertThrows(BusinessException.class,
                () -> assignmentService.confirmJoin(assignmentId, "manual"));
        assertTrue(ex.getMessage().contains("不允许"));
    }

    @Test
    void duplicateInflightAssignmentRejected() {
        createServiceableGroup("北京", "PRO会员群", 100, 0);
        String memberNo = ingestMember("重复分配" + uid(), "北京", "flm-membership", "PRO会员", null);
        Map<String, Object> rec = assignmentService.recommend(memberNo, "flm-membership");
        long assignmentId = ((Number) rec.get("assignmentId")).longValue();
        assignmentService.confirm(assignmentId, null, null);
        // 在途中再次发起推荐 → 拒绝（唯一在途约束）
        BusinessException ex = assertThrows(BusinessException.class,
                () -> assignmentService.recommend(memberNo, "flm-membership"));
        assertTrue(ex.getMessage().contains("进行中"));
    }

    @Autowired
    com.fenglema.scp.governance.ApprovalService approvalService;

    @Test
    void overrideApprovalActuallyExecutesReserveAndTask() {
        // H1 回归：超容量覆盖审批通过后必须真正 预占+建任务+推进，否则分配永久卡死无任务可回填
        String fullGroup = createServiceableGroup("北京", "PRO会员群", 1, 1);   // 1/1 已满（覆盖目标）
        String recGroup = createServiceableGroup("北京", "PRO会员群", 100, 0);  // 推荐群（非满）
        String memberNo = ingestMember("超容量" + uid(), "北京", "flm-membership", "PRO会员", null);
        Long aid = db.sql("""
                        INSERT INTO member_group_assignment (member_id, project_id, group_id, status, assign_way, recommended_at)
                        VALUES (:m, 'flm-membership', :g, '已推荐', 'AI推荐', now()) RETURNING id
                        """)
                .param("m", memberIdOf(memberNo)).param("g", recGroup).query(Long.class).single();

        // 人工改选满群 fullGroup（≠推荐群）+ 覆盖原因 → 触发超容量覆盖审批
        Map<String, Object> r = assignmentService.confirm(aid, fullGroup, "VIP 插队，已与负责人确认");
        assertEquals("待确认", r.get("status"), "满群+覆盖原因应进审批");
        long approvalId = ((Number) r.get("approvalId")).longValue();

        approvalService.decide(approvalId, true, "同意超容量");
        Map<String, Object> a = assignmentService.get(aid);
        assertEquals("待加好友", a.get("status"), "审批通过后应推进到待加好友");
        assertNotNull(a.get("friend_task_id"), "审批通过后必须已建加好友任务（H1 核心）");
        int resv = db.sql("SELECT count(*) FROM capacity_reservation WHERE assignment_id = :id AND status = '生效'")
                .param("id", aid).query(Integer.class).single();
        assertTrue(resv >= 1, "审批通过后必须已预占");
        // 闭环可继续：回填加好友任务 → 待邀请（证明不再卡死）
        long ft = ((Number) a.get("friend_task_id")).longValue();
        taskService.attempt(ft, "成功", null, "k-" + uid());
        assertEquals("待邀请", assignmentService.get(aid).get("status"));
    }

    @Test
    void quitRefreshesGroupStatusSoFullGroupRecovers() {
        // M1 回归：退群事件必须刷新群状态，否则满群退人后永不回收、被推荐引擎永久剔除
        String g = createServiceableGroup("北京", "PRO会员群", 1, 1);
        String memberNo = ingestMember("退群" + uid(), "北京", "flm-membership", "PRO会员", null);
        Long aid = db.sql("""
                        INSERT INTO member_group_assignment (member_id, project_id, group_id, status, joined_at)
                        VALUES (:m, 'flm-membership', :g, '已入群', now()) RETURNING id
                        """)
                .param("m", memberIdOf(memberNo)).param("g", g).query(Long.class).single();
        db.sql("UPDATE community_group SET status = '已满' WHERE id = :g").param("g", g).update();

        assignmentService.handleQuit(aid, g);
        Map<String, Object> grp = db.sql("SELECT * FROM community_group WHERE id = :g").param("g", g).query(Rows.MAP).single();
        assertEquals(0, ((Number) grp.get("member_count")).intValue(), "退群后人数 -1");
        assertNotEquals("已满", grp.get("status"), "退群后状态必须刷新（不再是已满）");
    }

    @Test
    void expiredReservationRetainedWhileAssignmentInFlight() {
        // M5 回归：在途分配的过期预占不得被调度器释放，否则延迟入群击穿 target_capacity
        String g = createServiceableGroup("北京", "PRO会员群", 100, 0);
        String memberNo = ingestMember("预占" + uid(), "北京", "flm-membership", "PRO会员", null);
        Long aid = db.sql("""
                        INSERT INTO member_group_assignment (member_id, project_id, group_id, status)
                        VALUES (:m, 'flm-membership', :g, '待加好友') RETURNING id
                        """)
                .param("m", memberIdOf(memberNo)).param("g", g).query(Long.class).single();
        Long rid = db.sql("""
                        INSERT INTO capacity_reservation (target_type, target_id, amount, assignment_id, status, expires_at)
                        VALUES ('群容量', :g, 1, :a, '生效', now() - interval '1 minute') RETURNING id
                        """)
                .param("g", g).param("a", aid).query(Long.class).single();

        assignmentService.releaseExpiredReservations();
        assertEquals("生效", db.sql("SELECT status FROM capacity_reservation WHERE id = :id").param("id", rid).query(String.class).single(),
                "在途分配的过期预占必须保留");
        // 对照：分配置终态后，过期预占应被回收
        db.sql("UPDATE member_group_assignment SET status = '人工取消' WHERE id = :id").param("id", aid).update();
        assignmentService.releaseExpiredReservations();
        assertEquals("已释放", db.sql("SELECT status FROM capacity_reservation WHERE id = :id").param("id", rid).query(String.class).single(),
                "分配终结后过期预占应回收");
    }
}
