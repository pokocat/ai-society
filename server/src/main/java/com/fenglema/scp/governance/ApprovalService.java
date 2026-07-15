package com.fenglema.scp.governance;

import com.fenglema.scp.assignment.AssignmentService;
import com.fenglema.scp.common.AuditService;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.common.UserContext;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 审批中心（SPEC §11.2）：清单驱动 + 「审批单→回调执行器」模式——业务动作在审批通过后才执行，
 * 保证高风险操作可控、可查、可追责。
 */
@Service
public class ApprovalService {

    private final JdbcClient db;
    private final AssignmentService assignmentService;
    private final AuditService audit;

    public ApprovalService(JdbcClient db, AssignmentService assignmentService, AuditService audit) {
        this.db = db;
        this.assignmentService = assignmentService;
        this.audit = audit;
    }

    public List<Map<String, Object>> list(String type, String status) {
        return db.sql("""
                SELECT * FROM approval
                WHERE (CAST(:type AS text) IS NULL OR approval_type = :type)
                  AND (CAST(:status AS text) IS NULL OR status = :status)
                ORDER BY urgent DESC, created_at DESC LIMIT 200
                """)
                .param("type", type).param("status", status)
                .query(Rows.MAP).list();
    }

    public Map<String, Object> get(long id) {
        Map<String, Object> approval = new HashMap<>(db.sql("SELECT * FROM approval WHERE id = :id")
                .param("id", id).query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("审批单")));
        approval.put("history", db.sql("SELECT * FROM approval_history WHERE approval_id = :id ORDER BY created_at")
                .param("id", id).query(Rows.MAP).list());
        return approval;
    }

    @Transactional
    public Map<String, Object> decide(long id, boolean approve, String comment) {
        Map<String, Object> approval = db.sql("SELECT * FROM approval WHERE id = :id FOR UPDATE")
                .param("id", id).query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("审批单"));
        String status = (String) approval.get("status");
        if (!"待审批".equals(status) && !"审批中".equals(status)) {
            throw BusinessException.conflict("审批单已终结（" + status + "）");
        }
        String decision = approve ? "已同意" : "已拒绝";
        String actor = operatorName();
        db.sql("""
                UPDATE approval SET status = :s, decided_by = :by, decision_comment = :comment, decided_at = now()
                WHERE id = :id
                """)
                .param("s", decision).param("by", actor).param("comment", comment).param("id", id)
                .update();
        db.sql("INSERT INTO approval_history (approval_id, actor, action, comment) VALUES (:id, :actor, :action, :comment)")
                .param("id", id).param("actor", actor).param("action", approve ? "同意" : "拒绝").param("comment", comment)
                .update();

        // 回调执行器：审批通过才执行业务动作
        String callbackType = (String) approval.get("callback_type");
        String callbackRef = (String) approval.get("callback_ref");
        if (callbackType != null && callbackRef != null) {
            switch (callbackType) {
                case "WITHDRAWAL" -> onWithdrawalDecision(Long.parseLong(callbackRef), approve);
                case "OVERRIDE_ASSIGN" -> onOverrideAssignDecision(Long.parseLong(callbackRef), approve);
                case "HANDOVER" -> onHandoverDecision(Long.parseLong(callbackRef), approve);
                case "RESOURCE_PUBLISH" -> onResourcePublishDecision(Long.parseLong(callbackRef), approve);
                default -> { /* 无回调的审批仅作记录 */ }
            }
        }
        audit.log("approval", String.valueOf(id), approve ? "审批同意" : "审批拒绝",
                Map.of("status", status), Map.of("status", decision), (String) approval.get("project_id"), comment, id);
        return get(id);
    }

    /** 提现：同意→已打款（外部系统回执 Mock）；拒绝→已拒绝（余额不动，由外部系统口径）。 */
    private void onWithdrawalDecision(long withdrawalId, boolean approve) {
        if (approve) {
            db.sql("""
                    UPDATE withdrawal_request SET status = '已打款', decided_at = now(),
                           external_payout_ref = 'MOCK-PAYOUT-' || id
                    WHERE id = :id AND status = '待审核'
                    """)
                    .param("id", withdrawalId).update();
            // 只读镜像联动：可提余额减少（真实场景由外部系统回推同步）
            db.sql("""
                    UPDATE earnings_snapshot es SET withdrawable = withdrawable - w.amount, synced_at = now()
                    FROM withdrawal_request w
                    WHERE w.id = :id AND es.member_id = w.member_id AND es.project_id IS NULL
                    """)
                    .param("id", withdrawalId).update();
        } else {
            db.sql("UPDATE withdrawal_request SET status = '已拒绝', decided_at = now() WHERE id = :id AND status = '待审核'")
                    .param("id", withdrawalId).update();
        }
    }

    /** 超容量分配覆盖：同意→执行(预占+建任务+推进,见 executeApprovedOverride)；拒绝→人工取消。 */
    private void onOverrideAssignDecision(long assignmentId, boolean approve) {
        if (approve) {
            // 审批通过 → 补齐 confirm 省略的预占与建任务(容量已被审批覆盖),否则分配无任务可回填而永久卡死
            assignmentService.executeApprovedOverride(assignmentId);
        } else {
            assignmentService.transition(assignmentId, "待确认", "人工取消", "超容量分配审批被拒绝");
        }
    }

    /** 账号交接：同意→交接完成，账号回使用中并换保管人；拒绝→取消交接。 */
    private void onHandoverDecision(long handoverId, boolean approve) {
        Map<String, Object> handover = db.sql("SELECT * FROM account_handover WHERE id = :id FOR UPDATE")
                .param("id", handoverId).query(Rows.MAP).single();
        String accountId = (String) handover.get("account_id");
        if (approve) {
            db.sql("UPDATE account_handover SET status = '已完成', completed_at = now() WHERE id = :id")
                    .param("id", handoverId).update();
            db.sql("""
                    UPDATE account SET custodian_employee_id = :to, user_employee_id = :to,
                           status = '使用中', updated_at = now()
                    WHERE id = :aid
                    """)
                    .param("to", handover.get("to_employee_id")).param("aid", accountId)
                    .update();
        } else {
            db.sql("UPDATE account_handover SET status = '已取消' WHERE id = :id").param("id", handoverId).update();
            db.sql("UPDATE account SET status = '使用中', updated_at = now() WHERE id = :aid")
                    .param("aid", accountId).update();
        }
    }

    /** 资源方案发布：同意→版本置 published 并更新项目生效指针。 */
    private void onResourcePublishDecision(long versionId, boolean approve) {
        if (!approve) {
            db.sql("UPDATE project_resource_version SET status = 'validated' WHERE id = :id")
                    .param("id", versionId).update();
            return;
        }
        db.sql("UPDATE project_resource_version SET status = 'published', published_at = now() WHERE id = :id")
                .param("id", versionId).update();
        db.sql("""
                UPDATE project p SET active_resource_version_id = :id, updated_at = now()
                FROM project_resource_version v WHERE v.id = :id AND p.id = v.project_id
                """)
                .param("id", versionId).update();
    }

    private String operatorName() {
        var user = UserContext.getOrNull();
        return user != null ? user.displayName() : "系统";
    }
}
