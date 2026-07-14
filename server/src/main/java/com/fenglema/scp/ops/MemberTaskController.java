package com.fenglema.scp.ops;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.identity.MemberService;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** 会员端任务（小程序任务 Tab 数据源）：完成得积分，写积分账本。 */
@RestController
@RequestMapping("/api/v1/member-tasks")
public class MemberTaskController {

    private final JdbcClient db;
    private final MemberService memberService;

    public MemberTaskController(JdbcClient db, MemberService memberService) {
        this.db = db;
        this.memberService = memberService;
    }

    @GetMapping
    @Perm(module = "users")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam String memberNo) {
        long memberId = memberService.idOf(memberNo);
        return ApiResponse.ok(db.sql("SELECT * FROM member_task WHERE member_id = :mid ORDER BY done, created_at")
                .param("mid", memberId).query(Rows.MAP).list());
    }

    @PostMapping("/{id}/complete")
    @Perm(module = "users", action = Perm.Action.EDIT)
    @Transactional
    public ApiResponse<Map<String, Object>> complete(@PathVariable long id) {
        Map<String, Object> task = db.sql("SELECT * FROM member_task WHERE id = :id FOR UPDATE")
                .param("id", id).query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("任务"));
        if (Boolean.TRUE.equals(task.get("done"))) {
            throw BusinessException.conflict("任务已完成");
        }
        db.sql("UPDATE member_task SET done = TRUE, completed_at = now() WHERE id = :id").param("id", id).update();
        long memberId = ((Number) task.get("member_id")).longValue();
        int points = ((Number) task.get("points")).intValue();
        if (points > 0) {
            db.sql("""
                    INSERT INTO points_ledger (member_id, delta, reason, ref_type, ref_id)
                    VALUES (:mid, :points, :reason, 'member_task', :tid)
                    """)
                    .param("mid", memberId).param("points", points)
                    .param("reason", "完成任务：" + task.get("title")).param("tid", String.valueOf(id))
                    .update();
        }
        Long balance = db.sql("SELECT COALESCE(SUM(delta),0) FROM points_ledger WHERE member_id = :mid")
                .param("mid", memberId).query(Long.class).single();
        return ApiResponse.ok(Map.of("taskId", id, "pointsAwarded", points, "pointsBalance", balance));
    }
}
