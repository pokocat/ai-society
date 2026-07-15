package com.fenglema.scp.governance;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Json;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.Rows;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** 风险中心（SPEC §12）：八类异常统一入口，可转任务或审批。 */
@RestController
@RequestMapping("/api/v1/risk-events")
public class RiskController {

    private final JdbcClient db;

    public RiskController(JdbcClient db) {
        this.db = db;
    }

    @GetMapping
    @Perm(module = "risk")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(required = false) String status,
                                                       @RequestParam(required = false) String level) {
        return ApiResponse.ok(db.sql("""
                        SELECT * FROM risk_event
                        WHERE (CAST(:status AS text) IS NULL OR status = :status)
                          AND (CAST(:level AS text) IS NULL OR level = :level)
                        ORDER BY CASE level WHEN '高' THEN 0 WHEN '中' THEN 1 ELSE 2 END, created_at DESC
                        LIMIT 200
                        """)
                .param("status", status).param("level", level)
                .query(Rows.MAP).list());
    }

    public record ConvertRequest(String target) { // task | approval
    }

    @PostMapping("/{id}/convert")
    @Perm(module = "risk", action = Perm.Action.EDIT)
    @Transactional
    public ApiResponse<Map<String, Object>> convert(@PathVariable long id, @RequestBody ConvertRequest req) {
        Map<String, Object> risk = db.sql("SELECT * FROM risk_event WHERE id = :id FOR UPDATE")
                .param("id", id).query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("风险事件"));
        if ("task".equals(req.target())) {
            Long taskId = db.sql("""
                            INSERT INTO task_item (task_type, title, project_id, priority, status, due_at)
                            VALUES ('配置整改', :title, :pid, '高', '待领取', COALESCE(CAST(:due AS timestamptz), now() + interval '48 hours'))
                            RETURNING id
                            """)
                    .param("title", "风险整改：" + risk.get("title"))
                    .param("pid", risk.get("project_id"))
                    .param("due", risk.get("due_at") == null ? null : risk.get("due_at").toString())
                    .query(Long.class).single();
            db.sql("UPDATE risk_event SET converted_task_id = :t, status = '处理中' WHERE id = :id")
                    .param("t", taskId).param("id", id).update();
            return ApiResponse.ok(Map.of("riskId", id, "taskId", taskId));
        }
        if ("approval".equals(req.target())) {
            Long approvalId = db.sql("""
                            INSERT INTO approval (approval_type, title, submitter, urgent, detail)
                            VALUES ('风险处置', :title, '风险中心', TRUE, CAST(:detail AS jsonb))
                            RETURNING id
                            """)
                    .param("title", "风险处置审批：" + risk.get("title"))
                    .param("detail", Json.obj("riskId", id, "类型", risk.get("risk_type")))
                    .query(Long.class).single();
            db.sql("UPDATE risk_event SET converted_approval_id = :a, status = '处理中' WHERE id = :id")
                    .param("a", approvalId).param("id", id).update();
            return ApiResponse.ok(Map.of("riskId", id, "approvalId", approvalId));
        }
        throw new BusinessException("target 只支持 task 或 approval");
    }

    public record ResolveRequest(String resolution) {
    }

    @PostMapping("/{id}/resolve")
    @Perm(module = "risk", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> resolve(@PathVariable long id, @RequestBody ResolveRequest req) {
        db.sql("UPDATE risk_event SET status = '已解决', resolution = :r, resolved_at = now() WHERE id = :id")
                .param("r", req.resolution()).param("id", id).update();
        return ApiResponse.ok(db.sql("SELECT * FROM risk_event WHERE id = :id").param("id", id).query(Rows.MAP).single());
    }
}
