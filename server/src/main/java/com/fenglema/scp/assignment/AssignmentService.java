package com.fenglema.scp.assignment;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fenglema.scp.common.AuditService;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.common.UserContext;
import com.fenglema.scp.identity.MemberService;
import com.fenglema.scp.resource.GroupService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 会员入群分配：SPEC §6.4–§6.7 闭环编排 + §8.4 八态状态机 + §7.2 并发预占。
 * 入群关系是一等对象——绝不允许只改群人数（SPEC §4.7）。
 */
@Service
public class AssignmentService {

    /** 状态机合法迁移（SPEC §8.4；待确认=等待审批/终审）。 */
    static final Map<String, Set<String>> TRANSITIONS = Map.ofEntries(
            Map.entry("待匹配", Set.of("已推荐", "匹配失败", "人工取消")),
            Map.entry("已推荐", Set.of("待确认", "待加好友", "待邀请", "人工取消", "群已满", "匹配失败")),
            Map.entry("待确认", Set.of("待加好友", "待邀请", "人工取消")),
            Map.entry("待加好友", Set.of("已加好友", "好友申请失败", "人工取消")),
            Map.entry("已加好友", Set.of("待邀请")),
            Map.entry("待邀请", Set.of("已邀请", "邀请失败", "人工取消")),
            Map.entry("已邀请", Set.of("已入群", "拒绝入群", "邀请失败")),
            Map.entry("已入群", Set.of("已退群")));

    private final JdbcClient db;
    private final RecommendEngine engine;
    private final MemberService memberService;
    private final GroupService groupService;
    private final AuditService audit;
    private final ObjectMapper mapper;
    private final int reservationTtlMinutes;

    public AssignmentService(JdbcClient db, RecommendEngine engine, MemberService memberService,
                             GroupService groupService, AuditService audit, ObjectMapper mapper,
                             @Value("${scp.reservation.ttl-minutes:30}") int reservationTtlMinutes) {
        this.db = db;
        this.engine = engine;
        this.memberService = memberService;
        this.groupService = groupService;
        this.audit = audit;
        this.mapper = mapper;
        this.reservationTtlMinutes = reservationTtlMinutes;
    }

    public List<Map<String, Object>> pendingPool(String projectId) {
        return db.sql("""
                SELECT m.id, m.member_no, m.name, m.phone, m.city, m.source_channel,
                       mpi.project_id, mpi.identity, ref.name AS referrer_name
                FROM member_project_identity mpi
                JOIN member m ON m.id = mpi.member_id AND m.merged_into IS NULL
                LEFT JOIN referral_relation rr ON rr.member_id = m.id
                LEFT JOIN member ref ON ref.id = rr.referrer_id
                WHERE mpi.status = '待分配'
                  AND (:pid IS NULL OR mpi.project_id = :pid)
                  AND NOT EXISTS (SELECT 1 FROM member_group_assignment a
                        WHERE a.member_id = m.id AND a.project_id = mpi.project_id
                          AND a.status IN ('待匹配','已推荐','待确认','待加好友','已加好友','待邀请','已邀请'))
                ORDER BY m.created_at
                """)
                .param("pid", projectId)
                .query(Rows.MAP).list();
    }

