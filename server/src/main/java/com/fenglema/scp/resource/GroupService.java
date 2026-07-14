package com.fenglema.scp.resource;

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
public class GroupService {

    private final JdbcClient db;
    private final AuditService audit;

    public GroupService(JdbcClient db, AuditService audit) {
        this.db = db;
        this.audit = audit;
    }

    public List<Map<String, Object>> list(String projectId, String status, String groupType, boolean poolOnly) {
        return db.sql("""
                SELECT g.*, ba.name AS builder_name,
                       ROUND(g.member_count::numeric / NULLIF(g.target_capacity, 0), 4) AS fill_rate,
                       ecs.employee_id AS wecom_cs_employee_id, ee.name AS wecom_cs_name,
                       pcs.account_id AS personal_cs_account_id, pa.name AS personal_cs_name,
                       (SELECT count(*) FROM capacity_reservation r
                         WHERE r.target_type = '群容量' AND r.target_id = g.id AND r.status = '生效'
                           AND r.expires_at > now()) AS active_reservations
                FROM community_group g
                LEFT JOIN account ba ON ba.id = g.builder_account_id
                LEFT JOIN group_staffing ecs ON ecs.group_id = g.id AND ecs.role = '企微客服' AND ecs.is_primary
                LEFT JOIN employee ee ON ee.id = ecs.employee_id
                LEFT JOIN group_staffing pcs ON pcs.group_id = g.id AND pcs.role = '个微客服' AND pcs.is_primary
                LEFT JOIN account pa ON pa.id = pcs.account_id
                WHERE (:pid IS NULL OR g.project_id = :pid)
                  AND (NOT :poolOnly OR g.project_id IS NULL)
                  AND (:status IS NULL OR g.status = :status)
                  AND (:type IS NULL OR g.group_type = :type)
                ORDER BY g.id
                """)
                .param("pid", projectId).param("poolOnly", poolOnly)
                .param("status", status).param("type", groupType)
                .query(Rows.MAP).list();
    }

