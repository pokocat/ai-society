package com.fenglema.scp.identity;

import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 关系链服务。存储 = 物化路径（lv1/lv2/lv3_parent），对应本体 ReferralRelation 三公理：
 * ① 单推荐人（member_id 主键，一人一行）② 无环 ③ 深度 ≤3（更深的祖先不再记录，佣金/影响力只看三级内）。
 */
@Service
public class ReferralService {

    private final JdbcClient db;
    private final MemberService memberService;

    public ReferralService(JdbcClient db, MemberService memberService) {
        this.db = db;
        this.memberService = memberService;
    }

    @Transactional
    public Map<String, Object> bind(String memberNo, String referrerNo, String source, String inviteCode) {
        long memberId = memberService.idOf(memberNo);
        long referrerId = memberService.idOf(referrerNo);
        if (memberId == referrerId) {
            throw BusinessException.conflict("不能推荐自己");
        }
        // H2：锁定推荐人行，串行化「同一邀请码多个新号并发进线」——否则各事务都读到当日奖励未达上限、
        // 全部发奖，突破 invite_award_daily_cap（TOCTOU）。关系链绑定不受影响，仅串行化发奖判定（护栏 25）。
        db.sql("SELECT id FROM member WHERE id = :id FOR UPDATE").param("id", referrerId).query(Long.class).single();
        // 公理①：单推荐人
        boolean bound = !db.sql("SELECT 1 FROM referral_relation WHERE member_id = :id")
                .param("id", memberId).query(Rows.MAP).list().isEmpty();
        if (bound) {
            throw BusinessException.conflict("该会员已绑定推荐人，不可变更");
        }
        // 公理②：无环 —— 物化路径只存 3 级，深环会漏检，必须沿 referrer_id 递归上溯到根，
        // 途中出现 member 本人即成环（现存图无环，递归必然终止；再加 hop 上限兜底）。
        long cursor = referrerId;
        for (int hop = 0; hop < 10_000; hop++) {
            Long parent = db.sql("SELECT referrer_id FROM referral_relation WHERE member_id = :id")
                    .param("id", cursor).query(Long.class).optional().orElse(null);
            if (parent == null) {
                break;
            }
            if (parent == memberId) {
                throw BusinessException.conflict("推荐关系成环（对方在你的下级链上），拒绝绑定");
            }
            cursor = parent;
        }
        Map<String, Object> referrerPath = db.sql("SELECT lv1_parent, lv2_parent, lv3_parent FROM referral_relation WHERE member_id = :id")
                .param("id", referrerId).query(Rows.MAP).optional().orElse(Map.of());
        // 公理③：物化路径 = referrer + referrer 的前两级
        Long lv2 = referrerPath.get("lv1_parent") == null ? null : ((Number) referrerPath.get("lv1_parent")).longValue();
        Long lv3 = referrerPath.get("lv2_parent") == null ? null : ((Number) referrerPath.get("lv2_parent")).longValue();

        db.sql("""
                INSERT INTO referral_relation (member_id, referrer_id, lv1_parent, lv2_parent, lv3_parent, source, invite_code)
                VALUES (:m, :ref, :ref, :lv2, :lv3, :source, :code)
                """)
                .param("m", memberId).param("ref", referrerId)
                .param("lv2", lv2).param("lv3", lv3)
                .param("source", source).param("code", inviteCode)
                .update();

        // 归因日志 + 推荐人成长值（默认 +288，读规则表）
        db.sql("""
                INSERT INTO attribution_log (invite_code, source, new_member_id, referrer_member_id)
                VALUES (:code, :source, :m, :ref)
                """)
                .param("code", inviteCode).param("source", source == null ? "推广码" : source)
                .param("m", memberId).param("ref", referrerId)
                .update();
        // 裂变风控（上架审阅项）：奖励每日封顶（invite_award_daily_cap，护栏 23 规则外置）。
        // 关系链照常绑定（归因不受限），仅超限当日不再发成长值——防批量小号刷奖励。
        Map<String, Object> rule = db.sql(
                        "SELECT growth_points_per_invite, invite_award_daily_cap FROM resource_rules WHERE id = 1")
                .query(Rows.MAP).single();
        int growth = ((Number) rule.get("growth_points_per_invite")).intValue();
        int dailyCap = ((Number) rule.get("invite_award_daily_cap")).intValue();
        int awardedToday = db.sql("""
                        SELECT COUNT(*) FROM growth_ledger
                        WHERE member_id = :ref AND reason = '邀请成功' AND created_at >= date_trunc('day', now())
                        """)
                .param("ref", referrerId).query(Integer.class).single();
        boolean capped = awardedToday >= dailyCap;
        if (!capped) {
            db.sql("""
                    INSERT INTO growth_ledger (member_id, delta, reason, ref_type, ref_id)
                    VALUES (:ref, :delta, '邀请成功', 'member', :mNo)
                    """)
                    .param("ref", referrerId).param("delta", growth).param("mNo", memberNo)
                    .update();
        }
        memberService.appendTimeline(memberId, null, "关系绑定", "绑定推荐人 " + referrerNo, "系统");
        memberService.appendTimeline(referrerId, null, "邀请成功", capped
                ? "邀请 " + memberNo + " 成功（今日奖励已达上限 " + dailyCap + " 次，不再累计成长值）"
                : "邀请 " + memberNo + " 成功，+" + growth + " 成长值", "系统");
        return Map.of("memberNo", memberNo, "referrerNo", referrerNo, "growthAwarded", capped ? 0 : growth);
    }

