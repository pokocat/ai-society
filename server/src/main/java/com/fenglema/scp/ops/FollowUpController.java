package com.fenglema.scp.ops;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.common.UserContext;
import com.fenglema.scp.identity.MemberService;
import jakarta.validation.constraints.NotBlank;
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

/** 回访（SPEC §6.8/§16-6）：完成必写会员档案时间线，按开关回写来源项目。 */
@RestController
@RequestMapping("/api/v1/followups")
public class FollowUpController {

    private final JdbcClient db;
    private final MemberService memberService;

    public FollowUpController(JdbcClient db, MemberService memberService) {
        this.db = db;
        this.memberService = memberService;
    }

    @GetMapping
    @Perm(module = "users")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(required = false) String queue,
                                                       @RequestParam(required = false) String projectId) {
        return ApiResponse.ok(db.sql("""
                        SELECT f.*, m.member_no, m.name AS member_name
                        FROM follow_up f JOIN member m ON m.id = f.member_id
                        WHERE (:q IS NULL OR f.queue = :q) AND (:pid IS NULL OR f.project_id = :pid)
                        ORDER BY f.done, CASE f.priority WHEN '非常重要' THEN 0 WHEN '重要' THEN 1 ELSE 2 END, f.created_at DESC
                        LIMIT 200
                        """)
                .param("q", queue).param("pid", projectId)
                .query(Rows.MAP).list());
    }

    public record CreateFollowUp(@NotBlank String memberNo, String projectId, @NotBlank String category,
                                 String priority, String content, String assignee, String remindAt,
                                 Boolean writeBack, String queue) {
    }

    @PostMapping
    @Perm(module = "users", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> create(@RequestBody CreateFollowUp req) {
        long memberId = memberService.idOf(req.memberNo());
        Long id = db.sql("""
                        INSERT INTO follow_up (member_id, project_id, category, priority, queue, content, assignee,
                                               remind_at, write_back, created_by)
                        VALUES (:mid, :pid, :cat, COALESCE(:pri, '一般'), COALESCE(:queue, '待处理'), :content, :assignee,
                                CAST(:remind AS timestamptz), COALESCE(:wb, TRUE), :by)
                        RETURNING id
                        """)
                .param("mid", memberId).param("pid", req.projectId()).param("cat", req.category())
                .param("pri", req.priority()).param("queue", req.queue()).param("content", req.content())
                .param("assignee", req.assignee()).param("remind", req.remindAt())
                .param("wb", req.writeBack()).param("by", operatorName())
                .query(Long.class).single();
        return ApiResponse.ok(db.sql("SELECT * FROM follow_up WHERE id = :id").param("id", id).query(Rows.MAP).single());
    }

    public record CompleteFollowUp(String resultNote) {
    }

    @PostMapping("/{id}/complete")
    @Perm(module = "users", action = Perm.Action.EDIT)
    @Transactional
    public ApiResponse<Map<String, Object>> complete(@PathVariable long id, @RequestBody CompleteFollowUp req) {
        Map<String, Object> followUp = db.sql("SELECT * FROM follow_up WHERE id = :id FOR UPDATE")
                .param("id", id).query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("回访任务"));
        if (Boolean.TRUE.equals(followUp.get("done"))) {
            throw BusinessException.conflict("回访已完成");
        }
        db.sql("""
                UPDATE follow_up SET done = TRUE, queue = '我回访的', result_note = :note, completed_at = now()
                WHERE id = :id
                """)
                .param("note", req.resultNote()).param("id", id).update();
        long memberId = ((Number) followUp.get("member_id")).longValue();
        // 已写入统一档案（SPEC §16-6：时间线含操作人与时间）
        memberService.appendTimeline(memberId, (String) followUp.get("project_id"), "回访",
                "完成回访（" + followUp.get("category") + "）：" + (req.resultNote() == null ? "" : req.resultNote()),
                operatorName());
        return ApiResponse.ok(db.sql("SELECT * FROM follow_up WHERE id = :id").param("id", id).query(Rows.MAP).single());
    }

    private String operatorName() {
        var user = UserContext.getOrNull();
        return user != null ? user.displayName() : "系统";
    }
}