    public Map<String, Object> get(String id) {
        return db.sql("SELECT * FROM community_group WHERE id = :id").param("id", id)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("微信群"));
    }

    public Map<String, Object> detail(String id) {
        Map<String, Object> group = new HashMap<>(get(id));
        group.put("staffing", db.sql("""
                        SELECT gs.*, e.name AS employee_name, a.name AS account_name
                        FROM group_staffing gs
                        LEFT JOIN employee e ON e.id = gs.employee_id
                        LEFT JOIN account a ON a.id = gs.account_id
                        WHERE gs.group_id = :id
                        """).param("id", id).query(Rows.MAP).list());
        group.put("qrcodes", db.sql("SELECT * FROM group_qrcode WHERE group_id = :id ORDER BY version DESC")
                .param("id", id).query(Rows.MAP).list());
        group.put("events", db.sql("SELECT * FROM group_lifecycle_event WHERE group_id = :id ORDER BY created_at DESC LIMIT 20")
                .param("id", id).query(Rows.MAP).list());
        return group;
    }

    @Transactional
    public Map<String, Object> create(GroupController.CreateGroup req) {
        Integer defaultCapacity = db.sql("SELECT target_group_size FROM resource_rules WHERE id = 1")
                .query(Integer.class).single();
        db.sql("""
                INSERT INTO community_group (id, name, group_type, city, region, builder_account_id, target_capacity, status)
                VALUES (:id, :name, :type, :city, :region, :builder,
                        COALESCE(:capacity, :defaultCapacity),
                        CASE WHEN :builder IS NULL THEN '待建群' ELSE '待配置' END)
                """)
                .param("id", req.id()).param("name", req.name()).param("type", req.groupType())
                .param("city", req.city()).param("region", req.region())
                .param("builder", req.builderAccountId())
                .param("capacity", req.targetCapacity()).param("defaultCapacity", defaultCapacity)
                .update();
        logEvent(req.id(), "建群", null);
        audit.log("community_group", req.id(), "新建微信群");
        return get(req.id());
    }

    @Transactional
    public Map<String, Object> patch(String id, GroupController.PatchGroup req) {
        Map<String, Object> before = get(id);
        if (req.targetCapacity() != null) {
            int current = ((Number) before.get("member_count")).intValue();
            if (req.targetCapacity() < current) {
                throw BusinessException.conflict("目标容量不得低于当前人数 " + current);
            }
        }
        db.sql("""
                UPDATE community_group SET
                  project_id = CASE WHEN :setProject THEN :pid ELSE project_id END,
                  builder_account_id = COALESCE(:builder, builder_account_id),
                  target_capacity = COALESCE(:capacity, target_capacity),
                  status = COALESCE(:status, status),
                  updated_at = now()
                WHERE id = :id
                """)
                .param("setProject", req.projectId() != null)
                .param("pid", "".equals(req.projectId()) ? null : req.projectId())
                .param("builder", req.builderAccountId())
                .param("capacity", req.targetCapacity())
                .param("status", req.status())
                .param("id", id)
                .update();
        refreshStatus(id);
        audit.log("community_group", id, "更新群配置", before, get(id), (String) before.get("project_id"), null, null);
        return detail(id);
    }

    /** 负载预测（SPEC §6.3 第3步）：承接 = 个微 +1 群、好友 + 群当前人数（去重口径为上限估计）。 */
    public Map<String, Object> predictLoad(String groupId, String personalWechatId) {
        Map<String, Object> group = get(groupId);
        Map<String, Object> rules = db.sql("SELECT * FROM resource_rules WHERE id = 1").query(Rows.MAP).single();
        Map<String, Object> wechat = db.sql("SELECT * FROM account WHERE id = :id AND account_type = '个人微信'")
                .param("id", personalWechatId)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("个人微信账号"));

        int currentGroups = db.sql("SELECT count(*) FROM group_staffing WHERE account_id = :id AND role = '个微客服'")
                .param("id", personalWechatId).query(Integer.class).single();
        int currentFriends = ((Number) wechat.get("friend_count")).intValue();
        int projectedGroups = currentGroups + 1;
        int projectedFriends = currentFriends + ((Number) group.get("member_count")).intValue();

        int maxGroups = ((Number) rules.get("max_groups_per_wechat")).intValue();
        int hardFriends = ((Number) rules.get("hard_friends")).intValue();
        int warnFriends = ((Number) rules.get("warn_friends")).intValue();

        boolean overload = projectedGroups > maxGroups || projectedFriends > hardFriends;
        boolean warning = !overload && (projectedGroups >= maxGroups * 0.8 || projectedFriends >= warnFriends);

        Map<String, Object> result = new HashMap<>();
        result.put("personalWechatId", personalWechatId);
        result.put("currentGroups", currentGroups);
        result.put("currentFriends", currentFriends);
        result.put("projectedGroups", projectedGroups);
        result.put("projectedFriends", projectedFriends);
        result.put("maxGroups", maxGroups);
        result.put("hardFriends", hardFriends);
        result.put("overload", overload);
        result.put("warning", warning);
        result.put("estimatedNewFriends", group.get("member_count"));
        return result;
    }

    @Transactional
    public Map<String, Object> applyStaffing(String groupId, GroupController.StaffingRequest req) {
        get(groupId);
        Map<String, Object> prediction = null;
        if (req.personalWechatId() != null) {
            prediction = predictLoad(groupId, req.personalWechatId());
            boolean blockOverload = db.sql("SELECT block_overload FROM resource_rules WHERE id = 1")
                    .query(Boolean.class).single();
            if (blockOverload && Boolean.TRUE.equals(prediction.get("overload"))) {
                throw BusinessException.conflict("个微负载超限，禁止编组（预计 "
                        + prediction.get("projectedGroups") + " 群 / " + prediction.get("projectedFriends") + " 好友）");
            }
        }
        if (req.wecomEmployeeId() != null || req.wecomAccountId() != null) {
            db.sql("DELETE FROM group_staffing WHERE group_id = :gid AND role = '企微客服' AND is_primary")
                    .param("gid", groupId).update();
            db.sql("""
                    INSERT INTO group_staffing (group_id, role, employee_id, account_id, is_primary)
                    VALUES (:gid, '企微客服', :emp, :acc, TRUE)
                    """)
                    .param("gid", groupId).param("emp", req.wecomEmployeeId())
                    .param("acc", req.wecomAccountId()).update();
        }
        if (req.personalWechatId() != null) {
            db.sql("DELETE FROM group_staffing WHERE group_id = :gid AND role = '个微客服' AND is_primary")
                    .param("gid", groupId).update();
            db.sql("""
                    INSERT INTO group_staffing (group_id, role, employee_id, account_id, is_primary)
                    VALUES (:gid, '个微客服', (SELECT user_employee_id FROM account WHERE id = :acc), :acc, TRUE)
                    """)
                    .param("gid", groupId).param("acc", req.personalWechatId()).update();
            recalcWechatLoad(req.personalWechatId());
        }
        refreshStatus(groupId);
        audit.log("group_staffing", groupId, "服务编组变更");
        Map<String, Object> result = new HashMap<>(detail(groupId));
        result.put("loadPrediction", prediction);
        return result;
    }

    @Transactional
    public Map<String, Object> rotateQrcode(String groupId) {
        get(groupId);
        Integer next = db.sql("SELECT COALESCE(MAX(version), 0) + 1 FROM group_qrcode WHERE group_id = :gid")
                .param("gid", groupId).query(Integer.class).single();
        db.sql("""
                INSERT INTO group_qrcode (group_id, version, image_url, valid_until)
                VALUES (:gid, :v, '/reference-assets/wechat-qr.png', now() + interval '7 days')
                """)
                .param("gid", groupId).param("v", next).update();
        db.sql("UPDATE community_group SET qrcode_version = :v, updated_at = now() WHERE id = :gid")
                .param("v", next).param("gid", groupId).update();
        logEvent(groupId, "二维码轮换", "{\"version\":" + next + "}");
        return detail(groupId);
    }

    /**
     * 依据编组完整性与容量刷新群状态（SPEC §8.3）：
     * 缺建群企微/双客服 → 待配置；配齐且占用<预警线 → 可承接/服务中；≥预警线 → 容量预警；=容量 → 已满。
     * 仅在流转型状态间自动迁移，冻结/交接/归档等人工状态不动。
     */
    @Transactional
    public void refreshStatus(String groupId) {
        Map<String, Object> g = get(groupId);
        String status = (String) g.get("status");
        if (!List.of("待建群", "待配置", "可承接", "服务中", "容量预警", "已满").contains(status)) {
            return;
        }
        Map<String, Object> rules = db.sql("SELECT * FROM resource_rules WHERE id = 1").query(Rows.MAP).single();
        boolean hasBuilder = g.get("builder_account_id") != null;
        boolean hasWecomCs = !db.sql("SELECT 1 FROM group_staffing WHERE group_id = :g AND role = '企微客服'")
                .param("g", groupId).query(Rows.MAP).list().isEmpty();
        boolean hasPersonalCs = !db.sql("SELECT 1 FROM group_staffing WHERE group_id = :g AND role = '个微客服'")
                .param("g", groupId).query(Rows.MAP).list().isEmpty();

        boolean requireWecom = (Boolean) rules.get("require_enterprise_cs");
        boolean requirePersonal = (Boolean) rules.get("require_personal_cs");
        int memberCount = ((Number) g.get("member_count")).intValue();
        int capacity = ((Number) g.get("target_capacity")).intValue();
        double warnRatio = ((Number) rules.get("capacity_warn_ratio")).doubleValue();

        String next;
        if (!hasBuilder) {
            next = "待建群";
        } else if ((requireWecom && !hasWecomCs) || (requirePersonal && !hasPersonalCs)) {
            next = "待配置";
        } else if (memberCount >= capacity) {
            next = "已满";
        } else if (memberCount >= capacity * warnRatio) {
            next = "容量预警";
        } else if (memberCount > 0) {
            next = "服务中";
        } else {
            next = "可承接";
        }
        if (!next.equals(status)) {
            db.sql("UPDATE community_group SET status = :s, updated_at = now() WHERE id = :g")
                    .param("s", next).param("g", groupId).update();
            logEvent(groupId, "状态刷新：" + status + "→" + next, null);
            if (next.equals("容量预警")) {
                db.sql("""
                        INSERT INTO risk_event (risk_type, level, title, ref_type, ref_id, project_id, status)
                        SELECT '群容量预警', '高', :title, 'group', :gid, project_id, '待处理'
                        FROM community_group WHERE id = :gid
                          AND NOT EXISTS (SELECT 1 FROM risk_event
                                          WHERE risk_type = '群容量预警' AND ref_id = :gid AND status IN ('待处理','处理中'))
                        """)
                        .param("title", g.get("name") + " 容量达 " + memberCount + "/" + capacity + "，需准备承接群")
                        .param("gid", groupId).update();
            }
        }
    }

    /** 个微负载聚合列刷新：服务群数从编组明细聚合（SPEC §7.2 不允许人工快照）。 */
    @Transactional
    public void recalcWechatLoad(String accountId) {
        db.sql("""
                UPDATE account SET serving_group_count =
                    (SELECT count(*) FROM group_staffing WHERE account_id = :id AND role = '个微客服'),
                  updated_at = now()
                WHERE id = :id
                """)
                .param("id", accountId).update();
    }

    private void logEvent(String groupId, String eventType, String detailJson) {
        db.sql("""
                INSERT INTO group_lifecycle_event (group_id, event_type, detail, operator)
                VALUES (:gid, :type, CAST(:detail AS jsonb), :op)
                """)
                .param("gid", groupId).param("type", eventType)
                .param("detail", detailJson)
                .param("op", com.fenglema.scp.common.UserContext.getOrNull() != null
                        ? com.fenglema.scp.common.UserContext.getOrNull().displayName() : "系统")
                .update();
    }
}
