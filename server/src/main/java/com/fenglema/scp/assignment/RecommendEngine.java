package com.fenglema.scp.assignment;

import com.fenglema.scp.common.Rows;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 分群推荐引擎（SPEC §7.3 五级优先级，确定性算法）：
 * 1 硬性准入（SQL 过滤）→ 2 业务匹配 → 3 负载均衡 → 4 连续服务 → 5 运营策略（评分加权）。
 * 权重与阈值全部读 resource_rules，可在线调整。
 */
@Component
public class RecommendEngine {

    private final JdbcClient db;

    public RecommendEngine(JdbcClient db) {
        this.db = db;
    }

    public record Candidate(String groupId, String groupName, double score, List<String> hitRules,
                            List<String> riskHints, String personalWechatId, int memberCount, int targetCapacity,
                            int matchTier) {
    }

    /** 身份 → 目标群类型（业务匹配层）。 */
    static String matchGroupType(String identity) {
        return switch (identity == null ? "" : identity) {
            case "PRO会员" -> "PRO会员群";
            case "体验官", "学员" -> "体验官群";
            case "游客" -> "游客群";
            case "尊享官", "黑金", "VIP" -> "尊享群";
            case "代理", "城市合伙人", "运营商" -> "分站管理群";
            default -> "游客群";
        };
    }

