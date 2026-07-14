package com.fenglema.scp.task;

import com.fenglema.scp.assignment.AssignmentService;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.IdempotencyGuard;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.common.UserContext;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 执行任务（SPEC §4.8/§8.5）：加好友、邀请入群等由人工执行后回填结果（首期不做个微自动化，SPEC §2.3）。
 * 回填幂等（Idempotency-Key）；加好友成功自动派生邀请任务并推进分配状态机。
 */
@Service
public class TaskService {

    static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "待创建", Set.of("待领取", "已取消"),
            "待领取", Set.of("已分配", "处理中", "已取消"),
            "已分配", Set.of("处理中", "已取消", "超时"),
            "处理中", Set.of("待复核", "已完成", "失败", "需人工处理", "已取消"),
            "待复核", Set.of("已完成", "处理中"),
            "失败", Set.of("处理中"),
            "超时", Set.of("处理中", "已取消"));

    private final JdbcClient db;
    private final AssignmentService assignmentService;
    private final IdempotencyGuard idempotency;

    public TaskService(JdbcClient db, AssignmentService assignmentService, IdempotencyGuard idempotency) {
        this.db = db;
        this.assignmentService = assignmentService;
        this.idempotency = idempotency;
    }

    public List<Map<String, Object>> list(String taskType, String status, String projectId) {
        return db.sql("""
                SELECT t.*, m.member_no, m.name AS member_name, g.name AS group_name,
                       e.name AS assignee_name, a.name AS account_name
                FROM task_item t
                LEFT JOIN member m ON m.id = t.member_id
                LEFT JOIN community_group g ON g.id = t.group_id
                LEFT JOIN employee e ON e.id = t.assignee_employee_id
                LEFT JOIN account a ON a.id = t.account_id
                WHERE (:type IS NULL OR t.task_type = :type)
                  AND (:status IS NULL OR t.status = :status)
                  AND (:pid IS NULL OR t.project_id = :pid)
                ORDER BY t.created_at DESC LIMIT 200
                """)
                .param("type", taskType).param("status", status).param("pid", projectId)
                .query(Rows.MAP).list();
    }

    public Map<String, Object> get(long id) {
        Map<String, Object> task = new HashMap<>(db.sql("SELECT * FROM task_item WHERE id = :id")
                .param("id", id).query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("任务")));
        task.put("attempts", db.sql("SELECT * FROM task_attempt WHERE task_id = :id ORDER BY attempted_at DESC")
                .param("id", id).query(Rows.MAP).list());
        task.put("evidences", db.sql("SELECT * FROM task_evidence WHERE task_id = :id ORDER BY created_at DESC")
                .param("id", id).query(Rows.MAP).list());
        return task;
    }

    @Transactional
    public Map<String, Object> claim(long id) {
        String current = db.sql("SELECT status FROM task_item WHERE id = :id FOR UPDATE")
                .param("id", id).query(String.class).optional()
                .orElseThrow(() -> BusinessException.notFound("任务"));
        requireTransition(current, "处理中");
        db.sql("UPDATE task_item SET status = '处理中' WHERE id = :id").param("id", id).update();
        return get(id);
    }

    /**
     * 执行回填（SPEC §6.7）：成功/失败 + 原因；幂等键重复直接返回既有结果。
     * 加好友成功 → 好友关系(人工回填) + 个微好友数 +1 + 分配 已加好友→待邀请 + 自动派邀请任务。
     * 邀请成功 → 分配 已邀请（等待入群事件或人工确认，不在此置已入群）。
     */
    @Transactional
    public Map<String, Object> attempt(long id, String result, String failReason, String idempotencyKey) {
        if (!idempotency.tryRegister(idempotencyKey, "/tasks/" + id + "/attempts")) {
            return Map.of("taskId", id, "result", "重复提交，已按首次结果处理", "idempotent", true);
        }
        Map<String, Object> task = db.sql("SELECT * FROM task_item WHERE id = :id FOR UPDATE")
                .param("id", id).query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("任务"));
        String status = (String) task.get("status");
        if (Set.of("已完成", "已取消").contains(status)) {
            throw BusinessException.conflict("任务已终结（" + status + "），不可回填");
        }
        String operator = operatorName();
        db.sql("""
                INSERT INTO task_attempt (task_id, result, fail_reason, operator, idempotency_key)
                VALUES (:id, :r, :fail, :op, :key)
                """)
                .param("id", id).param("r", result).param("fail", failReason)
                .param("op", operator).param("key", idempotencyKey)
                .update();

        String taskType = (String) task.get("task_type");
        Long assignmentId = task.get("assignment_id") == null ? null : ((Number) task.get("assignment_id")).longValue();

        if ("成功".equals(result)) {
            db.sql("UPDATE task_item SET status = '已完成', completed_at = now() WHERE id = :id").param("id", id).update();
            if (assignmentId != null && "加好友".equals(taskType)) {
                onFriendSuccess(task, assignmentId);
            } else if (assignmentId != null && "邀请入群".equals(taskType)) {
                assignmentService.transition(assignmentId, "待邀请", "已邀请", null);
            }
        } else {
            db.sql("UPDATE task_item SET status = '失败', fail_reason = :fail WHERE id = :id")
                    .param("fail", failReason).param("id", id).update();
            if (assignmentId != null && "加好友".equals(taskType)) {
                assignmentService.transition(assignmentId, "待加好友", "好友申请失败", failReason);
            } else if (assignmentId != null && "邀请入群".equals(taskType)) {
                assignmentService.transition(assignmentId, null, "邀请失败", failReason);
            }
        }
        return get(id);
    }

    private void onFriendSuccess(Map<String, Object> task, long assignmentId) {
        long memberId = ((Number) task.get("member_id")).longValue();
        String accountId = (String) task.get("account_id");
        db.sql("""
                INSERT INTO member_wechat_relation (member_id, account_id, relation, confirm_way)
                VALUES (:m, :a, '好友', '人工回填')
                ON CONFLICT (member_id, account_id) DO UPDATE SET relation = '好友', confirmed_at = now()
                """)
                .param("m", memberId).param("a", accountId).update();
        // 好友数：外部存量 + 平台确认增量；校准时间同步刷新（SPEC §7.2）
        db.sql("UPDATE account SET friend_count = friend_count + 1, friend_calibrated_at = now() WHERE id = :a")
                .param("a", accountId).update();
        assignmentService.transition(assignmentId, "待加好友", "已加好友", null);
        assignmentService.transition(assignmentId, "已加好友", "待邀请", null);
        // 自动派生邀请任务（SPEC §6.6：先加好友，成功后生成邀请入群任务）
        Long inviteTaskId = db.sql("""
                        INSERT INTO task_item (task_type, title, project_id, member_id, group_id, account_id,
                                               assignee_employee_id, assignment_id, priority, status, due_at)
                        SELECT '邀请入群', '邀请入群：' || m.name, t.project_id, t.member_id, t.group_id, t.account_id,
                               t.assignee_employee_id, t.assignment_id, '高', '已分配', now() + interval '24 hours'
                        FROM task_item t JOIN member m ON m.id = t.member_id
                        WHERE t.id = :id
                        RETURNING id
                        """)
                .param("id", ((Number) task.get("id")).longValue())
                .query(Long.class).single();
        db.sql("UPDATE member_group_assignment SET invite_task_id = :t WHERE id = :aid")
                .param("t", inviteTaskId).param("aid", assignmentId).update();
    }

    @Transactional
    public Map<String, Object> addEvidence(long id, String kind, String content) {
        db.sql("INSERT INTO task_evidence (task_id, kind, content) VALUES (:id, :kind, :content)")
                .param("id", id).param("kind", kind == null ? "备注" : kind).param("content", content)
                .update();
        return get(id);
    }

    private void requireTransition(String from, String to) {
        if (!TRANSITIONS.getOrDefault(from, Set.of()).contains(to)) {
            throw BusinessException.conflict("任务状态不允许从「" + from + "」迁移到「" + to + "」");
        }
    }

    private String operatorName() {
        var user = UserContext.getOrNull();
        return user != null ? user.displayName() : "系统";
    }
}
