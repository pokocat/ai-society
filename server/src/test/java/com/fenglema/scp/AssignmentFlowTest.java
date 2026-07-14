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
}
