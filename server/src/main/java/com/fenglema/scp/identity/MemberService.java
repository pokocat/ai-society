package com.fenglema.scp.identity;

import com.fenglema.scp.common.AuditService;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MemberService {

    /** 并档优先级（§5.5）：数值越小越强。 */
    static final Map<String, Integer> MERGE_PRIORITY = Map.of(
            "unionid", 1, "手机号", 2, "企微external_userid", 3, "个微号", 4, "订单用户ID", 5, "报名ID", 6);

    private final JdbcClient db;
    private final AuditService audit;

    public MemberService(JdbcClient db, AuditService audit) {
        this.db = db;
        this.audit = audit;
    }

    public long idOf(String memberNo) {
        return db.sql("SELECT id FROM member WHERE member_no = :no AND merged_into IS NULL")
                .param("no", memberNo)
                .query(Long.class).optional()
                .orElseThrow(() -> BusinessException.notFound("会员 " + memberNo));
    }

    public List<Map<String, Object>> list(String projectId, String identity, String keyword) {
        return db.sql("""
                SELECT m.*,
                       (SELECT json_agg(json_build_object('projectId', mpi.project_id, 'identity', mpi.identity,
                                                          'stage', mpi.stage, 'status', mpi.status))
                          FROM member_project_identity mpi WHERE mpi.member_id = m.id) AS project_identities,
                       rr.lv1_parent, ref.member_no AS referrer_no, ref.name AS referrer_name
                FROM member m
                LEFT JOIN referral_relation rr ON rr.member_id = m.id
                LEFT JOIN member ref ON ref.id = rr.referrer_id
                WHERE m.merged_into IS NULL
                  AND (:kw IS NULL OR m.name ILIKE '%' || :kw || '%' OR m.phone LIKE '%' || :kw || '%' OR m.member_no ILIKE '%' || :kw || '%')
                  AND (:pid IS NULL OR EXISTS (SELECT 1 FROM member_project_identity mpi
                        WHERE mpi.member_id = m.id AND mpi.project_id = :pid))
                  AND (:identity IS NULL OR EXISTS (SELECT 1 FROM member_project_identity mpi
                        WHERE mpi.member_id = m.id AND mpi.identity = :identity))
                ORDER BY m.id
                """)
                .param("kw", keyword).param("pid", projectId).param("identity", identity)
                .query(Rows.MAP).list();
    }

    /** 统一会员档案聚合（SPEC §10 八块）。 */
    public Map<String, Object> profile(String memberNo) {
        long id = idOf(memberNo);
        Map<String, Object> profile = new HashMap<>(
                db.sql("SELECT * FROM member WHERE id = :id").param("id", id).query(Rows.MAP).single());
        profile.put("identifiers", db.sql("SELECT id_type, id_value, source_system FROM member_identifier WHERE member_id = :id")
                .param("id", id).query(Rows.MAP).list());
        profile.put("projectIdentities", db.sql("""
                SELECT mpi.*, p.name AS project_name, p.short_name FROM member_project_identity mpi
                JOIN project p ON p.id = mpi.project_id WHERE mpi.member_id = :id
                """).param("id", id).query(Rows.MAP).list());
        profile.put("groups", db.sql("""
                SELECT a.group_id, g.name AS group_name, a.status, a.joined_at, a.personal_wechat_id
                FROM member_group_assignment a JOIN community_group g ON g.id = a.group_id
                WHERE a.member_id = :id ORDER BY a.created_at DESC
                """).param("id", id).query(Rows.MAP).list());
        profile.put("wechatRelations", db.sql("""
                SELECT r.*, a.name AS account_name FROM member_wechat_relation r
                JOIN account a ON a.id = r.account_id WHERE r.member_id = :id
                """).param("id", id).query(Rows.MAP).list());
        profile.put("orders", db.sql("SELECT * FROM order_reference WHERE member_id = :id ORDER BY external_time DESC")
                .param("id", id).query(Rows.MAP).list());
        profile.put("followUps", db.sql("SELECT * FROM follow_up WHERE member_id = :id ORDER BY created_at DESC LIMIT 10")
                .param("id", id).query(Rows.MAP).list());
        profile.put("referral", db.sql("""
                SELECT rr.*, r1.member_no AS lv1_no, r1.name AS lv1_name
                FROM referral_relation rr LEFT JOIN member r1 ON r1.id = rr.lv1_parent
                WHERE rr.member_id = :id
                """).param("id", id).query(Rows.MAP).optional().orElse(null));
        profile.put("points", db.sql("SELECT COALESCE(SUM(delta),0) FROM points_ledger WHERE member_id = :id")
                .param("id", id).query(Long.class).single());
        profile.put("growth", db.sql("SELECT COALESCE(SUM(delta),0) FROM growth_ledger WHERE member_id = :id")
                .param("id", id).query(Long.class).single());
        return profile;
    }

    public List<Map<String, Object>> timeline(String memberNo) {
        long id = idOf(memberNo);
        return db.sql("SELECT * FROM member_timeline WHERE member_id = :id ORDER BY occurred_at DESC LIMIT 100")
                .param("id", id).query(Rows.MAP).list();
    }

    public void appendTimeline(long memberId, String projectId, String eventType, String title, String operator) {
        db.sql("""
                INSERT INTO member_timeline (member_id, project_id, event_type, title, operator)
                VALUES (:mid, :pid, :type, :title, :op)
                """)
                .param("mid", memberId).param("pid", projectId)
                .param("type", eventType).param("title", title).param("op", operator)
                .update();
    }

    /**
     * 身份并档：新标识命中其他会员 → 高优先级标识触发自动合并，低优先级进人工冲突队列（§5.5）。
     */
    @Transactional
    public Map<String, Object> addIdentifier(String memberNo, String idType, String idValue, String sourceSystem) {
        long memberId = idOf(memberNo);
        if (!MERGE_PRIORITY.containsKey(idType)) {
            throw new BusinessException("不支持的标识类型：" + idType);
        }
        Long existingOwner = db.sql("""
                        SELECT m.id FROM member_identifier mi JOIN member m ON m.id = mi.member_id
                        WHERE mi.id_type = :t AND mi.id_value = :v AND m.merged_into IS NULL
                        """)
                .param("t", idType).param("v", idValue)
                .query(Long.class).optional().orElse(null);

        if (existingOwner == null) {
            db.sql("INSERT INTO member_identifier (member_id, id_type, id_value, source_system) VALUES (:m, :t, :v, :s)")
                    .param("m", memberId).param("t", idType).param("v", idValue).param("s", sourceSystem)
                    .update();
            return Map.of("result", "已登记", "memberNo", memberNo);
        }
        if (existingOwner == memberId) {
            return Map.of("result", "已存在", "memberNo", memberNo);
        }
        // 命中他人：unionid/手机号 视为强标识自动合并，其余进人工核对
        if (MERGE_PRIORITY.get(idType) <= 2) {
            return merge(memberId, existingOwner, idType + "=" + idValue);
        }
        db.sql("""
                INSERT INTO member_merge_conflict (member_a, member_b, conflict_on)
                VALUES (:a, :b, :on)
                """)
                .param("a", memberId).param("b", existingOwner).param("on", idType + "=" + idValue)
                .update();
        return Map.of("result", "冲突待人工核对", "memberNo", memberNo);
    }

    /** 合并：保留较早建档者为主档，标识/身份/关系迁移，留可回滚快照（SPEC §16-1）。 */
    @Transactional
    public Map<String, Object> merge(long a, long b, String matchedOn) {
        long winner = Math.min(a, b);
        long loser = Math.max(a, b);
        db.sql("""
                INSERT INTO member_merge_log (winner_id, loser_id, matched_on, reversible_snapshot, operator)
                VALUES (:w, :l, :on, (SELECT to_jsonb(m) FROM member m WHERE m.id = :l), :op)
                """)
                .param("w", winner).param("l", loser).param("on", matchedOn)
                .param("op", "系统").update();
        db.sql("UPDATE member_identifier SET member_id = :w WHERE member_id = :l")
                .param("w", winner).param("l", loser).update();
        db.sql("""
                UPDATE member_project_identity SET member_id = :w WHERE member_id = :l
                  AND NOT EXISTS (SELECT 1 FROM member_project_identity x
                                  WHERE x.member_id = :w AND x.project_id = member_project_identity.project_id)
                """)
                .param("w", winner).param("l", loser).update();
        db.sql("UPDATE member_timeline SET member_id = :w WHERE member_id = :l").param("w", winner).param("l", loser).update();
        db.sql("UPDATE member SET merged_into = :w, updated_at = now() WHERE id = :l").param("w", winner).param("l", loser).update();
        String winnerNo = db.sql("SELECT member_no FROM member WHERE id = :id").param("id", winner).query(String.class).single();
        appendTimeline(winner, null, "合并", "统一会员合并（命中 " + matchedOn + "）", "系统");
        audit.log("member", winnerNo, "统一会员合并", Map.of("loserId", loser), Map.of("winnerId", winner), null, matchedOn, null);
        return Map.of("result", "已合并", "memberNo", winnerNo);
    }
}
