package com.fenglema.scp.ops;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.identity.MemberService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.List;

/** 工单：SLA 按类型（技术故障2h/入群异常4h/账号问题·功能咨询12h/服务回访24h），剩余时长实时计算。 */
@RestController
@RequestMapping("/api/v1/tickets")
public class TicketController {

    static final Map<String, Integer> SLA_HOURS = Map.of(
            "技术故障", 2, "入群异常", 4, "退款跟进", 12, "账号问题", 12,
            "功能咨询", 12, "内容投诉", 12, "服务回访", 24);

    private final JdbcClient db;
    private final MemberService memberService;

    public TicketController(JdbcClient db, MemberService memberService) {
        this.db = db;
        this.memberService = memberService;
    }

    @GetMapping
    @Perm(module = "tickets")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(required = false) String status,
                                                       @RequestParam(required = false) String type) {
        return ApiResponse.ok(db.sql("""
                        SELECT t.*, m.member_no, m.name AS member_name, e.name AS assignee_name,
                               GREATEST(0, ROUND(EXTRACT(EPOCH FROM (t.created_at + make_interval(hours => t.sla_total_hours) - now())) / 3600, 1)) AS sla_remaining_hours
                        FROM ticket t
                        LEFT JOIN member m ON m.id = t.member_id
                        LEFT JOIN employee e ON e.id = t.assignee_employee_id
                        WHERE (:status IS NULL OR t.status = :status) AND (:type IS NULL OR t.ticket_type = :type)
                        ORDER BY t.status = '已解决', CASE t.priority WHEN '高' THEN 0 WHEN '中' THEN 1 ELSE 2 END, t.created_at
                        LIMIT 200
                        """)
                .param("status", status).param("type", type)
                .query(Rows.MAP).list());
    }

    public record CreateTicket(@NotBlank String ticketType, String memberNo, String projectId,
                               String city, String priority, String description) {
    }

    @PostMapping
    @Perm(module = "tickets", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> create(@RequestBody CreateTicket req) {
        Long memberId = req.memberNo() == null ? null : memberService.idOf(req.memberNo());
        String ticketNo = "TK" + System.currentTimeMillis();
        int sla = SLA_HOURS.getOrDefault(req.ticketType(), 12);
        Long id = db.sql("""
                        INSERT INTO ticket (ticket_no, ticket_type, member_id, project_id, city, priority, sla_total_hours, description)
                        VALUES (:no, :type, :mid, :pid, :city, COALESCE(:pri, '中'), :sla, :desc)
                        RETURNING id
                        """)
                .param("no", ticketNo).param("type", req.ticketType()).param("mid", memberId)
                .param("pid", req.projectId()).param("city", req.city()).param("pri", req.priority())
                .param("sla", sla).param("desc", req.description())
                .query(Long.class).single();
        return ApiResponse.ok(db.sql("SELECT * FROM ticket WHERE id = :id").param("id", id).query(Rows.MAP).single());
    }

    public record AssignTicket(Long assigneeEmployeeId) {
    }

    @PostMapping("/{id}/assign")
    @Perm(module = "tickets", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> assign(@PathVariable long id, @RequestBody AssignTicket req) {
        int updated = db.sql("""
                        UPDATE ticket SET assignee_employee_id = :emp, status = '进行中'
                        WHERE id = :id AND status <> '已解决'
                        """)
                .param("emp", req.assigneeEmployeeId()).param("id", id).update();
        if (updated == 0) {
            throw BusinessException.conflict("工单不存在或已解决");
        }
        return ApiResponse.ok(db.sql("SELECT * FROM ticket WHERE id = :id").param("id", id).query(Rows.MAP).single());
    }

    @PostMapping("/{id}/resolve")
    @Perm(module = "tickets", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> resolve(@PathVariable long id) {
        db.sql("UPDATE ticket SET status = '已解决', resolved_at = now() WHERE id = :id").param("id", id).update();
        return ApiResponse.ok(db.sql("SELECT * FROM ticket WHERE id = :id").param("id", id).query(Rows.MAP).single());
    }

    @PostMapping("/{id}/escalate")
    @Perm(module = "tickets", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> escalate(@PathVariable long id) {
        db.sql("UPDATE ticket SET priority = '高' WHERE id = :id").param("id", id).update();
        return ApiResponse.ok(db.sql("SELECT * FROM ticket WHERE id = :id").param("id", id).query(Rows.MAP).single());
    }
}