    /** 计算推荐并落一条「已推荐」在途分配（幂等：已有在途则更新推荐结果）。 */
    @Transactional
    public Map<String, Object> recommend(String memberNo, String projectId) {
        long memberId = memberService.idOf(memberNo);
        Map<String, Object> payload = engine.recommendPayload(memberId, projectId);
        RecommendEngine.Candidate best = (RecommendEngine.Candidate) payload.get("best");
        if (best == null) {
            throw BusinessException.conflict("无可分配群：项目资源与客服编组完成后再试，或调整规则");
        }
        Long existing = db.sql("""
                        SELECT id FROM member_group_assignment
                        WHERE member_id = :m AND project_id = :p
                          AND status IN ('待匹配','已推荐','待确认','待加好友','已加好友','待邀请','已邀请')
                        """)
                .param("m", memberId).param("p", projectId)
                .query(Long.class).optional().orElse(null);
        Long assignmentId;
        if (existing != null) {
            String status = db.sql("SELECT status FROM member_group_assignment WHERE id = :id")
                    .param("id", existing).query(String.class).single();
            if (!Set.of("待匹配", "已推荐").contains(status)) {
                throw BusinessException.conflict("该会员已有进行中的分配（" + status + "），不可重复发起");
            }
            db.sql("""
                    UPDATE member_group_assignment
                    SET group_id = :g, personal_wechat_id = :w, status = '已推荐', recommend_score = :s,
                        hit_rules = CAST(:hits AS jsonb), risk_hints = CAST(:risks AS jsonb),
                        recommended_at = now(), updated_at = now()
                    WHERE id = :id
                    """)
                    .param("g", best.groupId()).param("w", best.personalWechatId())
                    .param("s", best.score()).param("hits", toJson(best.hitRules()))
                    .param("risks", toJson(best.riskHints())).param("id", existing)
                    .update();
            assignmentId = existing;
        } else {
            assignmentId = db.sql("""
                            INSERT INTO member_group_assignment
                                (member_id, project_id, group_id, personal_wechat_id, status, recommend_score,
                                 hit_rules, risk_hints, assign_way, recommended_at)
                            VALUES (:m, :p, :g, :w, '已推荐', :s, CAST(:hits AS jsonb), CAST(:risks AS jsonb), 'AI推荐', now())
                            RETURNING id
                            """)
                    .param("m", memberId).param("p", projectId)
                    .param("g", best.groupId()).param("w", best.personalWechatId())
                    .param("s", best.score()).param("hits", toJson(best.hitRules()))
                    .param("risks", toJson(best.riskHints()))
                    .query(Long.class).single();
        }
        return Map.of("assignmentId", assignmentId, "recommendation", payload);
    }

    /**
     * 确认分配（SPEC §6.6）：行锁 + 校验「聚合 + 活跃预占 + 本次 ≤ 上限」→ 预占 → 按好友关系派任务。
     * 人工改选非首选群必须填 overrideReason（SPEC §7.4）；超容量走审批（状态停在待确认）。
     */
    @Transactional
    public Map<String, Object> confirm(long assignmentId, String chosenGroupId, String overrideReason) {
        Map<String, Object> assignment = db.sql("SELECT * FROM member_group_assignment WHERE id = :id FOR UPDATE")
                .param("id", assignmentId)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("分配记录"));
        String status = (String) assignment.get("status");
        if (!"已推荐".equals(status) && !"待匹配".equals(status)) {
            throw BusinessException.conflict("当前状态「" + status + "」不可确认");
        }
        long memberId = ((Number) assignment.get("member_id")).longValue();
        String projectId = (String) assignment.get("project_id");
        String groupId = chosenGroupId != null ? chosenGroupId : (String) assignment.get("group_id");
        boolean overridden = chosenGroupId != null && !chosenGroupId.equals(assignment.get("group_id"));
        if (overridden && (overrideReason == null || overrideReason.isBlank())) {
            throw new BusinessException("人工调整必须填写覆盖原因（SPEC §7.4）");
        }

