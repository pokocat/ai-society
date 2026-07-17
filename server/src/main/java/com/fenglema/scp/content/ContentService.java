package com.fenglema.scp.content;

import com.fenglema.scp.common.AuditService;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Json;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.gateway.CommunityGateway;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 运营内容域（M3 §4.4）：入群欢迎语（全自动通道）/ 群发排期（半自动：派发→群主确认→回填）/
 * 讲课排期（企微群直播）。
 * 群发额度：企微限制每群每天≤1 条（成员群发），派发器读当日已派计数强制校验，超额群跳过并留痕——
 * 不伪装全自动，管理台明示「待群主确认」。
 */
@Service
public class ContentService {

    /** 欢迎语素材库上限（企微平台限制）。 */
    static final int WELCOME_TEMPLATE_CAP = 100;

    private final JdbcClient db;
    private final AuditService audit;
    private final CommunityGateway gateway;
    private final com.fasterxml.jackson.databind.ObjectMapper mapper;

    public ContentService(JdbcClient db, AuditService audit, CommunityGateway gateway,
                          com.fasterxml.jackson.databind.ObjectMapper mapper) {
        this.db = db;
        this.audit = audit;
        this.gateway = gateway;
        this.mapper = mapper;
    }

    // ── 欢迎语 ──

    public List<Map<String, Object>> welcomeTemplates(String status) {
        return db.sql("""
                        SELECT w.*, p.name AS project_name FROM welcome_template w
                        LEFT JOIN project p ON p.id = w.project_id
                        WHERE (CAST(:s AS text) IS NULL OR w.status = :s)
                        ORDER BY w.created_at DESC
                        """)
                .param("s", status)
                .query(Rows.MAP).list();
    }

    @Transactional
    public Map<String, Object> createWelcomeTemplate(String name, String scopeGroupType, String projectId,
                                                     Map<String, Object> content) {
        int enabled = db.sql("SELECT count(*) FROM welcome_template WHERE status = '启用'")
                .query(Integer.class).single();
        if (enabled >= WELCOME_TEMPLATE_CAP) {
            throw BusinessException.conflict("欢迎语素材已达企微上限 " + WELCOME_TEMPLATE_CAP + " 条，请先停用旧模板");
        }
        db.sql("""
                INSERT INTO welcome_template (name, scope_group_type, project_id, content)
                VALUES (:name, :scope, :pid, CAST(:content AS jsonb))
                """)
                .param("name", name).param("scope", scopeGroupType).param("pid", projectId)
                .param("content", Json.write(content))
                .update();
        Map<String, Object> row = db.sql("SELECT * FROM welcome_template ORDER BY id DESC LIMIT 1")
                .query(Rows.MAP).single();
        audit.log("welcome_template", String.valueOf(row.get("id")), "新建欢迎语模板");
        return row;
    }