    public Map<String, Object> chain(String memberNo) {
        long id = memberService.idOf(memberNo);
        Map<String, Object> result = new HashMap<>();
        result.put("upline", db.sql("""
                SELECT 1 AS level, m.member_no, m.name FROM referral_relation rr JOIN member m ON m.id = rr.lv1_parent WHERE rr.member_id = :id
                UNION ALL
                SELECT 2, m.member_no, m.name FROM referral_relation rr JOIN member m ON m.id = rr.lv2_parent WHERE rr.member_id = :id
                UNION ALL
                SELECT 3, m.member_no, m.name FROM referral_relation rr JOIN member m ON m.id = rr.lv3_parent WHERE rr.member_id = :id
                ORDER BY level
                """).param("id", id).query(Rows.MAP).list());
        result.put("downline", db.sql("""
                SELECT CASE WHEN rr.lv1_parent = :id THEN 1 WHEN rr.lv2_parent = :id THEN 2 ELSE 3 END AS level,
                       m.member_no, m.name, m.city,
                       (SELECT count(*) FROM referral_relation d WHERE d.lv1_parent = m.id) AS direct_downline,
                       rr.source, rr.bound_at
                FROM referral_relation rr JOIN member m ON m.id = rr.member_id
                WHERE (rr.lv1_parent = :id OR rr.lv2_parent = :id OR rr.lv3_parent = :id)
                  AND m.merged_into IS NULL
                ORDER BY level, rr.bound_at DESC
                """).param("id", id).query(Rows.MAP).list());
        result.put("influence", db.sql("""
                SELECT count(*) FROM referral_relation rr
                WHERE rr.lv1_parent = :id OR rr.lv2_parent = :id OR rr.lv3_parent = :id
                """).param("id", id).query(Long.class).single());
        return result;
    }

    /** 影响力矩阵：层级 × 身份 计数（跨项目取最高身份口径：任一项目身份计入）。 */
    public List<Map<String, Object>> influenceMatrix(String memberNo) {
        long id = memberService.idOf(memberNo);
        return db.sql("""
                SELECT CASE WHEN rr.lv1_parent = :id THEN 1 WHEN rr.lv2_parent = :id THEN 2 ELSE 3 END AS level,
                       COALESCE(mpi.identity, '游客') AS identity,
                       count(DISTINCT rr.member_id) AS cnt
                FROM referral_relation rr
                JOIN member m ON m.id = rr.member_id AND m.merged_into IS NULL
                LEFT JOIN member_project_identity mpi ON mpi.member_id = rr.member_id AND mpi.status IN ('有效','待分配')
                WHERE rr.lv1_parent = :id OR rr.lv2_parent = :id OR rr.lv3_parent = :id
                GROUP BY 1, 2
                ORDER BY 1, 2
                """).param("id", id).query(Rows.MAP).list();
    }
}