        // 行锁：群 + 个微账号（锁序固定：先群后账号，避免死锁）
        Map<String, Object> group = db.sql("SELECT * FROM community_group WHERE id = :id FOR UPDATE")
                .param("id", groupId)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("微信群"));
        String personalWechatId = db.sql("""
                        SELECT account_id FROM group_staffing WHERE group_id = :g AND role = '个微客服' AND is_primary
                        """)
                .param("g", groupId)
                .query(String.class).optional()
                .orElseThrow(() -> BusinessException.conflict("该群未完成个微客服编组"));
        Map<String, Object> wechat = db.sql("SELECT * FROM account WHERE id = :id FOR UPDATE")
                .param("id", personalWechatId).query(Rows.MAP).single();

        Map<String, Object> rules = db.sql("SELECT * FROM resource_rules WHERE id = 1").query(Rows.MAP).single();
        int capacity = ((Number) group.get("target_capacity")).intValue();
        int current = ((Number) group.get("member_count")).intValue();
        int reserved = db.sql("""
                        SELECT count(*) FROM capacity_reservation
                        WHERE target_type = '群容量' AND target_id = :g AND status = '生效' AND expires_at > now()
                        """)
                .param("g", groupId).query(Integer.class).single();

        boolean isFriend = !db.sql("""
                        SELECT 1 FROM member_wechat_relation
                        WHERE member_id = :m AND account_id = :a AND relation = '好友'
                        """)
                .param("m", memberId).param("a", personalWechatId)
                .query(Rows.MAP).list().isEmpty();

        // 容量校验（聚合 + 预占 + 本次）
        if (current + reserved + 1 > capacity) {
            if ((Boolean) rules.get("block_overload") && !overridden) {
                transition(assignmentId, status, "群已满", "容量不足：" + current + "+" + reserved + "≥" + capacity);
                throw BusinessException.conflict("群容量不足（" + current + "/" + capacity + "，预占 " + reserved + "），已阻断。可改选备选群");
            }
            // 覆盖超容量 → 审批，状态停「待确认」（SPEC §7.4/§11.2）
            Long approvalId = createOverrideApproval(assignmentId, groupId, overrideReason, current, reserved, capacity);
            db.sql("""
                    UPDATE member_group_assignment SET status = '待确认', group_id = :g, personal_wechat_id = :w,
                           assign_way = '人工调整', override_reason = :reason, approval_id = :apid,
                           operator = :op, updated_at = now()
                    WHERE id = :id
                    """)
                    .param("g", groupId).param("w", personalWechatId).param("reason", overrideReason)
                    .param("apid", approvalId).param("op", operatorName()).param("id", assignmentId)
                    .update();
            return Map.of("assignmentId", assignmentId, "status", "待确认", "approvalId", approvalId,
                    "message", "超容量分配已提交审批");
        }

        // 个微好友额度校验（仅非好友需要新增好友）
        if (!isFriend) {
            int friends = ((Number) wechat.get("friend_count")).intValue();
            int friendReserved = db.sql("""
                            SELECT COALESCE(SUM(amount),0) FROM capacity_reservation
                            WHERE target_type = '个微好友额度' AND target_id = :a AND status = '生效' AND expires_at > now()
                            """)
                    .param("a", personalWechatId).query(Integer.class).single();
            int hard = ((Number) rules.get("hard_friends")).intValue();
            if (friends + friendReserved + 1 > hard) {
                throw BusinessException.conflict("个微 " + wechat.get("name") + " 好友额度不足（" + friends + "+" + friendReserved + "≥" + hard + "），请改选其他群");
            }
            reserve("个微好友额度", personalWechatId, assignmentId);
        }
        reserve("群容量", groupId, assignmentId);

        // 好友分支（SPEC §6.6）
        String next;
        Long taskId;
        if (isFriend) {
            next = "待邀请";
            taskId = createTask("邀请入群", memberId, projectId, groupId, personalWechatId, assignmentId);
            db.sql("UPDATE member_group_assignment SET invite_task_id = :t WHERE id = :id")
                    .param("t", taskId).param("id", assignmentId).update();
        } else {
            next = "待加好友";
            taskId = createTask("加好友", memberId, projectId, groupId, personalWechatId, assignmentId);
            db.sql("UPDATE member_group_assignment SET friend_task_id = :t WHERE id = :id")
                    .param("t", taskId).param("id", assignmentId).update();
        }
        db.sql("""
                UPDATE member_group_assignment SET status = :s, group_id = :g, personal_wechat_id = :w,
                       assign_way = :way, override_reason = :reason, operator = :op,
                       confirmed_at = now(), updated_at = now()
                WHERE id = :id
                """)
                .param("s", next).param("g", groupId).param("w", personalWechatId)
                .param("way", overridden ? "人工调整" : (String) assignment.get("assign_way"))
                .param("reason", overrideReason).param("op", operatorName()).param("id", assignmentId)
                .update();
        audit.log("member_group_assignment", String.valueOf(assignmentId), "确认分配",
                Map.of("status", status), Map.of("status", next, "groupId", groupId), projectId, overrideReason, null);
        return Map.of("assignmentId", assignmentId, "status", next, "taskId", taskId,
                "isFriend", isFriend, "groupId", groupId, "personalWechatId", personalWechatId);
    }

    /** 状态推进（校验合法迁移）。 */
    @Transactional
    public void transition(long assignmentId, String expectFrom, String to, String failReason) {
        String current = db.sql("SELECT status FROM member_group_assignment WHERE id = :id FOR UPDATE")
                .param("id", assignmentId).query(String.class).single();
        if (expectFrom != null && !expectFrom.equals(current)) {
            throw BusinessException.conflict("分配状态已变化（期望 " + expectFrom + "，实际 " + current + "）");
        }
        if (!TRANSITIONS.getOrDefault(current, Set.of()).contains(to)) {
            throw BusinessException.conflict("入群状态不允许从「" + current + "」迁移到「" + to + "」");
        }
        db.sql("""
                UPDATE member_group_assignment SET status = :to, fail_reason = COALESCE(:fail, fail_reason),
                       friended_at = CASE WHEN :to = '已加好友' THEN now() ELSE friended_at END,
                       invited_at  = CASE WHEN :to = '已邀请' THEN now() ELSE invited_at END,
                       joined_at   = CASE WHEN :to = '已入群' THEN now() ELSE joined_at END,
                       updated_at = now()
                WHERE id = :id
                """)
                .param("to", to).param("fail", failReason).param("id", assignmentId)
                .update();
        // 终态失败 → 释放预占
        if (Set.of("好友申请失败", "邀请失败", "拒绝入群", "人工取消", "群已满", "匹配失败").contains(to)) {
            db.sql("UPDATE capacity_reservation SET status = '已释放' WHERE assignment_id = :id AND status = '生效'")
                    .param("id", assignmentId).update();
        }
    }

    /**
     * 入群确认（SPEC §6.7：仅入群事件或人工确认可置已入群）→ 同事务回写：
     * 群人数、个微好友、好友关系、档案时间线、消耗预占、群状态刷新。
     */
    @Transactional
    public Map<String, Object> confirmJoin(long assignmentId, String via) {
        Map<String, Object> a = db.sql("SELECT * FROM member_group_assignment WHERE id = :id FOR UPDATE")
                .param("id", assignmentId).query(Rows.MAP).single();
        transition(assignmentId, null, "已入群", null);
        long memberId = ((Number) a.get("member_id")).longValue();
        String groupId = (String) a.get("group_id");
        String wechatId = (String) a.get("personal_wechat_id");

        db.sql("UPDATE community_group SET member_count = member_count + 1, updated_at = now() WHERE id = :g")
                .param("g", groupId).update();
        db.sql("UPDATE capacity_reservation SET status = '已消耗' WHERE assignment_id = :id AND status = '生效'")
                .param("id", assignmentId).update();
        if (wechatId != null) {
            db.sql("""
                    INSERT INTO member_wechat_relation (member_id, account_id, relation, confirm_way)
                    VALUES (:m, :a, '好友', :way)
                    ON CONFLICT (member_id, account_id) DO UPDATE SET relation = '好友', confirmed_at = now()
                    """)
                    .param("m", memberId).param("a", wechatId)
                    .param("way", "webhook".equals(via) ? "接口同步" : "人工回填")
                    .update();
        }
        String groupName = db.sql("SELECT name FROM community_group WHERE id = :g").param("g", groupId)
                .query(String.class).single();
        memberService.appendTimeline(memberId, (String) a.get("project_id"), "入群",
                "加入 " + groupName + "（" + ("webhook".equals(via) ? "入群事件确认" : "人工确认") + "）", operatorName());
        groupService.refreshStatus(groupId);
        return Map.of("assignmentId", assignmentId, "status", "已入群", "groupId", groupId);
    }

    public Map<String, Object> get(long id) {
        return db.sql("""
                        SELECT a.*, m.member_no, m.name AS member_name, g.name AS group_name
                        FROM member_group_assignment a
                        JOIN member m ON m.id = a.member_id
                        JOIN community_group g ON g.id = a.group_id
                        WHERE a.id = :id
                        """)
                .param("id", id).query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("分配记录"));
    }

    public List<Map<String, Object>> list(String projectId, String status, String groupId) {
        return db.sql("""
                SELECT a.*, m.member_no, m.name AS member_name, g.name AS group_name
                FROM member_group_assignment a
                JOIN member m ON m.id = a.member_id
                JOIN community_group g ON g.id = a.group_id
                WHERE (:pid IS NULL OR a.project_id = :pid)
                  AND (:status IS NULL OR a.status = :status)
                  AND (:gid IS NULL OR a.group_id = :gid)
                ORDER BY a.updated_at DESC LIMIT 200
                """)
                .param("pid", projectId).param("status", status).param("gid", groupId)
                .query(Rows.MAP).list();
    }

    /** 过期预占释放（SPEC §7.2 预占 TTL）。 */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void releaseExpiredReservations() {
        db.sql("UPDATE capacity_reservation SET status = '已释放' WHERE status = '生效' AND expires_at <= now()")
                .update();
    }

    private void reserve(String targetType, String targetId, long assignmentId) {
        db.sql("""
                INSERT INTO capacity_reservation (target_type, target_id, amount, assignment_id, expires_at)
                VALUES (:t, :id, 1, :aid, now() + make_interval(mins => :ttl))
                """)
                .param("t", targetType).param("id", targetId)
                .param("aid", assignmentId).param("ttl", reservationTtlMinutes)
                .update();
    }

    private Long createTask(String type, long memberId, String projectId, String groupId,
                            String accountId, long assignmentId) {
        String memberName = db.sql("SELECT name FROM member WHERE id = :id").param("id", memberId)
                .query(String.class).single();
        Long assignee = db.sql("SELECT user_employee_id FROM account WHERE id = :id").param("id", accountId)
                .query(Long.class).optional().orElse(null);
        return db.sql("""
                        INSERT INTO task_item (task_type, title, project_id, member_id, group_id, account_id,
                                               assignee_employee_id, assignment_id, priority, status, due_at)
                        VALUES (:type, :title, :pid, :mid, :gid, :aid, :emp, :assignment, '高', '已分配', now() + interval '24 hours')
                        RETURNING id
                        """)
                .param("type", type)
                .param("title", type + "：" + memberName)
                .param("pid", projectId).param("mid", memberId).param("gid", groupId)
                .param("aid", accountId).param("emp", assignee).param("assignment", assignmentId)
                .query(Long.class).single();
    }

    private Long createOverrideApproval(long assignmentId, String groupId, String reason,
                                        int current, int reserved, int capacity) {
        return db.sql("""
                        INSERT INTO approval (approval_type, title, submitter, urgent, detail, callback_type, callback_ref)
                        VALUES ('超容量分配', :title, :submitter, TRUE, CAST(:detail AS jsonb), 'OVERRIDE_ASSIGN', :ref)
                        RETURNING id
                        """)
                .param("title", "超容量分配审批：群 " + groupId + "（" + current + "+" + reserved + "/" + capacity + "）")
                .param("submitter", operatorName())
                .param("detail", "{\"assignmentId\":" + assignmentId + ",\"groupId\":\"" + groupId
                        + "\",\"原因\":\"" + (reason == null ? "" : reason) + "\"}")
                .param("ref", String.valueOf(assignmentId))
                .query(Long.class).single();
    }

    private String operatorName() {
        var user = UserContext.getOrNull();
        return user != null ? user.displayName() : "系统";
    }

    private String toJson(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