    @Transactional
    public Map<String, Object> patchWelcomeTemplate(long id, String status, Map<String, Object> content) {
        Map<String, Object> before = db.sql("SELECT * FROM welcome_template WHERE id = :id")
                .param("id", id)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("欢迎语模板"));
        if (status != null && !"启用".equals(status) && !"停用".equals(status)) {
            throw new BusinessException("欢迎语状态仅支持 启用/停用");
        }
        db.sql("""
                UPDATE welcome_template SET
                  status = COALESCE(:s, status),
                  content = COALESCE(CAST(:content AS jsonb), content),
                  updated_at = now()
                WHERE id = :id
                """)
                .param("s", status)
                .param("content", content == null ? null : Json.write(content))
                .param("id", id)
                .update();
        audit.log("welcome_template", String.valueOf(id), "更新欢迎语模板",
                Map.of("status", before.get("status")), Map.of("status", status == null ? before.get("status") : status),
                (String) before.get("project_id"), null, null);
        return db.sql("SELECT * FROM welcome_template WHERE id = :id").param("id", id).query(Rows.MAP).single();
    }

    /** 同步到企微素材库（Mock 网关返回 materialId 回填；M3c 实连）。 */
    @Transactional
    public Map<String, Object> syncWelcomeTemplate(long id) {
        Map<String, Object> tpl = db.sql("SELECT * FROM welcome_template WHERE id = :id AND status = '启用'")
                .param("id", id)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.conflict("模板不存在或未启用"));
        Map<String, Object> result = gateway.syncWelcomeTemplate(id, String.valueOf(tpl.get("content")));
        db.sql("UPDATE welcome_template SET wecom_material_id = :m, updated_at = now() WHERE id = :id")
                .param("m", result.get("materialId")).param("id", id).update();
        audit.log("welcome_template", String.valueOf(id), "同步企微素材库",
                null, Map.of("materialId", result.get("materialId")), null, null, null);
        return db.sql("SELECT * FROM welcome_template WHERE id = :id").param("id", id).query(Rows.MAP).single();
    }

    // ── 群发排期 ──

    public List<Map<String, Object>> broadcasts(String status) {
        return db.sql("""
                        SELECT b.*,
                               (SELECT count(*) FROM task_item t WHERE t.broadcast_plan_id = b.id) AS task_total,
                               (SELECT count(*) FROM task_item t WHERE t.broadcast_plan_id = b.id
                                  AND t.status = '已完成') AS task_done
                        FROM broadcast_plan b
                        WHERE (CAST(:s AS text) IS NULL OR b.status = :s)
                        ORDER BY b.created_at DESC
                        """)
                .param("s", status)
                .query(Rows.MAP).list();
    }

    @Transactional
    public Map<String, Object> createBroadcast(String title, Map<String, Object> content,
                                               Map<String, Object> targetScope) {
        db.sql("""
                INSERT INTO broadcast_plan (title, content, target_scope, status)
                VALUES (:t, CAST(:c AS jsonb), CAST(:scope AS jsonb), '待派发')
                """)
                .param("t", title).param("c", Json.write(content))
                .param("scope", targetScope == null ? null : Json.write(targetScope))
                .update();
        Map<String, Object> row = db.sql("SELECT * FROM broadcast_plan ORDER BY id DESC LIMIT 1")
                .query(Rows.MAP).single();
        audit.log("broadcast_plan", String.valueOf(row.get("id")), "新建群发排期");
        return row;
    }

    /**
     * 派发（半自动的产品化，M3 §5.3）：按 target_scope 圈群 → 每群每天≤1 条额度校验（超额跳过留痕）
     * → 生成群主「群发确认」任务 → 网关建群发任务。群主在企微客户端确认后经任务回填闭环。
     */
    @Transactional
    public Map<String, Object> dispatchBroadcast(long planId) {
        Map<String, Object> plan = db.sql("SELECT * FROM broadcast_plan WHERE id = :id FOR UPDATE")
                .param("id", planId)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("群发排期"));
        String status = (String) plan.get("status");
        if (!"待派发".equals(status) && !"草稿".equals(status)) {
            throw BusinessException.conflict("状态「" + status + "」不可派发");
        }
        Map<String, Object> scope = parseScope(plan.get("target_scope"));
        // 圈群：服务中/容量预警/已满的活跃群 + 可选 项目/群类型/归属代理 过滤
        List<Map<String, Object>> groups = db.sql("""
                        SELECT g.id, g.name, g.wecom_chat_id, g.project_id,
                               (SELECT gs.employee_id FROM group_staffing gs
                                  WHERE gs.group_id = g.id AND gs.role = '企微客服' AND gs.is_primary
                                  LIMIT 1) AS owner_employee_id
                        FROM community_group g
                        WHERE g.status IN ('服务中','容量预警','已满')
                          AND (CAST(:pid AS text) IS NULL OR g.project_id = :pid)
                          AND (CAST(:gtype AS text) IS NULL OR g.group_type = :gtype)
                          AND (CAST(:ownerNo AS text) IS NULL OR g.owner_member_id =
                                (SELECT id FROM member WHERE member_no = :ownerNo))
                        """)
                .param("pid", scope.get("projectId"))
                .param("gtype", scope.get("groupType"))
                .param("ownerNo", scope.get("ownerMemberNo"))
                .query(Rows.MAP).list();
        if (groups.isEmpty()) {
            throw BusinessException.conflict("圈选范围内无可派发的群（需状态为 服务中/容量预警/已满）");
        }
        int created = 0;
        int skipped = 0;
        List<String> chatIds = new java.util.ArrayList<>();
        for (Map<String, Object> g : groups) {
            // 额度：该群今天已有群发确认任务 → 跳过并留痕（企微每群每天≤1 条）
            int today = db.sql("""
                            SELECT count(*) FROM task_item
                            WHERE group_id = :g AND task_type = '群发确认' AND created_at::date = now()::date
                            """)
                    .param("g", g.get("id")).query(Integer.class).single();
            if (today > 0) {
                skipped++;
                continue;
            }
            db.sql("""
                    INSERT INTO task_item (task_type, title, project_id, group_id, assignee_employee_id,
                                           broadcast_plan_id, priority, status, due_at)
                    VALUES ('群发确认', :title, :pid, :g, :emp, :plan, '高', '待领取', now() + interval '1 day')
                    """)
                    .param("title", "群发确认：" + plan.get("title") + " → " + g.get("name"))
                    .param("pid", g.get("project_id")).param("g", g.get("id"))
                    .param("emp", g.get("owner_employee_id")).param("plan", planId)
                    .update();
            created++;
            if (g.get("wecom_chat_id") != null) {
                chatIds.add((String) g.get("wecom_chat_id"));
            }
        }
        Map<String, Object> gwResult = gateway.createGroupBroadcast(planId, chatIds);
        db.sql("UPDATE broadcast_plan SET status = '派发中', dispatched_at = now(), updated_at = now() WHERE id = :id")
                .param("id", planId).update();
        audit.log("broadcast_plan", String.valueOf(planId), "群发派发",
                Map.of("status", status),
                Map.of("status", "派发中", "taskCreated", created, "skippedByQuota", skipped),
                (String) scope.get("projectId"), null, null);
        Map<String, Object> out = new HashMap<>();
        out.put("planId", planId);
        out.put("status", "派发中");
        out.put("taskCreated", created);
        out.put("skippedByQuota", skipped);   // 无静默截断：跳过数如实返回
        out.put("gateway", gwResult);
        return out;
    }

    /** 状态收敛：任务全完成 → 已完成；也可人工取消。 */
    @Transactional
    public Map<String, Object> refreshBroadcast(long planId) {
        Map<String, Object> plan = db.sql("SELECT * FROM broadcast_plan WHERE id = :id FOR UPDATE")
                .param("id", planId)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("群发排期"));
        if ("派发中".equals(plan.get("status"))) {
            int open = db.sql("""
                            SELECT count(*) FROM task_item
                            WHERE broadcast_plan_id = :id AND status NOT IN ('已完成','已取消','失败')
                            """)
                    .param("id", planId).query(Integer.class).single();
            int total = db.sql("SELECT count(*) FROM task_item WHERE broadcast_plan_id = :id")
                    .param("id", planId).query(Integer.class).single();
            if (total > 0 && open == 0) {
                db.sql("UPDATE broadcast_plan SET status = '已完成', updated_at = now() WHERE id = :id")
                        .param("id", planId).update();
            }
        }
        return db.sql("SELECT * FROM broadcast_plan WHERE id = :id").param("id", planId).query(Rows.MAP).single();
    }

    @Transactional
    public Map<String, Object> cancelBroadcast(long planId, String reason) {
        Map<String, Object> plan = db.sql("SELECT * FROM broadcast_plan WHERE id = :id FOR UPDATE")
                .param("id", planId)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("群发排期"));
        String status = (String) plan.get("status");
        if ("已完成".equals(status) || "已取消".equals(status)) {
            throw BusinessException.conflict("状态「" + status + "」不可取消");
        }
        db.sql("UPDATE broadcast_plan SET status = '已取消', updated_at = now() WHERE id = :id")
                .param("id", planId).update();
        db.sql("""
                UPDATE task_item SET status = '已取消', fail_reason = :r
                WHERE broadcast_plan_id = :id AND status IN ('待创建','待领取','已分配')
                """)
                .param("r", "群发排期取消：" + reason).param("id", planId).update();
        audit.log("broadcast_plan", String.valueOf(planId), "取消群发",
                Map.of("status", status), Map.of("status", "已取消"), null, reason, null);
        return db.sql("SELECT * FROM broadcast_plan WHERE id = :id").param("id", planId).query(Rows.MAP).single();
    }

    // ── 讲课排期 ──

    public List<Map<String, Object>> courses(String status) {
        return db.sql("""
                        SELECT * FROM course_session
                        WHERE (CAST(:s AS text) IS NULL OR status = :s)
                        ORDER BY scheduled_at DESC
                        """)
                .param("s", status)
                .query(Rows.MAP).list();
    }

    @Transactional
    public Map<String, Object> createCourse(String title, String speaker, java.time.OffsetDateTime scheduledAt,
                                            Map<String, Object> groupScope) {
        db.sql("""
                INSERT INTO course_session (title, speaker, scheduled_at, group_scope)
                VALUES (:t, :sp, :at, CAST(:scope AS jsonb))
                """)
                .param("t", title).param("sp", speaker).param("at", scheduledAt)
                .param("scope", groupScope == null ? null : Json.write(groupScope))
                .update();
        Map<String, Object> row = db.sql("SELECT * FROM course_session ORDER BY id DESC LIMIT 1")
                .query(Rows.MAP).single();
        audit.log("course_session", String.valueOf(row.get("id")), "新建讲课排期");
        return row;
    }

    /** 开播：网关 createLive 回填 live_id（真人开播，排程自动）。 */
    @Transactional
    public Map<String, Object> startLive(long id) {
        Map<String, Object> course = db.sql("SELECT * FROM course_session WHERE id = :id FOR UPDATE")
                .param("id", id)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("讲课排期"));
        if (!"已排期".equals(course.get("status"))) {
            throw BusinessException.conflict("状态「" + course.get("status") + "」不可开播");
        }
        Map<String, Object> live = gateway.createLive(id, (String) course.get("title"), (String) course.get("speaker"));
        db.sql("UPDATE course_session SET status = '直播中', live_id = :l, updated_at = now() WHERE id = :id")
                .param("l", live.get("liveId")).param("id", id).update();
        audit.log("course_session", String.valueOf(id), "开播",
                Map.of("status", "已排期"), Map.of("status", "直播中", "liveId", live.get("liveId")),
                null, null, null);
        Map<String, Object> out = new HashMap<>(live);
        out.put("courseSessionId", id);
        out.put("status", "直播中");
        return out;
    }

    /** 结课：拉回放 url 回填（回放存 3 年）。 */
    @Transactional
    public Map<String, Object> finishLive(long id) {
        Map<String, Object> course = db.sql("SELECT * FROM course_session WHERE id = :id FOR UPDATE")
                .param("id", id)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("讲课排期"));
        if (!"直播中".equals(course.get("status"))) {
            throw BusinessException.conflict("状态「" + course.get("status") + "」不可结课");
        }
        Map<String, Object> info = gateway.fetchLiveInfo((String) course.get("live_id"));
        db.sql("UPDATE course_session SET status = '已结束', replay_url = :r, updated_at = now() WHERE id = :id")
                .param("r", info.get("replayUrl")).param("id", id).update();
        audit.log("course_session", String.valueOf(id), "结课·回放回填",
                Map.of("status", "直播中"), Map.of("status", "已结束", "replayUrl", info.get("replayUrl")),
                null, null, null);
        return db.sql("SELECT * FROM course_session WHERE id = :id").param("id", id).query(Rows.MAP).single();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseScope(Object scopeJson) {
        if (scopeJson == null) {
            return Map.of();
        }
        try {
            return mapper.readValue(String.valueOf(scopeJson), Map.class);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            return Map.of();
        }
    }
}