    public List<Candidate> recommend(long memberId, String projectId) {
        Map<String, Object> rules = db.sql("SELECT * FROM resource_rules WHERE id = 1").query(Rows.MAP).single();
        Map<String, Object> member = db.sql("""
                        SELECT m.*, mpi.identity FROM member m
                        LEFT JOIN member_project_identity mpi ON mpi.member_id = m.id AND mpi.project_id = :pid
                        WHERE m.id = :id
                        """)
                .param("id", memberId).param("pid", projectId)
                .query(Rows.MAP).single();
        String identity = (String) member.get("identity");
        String city = (String) member.get("city");
        String wantedType = matchGroupType(identity);

        int maxGroups = ((Number) rules.get("max_groups_per_wechat")).intValue();
        int hardFriends = ((Number) rules.get("hard_friends")).intValue();
        int warnFriends = ((Number) rules.get("warn_friends")).intValue();
        double warnRatio = ((Number) rules.get("capacity_warn_ratio")).doubleValue();
        double depressAt = ((Number) rules.get("fill_rate_depress")).doubleValue();
        double wCapacity = ((Number) rules.get("w_capacity")).doubleValue();
        double wLoad = ((Number) rules.get("w_wechat_load")).doubleValue();
        double wCont = ((Number) rules.get("w_continuity")).doubleValue();
        double wStrat = ((Number) rules.get("w_strategy")).doubleValue();

        // ── 第 1 级：硬性准入（项目 / 群状态 / 编组完备 / 账号状态 / 剩余容量含预占 / 个微硬上限）──
        List<Map<String, Object>> groups = db.sql("""
                SELECT g.id, g.name, g.group_type, g.city, g.member_count, g.target_capacity,
                       pcs.account_id AS personal_wechat_id,
                       pa.status AS wechat_status, pa.friend_count, pa.serving_group_count,
                       (SELECT count(*) FROM capacity_reservation r
                          WHERE r.target_type = '群容量' AND r.target_id = g.id
                            AND r.status = '生效' AND r.expires_at > now()) AS reserved,
                       EXISTS (SELECT 1 FROM member_wechat_relation w
                          WHERE w.member_id = :mid AND w.account_id = pcs.account_id AND w.relation = '好友') AS is_friend,
                       EXISTS (SELECT 1 FROM member_group_assignment ra
                          JOIN referral_relation rr ON rr.lv1_parent = ra.member_id
                          WHERE rr.member_id = :mid AND ra.group_id = g.id AND ra.status = '已入群') AS referrer_in_group
                FROM community_group g
                JOIN group_staffing ecs ON ecs.group_id = g.id AND ecs.role = '企微客服' AND ecs.is_primary
                JOIN group_staffing pcs ON pcs.group_id = g.id AND pcs.role = '个微客服' AND pcs.is_primary
                JOIN account pa ON pa.id = pcs.account_id
                WHERE g.project_id = :pid
                  AND g.builder_account_id IS NOT NULL
                  AND g.status IN ('可承接','服务中','容量预警')
                  AND pa.status IN ('使用中','可用')
                  AND g.member_count + (SELECT count(*) FROM capacity_reservation r
                          WHERE r.target_type = '群容量' AND r.target_id = g.id
                            AND r.status = '生效' AND r.expires_at > now()) < g.target_capacity
                  AND pa.friend_count < :hardFriends
                  AND pa.serving_group_count <= :maxGroups
                  AND NOT EXISTS (SELECT 1 FROM member_group_assignment a
                          WHERE a.member_id = :mid AND a.group_id = g.id AND a.status = '已入群')
                """)
                .param("pid", projectId).param("mid", memberId)
                .param("hardFriends", hardFriends).param("maxGroups", maxGroups)
                .query(Rows.MAP).list();

        List<Candidate> candidates = new ArrayList<>();
        for (Map<String, Object> g : groups) {
            List<String> hits = new ArrayList<>();
            List<String> risks = new ArrayList<>();
            hits.add("硬性准入：项目/群状态/编组/账号/容量均通过");

            int memberCount = ((Number) g.get("member_count")).intValue();
            int reserved = ((Number) g.get("reserved")).intValue();
            int capacity = ((Number) g.get("target_capacity")).intValue();
            double fillRate = (memberCount + reserved) / (double) capacity;

            // ── 第 2 级：业务匹配 ──
            boolean typeMatch = wantedType.equals(g.get("group_type"));
            boolean cityMatch = city != null && city.equals(g.get("city"));
            if (typeMatch) hits.add("身份匹配：" + identity + "→" + g.get("group_type"));
            if (cityMatch) hits.add("城市匹配：" + city);

            // ── 第 3 级：负载均衡 ──
            double capacityScore = 1 - fillRate;
            int friends = ((Number) g.get("friend_count")).intValue();
            int servingGroups = ((Number) g.get("serving_group_count")).intValue();
            double loadScore = (1 - servingGroups / (double) maxGroups) * 0.5
                    + (friends >= warnFriends ? 0 : (1 - friends / (double) warnFriends)) * 0.5;
            if (friends >= warnFriends) {
                risks.add("个微好友 " + friends + " 已达预警线 " + warnFriends + "，降低推荐权重");
            }
            if (fillRate >= warnRatio) {
                risks.add("群占用 " + Math.round(fillRate * 100) + "% 接近容量上限");
            }

            // ── 第 4 级：连续服务 ──
            boolean isFriend = Boolean.TRUE.equals(g.get("is_friend"));
            boolean referrerInGroup = Boolean.TRUE.equals(g.get("referrer_in_group"));
            double contScore = (isFriend ? 1 : 0) * 0.7 + (referrerInGroup ? 1 : 0) * 0.3;
            if (isFriend) hits.add("连续服务：已是个微客服好友，可直接邀请");
            if (referrerInGroup) hits.add("连续服务：推荐人已在群内");

            // ── 第 5 级：运营策略（业务匹配作为策略加分项）──
            double strategyScore = (typeMatch ? 0.7 : 0) + (cityMatch ? 0.3 : 0);
            if (!typeMatch) risks.add("群类型与身份不完全匹配（" + wantedType + " 优先）");

            double total = wCapacity * capacityScore + wLoad * loadScore + wCont * contScore + wStrat * strategyScore;
            if (fillRate >= depressAt) {
                total *= 0.5;
                risks.add("填充率≥" + Math.round(depressAt * 100) + "%，已降权");
            }
            candidates.add(new Candidate((String) g.get("id"), (String) g.get("name"),
                    Math.round(total * 100) / 100.0, hits, risks,
                    (String) g.get("personal_wechat_id"), memberCount, capacity,
                    (typeMatch ? 2 : 0) + (cityMatch ? 1 : 0)));
        }
        // 排序按 SPEC §7.3 优先级字典序：第 2 级业务匹配（身份>城市）优先于第 3/4/5 级评分——
        // 身份+城市匹配的群永远排在仅部分匹配/不匹配的群之前，评分只在同档位内比较。
        candidates.sort((a, b) -> a.matchTier() != b.matchTier()
                ? Integer.compare(b.matchTier(), a.matchTier())
                : Double.compare(b.score(), a.score()));
        return candidates;
    }

    /** 便于外部拿到结构化输出。 */
    public Map<String, Object> recommendPayload(long memberId, String projectId) {
        List<Candidate> list = recommend(memberId, projectId);
        Map<String, Object> out = new HashMap<>();
        out.put("best", list.isEmpty() ? null : list.get(0));
        out.put("alternatives", list.size() > 1 ? list.subList(1, Math.min(list.size(), 4)) : List.of());
        out.put("candidateCount", list.size());
        return out;
    }
}
