package com.fenglema.scp.ops;

import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 会员任务（打卡得积分）：运营端与小程序端共用。
 * 小程序侧必须传 requiredMemberId 做归属校验（SELF 范围横向越权兜底）；运营端传 null。
 */
@Service
public class MemberTaskService {

    private final JdbcClient db;

    public MemberTaskService(JdbcClient db) {
        this.db = db;
    }

    public List<Map<String, Object>> list(long memberId) {
        return db.sql("SELECT * FROM member_task WHERE member_id = :mid ORDER BY done, created_at")
                .param("mid", memberId).query(Rows.MAP).list();
    }

    /** 完成任务：行锁防重复完成，写积分账本，返回获得积分与最新余额。 */
    @Transactional
    public Map<String, Object> complete(long taskId, Long requiredMemberId) {
        Map<String, Object> task = db.sql("SELECT * FROM member_task WHERE id = :id FOR UPDATE")
                .param("id", taskId).query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("任务"));
        long ownerId = ((Number) task.get("member_id")).longValue();
        if (requiredMemberId != null && ownerId != requiredMemberId) {
            throw BusinessException.forbidden("无权操作其他会员的任务");
        }
        if (Boolean.TRUE.equals(task.get("done"))) {
            throw BusinessException.conflict("任务已完成");
        }
        db.sql("UPDATE member_task SET done = TRUE, completed_at = now() WHERE id = :id")
                .param("id", taskId).update();
        int points = ((Number) task.get("points")).intValue();
        if (points > 0) {
            db.sql("""
                    INSERT INTO points_ledger (member_id, delta, reason, ref_type, ref_id)
                    VALUES (:mid, :points, :reason, 'member_task', :tid)
                    """)
                    .param("mid", ownerId).param("points", points)
                    .param("reason", "完成任务：" + task.get("title")).param("tid", String.valueOf(taskId))
                    .update();
        }
        Long balance = db.sql("SELECT COALESCE(SUM(delta),0) FROM points_ledger WHERE member_id = :mid")
                .param("mid", ownerId).query(Long.class).single();
        return Map.of("taskId", taskId, "pointsAwarded", points, "pointsBalance", balance);
    }
}
