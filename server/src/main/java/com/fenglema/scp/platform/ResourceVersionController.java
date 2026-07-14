package com.fenglema.scp.platform;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.common.UserContext;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 项目资源方案版本（SPEC §6.3）：草稿 → 校验（issues 清单）→ 发布（挂审批，通过后生效且不可变）。
 * 校验规则与设计稿资源配置四步向导的「规则校验」一致。
 */
@RestController
@RequestMapping("/api/v1/projects/{projectId}/resource-versions")
public class ResourceVersionController {

    private final JdbcClient db;

    public ResourceVersionController(JdbcClient db) {
        this.db = db;
    }

    @GetMapping
    @Perm(module = "resourceconfig")
    public ApiResponse<List<Map<String, Object>>> list(@PathVariable String projectId) {
        return ApiResponse.ok(db.sql("SELECT * FROM project_resource_version WHERE project_id = :pid ORDER BY version_no DESC")
                .param("pid", projectId).query(Rows.MAP).list());
    }

    @PostMapping
    @Perm(module = "resourceconfig", action = Perm.Action.CREATE)
    @Transactional
    public ApiResponse<Map<String, Object>> createDraft(@PathVariable String projectId) {
        Integer next = db.sql("SELECT COALESCE(MAX(version_no), 0) + 1 FROM project_resource_version WHERE project_id = :pid")
                .param("pid", projectId).query(Integer.class).single();
        var user = UserContext.get();
        Long id = db.sql("""
                        INSERT INTO project_resource_version (project_id, version_no, status, created_by)
                        VALUES (:pid, :v, 'draft', :uid) RETURNING id
                        """)
                .param("pid", projectId).param("v", next).param("uid", user.userId())
                .query(Long.class).single();
        return ApiResponse.ok(get(id));
    }

    /** 校验（SPEC §6.3 第4步）：返回 issues 清单；全部通过则版本置 validated。 */
    @PostMapping("/{versionId}/validate")
    @Perm(module = "resourceconfig", action = Perm.Action.EDIT)
    @Transactional
    public ApiResponse<Map<String, Object>> validate(@PathVariable String projectId, @PathVariable long versionId) {
        requireStatus(versionId, "draft", "validated");
        List<Map<String, Object>> issues = new ArrayList<>();
        // 群级校验（对齐设计稿 issues 判据）
        issues.addAll(db.sql("""
                SELECT g.id AS object_id, g.name,
                       CASE
                         WHEN g.builder_account_id IS NULL THEN '未指定建群企业微信'
                         WHEN ecs.id IS NULL THEN '未配置企业微信客服'
                         WHEN pcs.id IS NULL THEN '未配置个人微信客服'
                         WHEN g.member_count > g.target_capacity THEN '已超过目标容量'
                       END AS issue
                FROM community_group g
                LEFT JOIN group_staffing ecs ON ecs.group_id = g.id AND ecs.role = '企微客服' AND ecs.is_primary
                LEFT JOIN group_staffing pcs ON pcs.group_id = g.id AND pcs.role = '个微客服' AND pcs.is_primary
                WHERE g.project_id = :pid
                  AND (g.builder_account_id IS NULL OR ecs.id IS NULL OR pcs.id IS NULL OR g.member_count > g.target_capacity)
                """).param("pid", projectId).query(Rows.MAP).list());
        // 个微负载校验
        issues.addAll(db.sql("""
                SELECT a.id AS object_id, a.name,
                       CASE
                         WHEN a.serving_group_count > r.max_groups_per_wechat THEN '服务群数超过上限'
                         WHEN a.friend_count >= r.hard_friends THEN '好友数已达到硬上限'
                       END AS issue
                FROM account a CROSS JOIN resource_rules r
                WHERE a.account_type = '个人微信'
                  AND EXISTS (SELECT 1 FROM account_assignment aa WHERE aa.account_id = a.id AND aa.project_id = :pid AND NOT aa.revoked)
                  AND (a.serving_group_count > r.max_groups_per_wechat OR a.friend_count >= r.hard_friends)
                """).param("pid", projectId).query(Rows.MAP).list());
        // 账号状态校验
        issues.addAll(db.sql("""
                SELECT a.id AS object_id, a.name, '账号状态异常（' || a.status || '）不可用于方案' AS issue
                FROM account a
                WHERE a.status IN ('风险','冻结','待交接')
                  AND EXISTS (SELECT 1 FROM account_assignment aa WHERE aa.account_id = a.id AND aa.project_id = :pid AND NOT aa.revoked)
                """).param("pid", projectId).query(Rows.MAP).list());

        String status = issues.isEmpty() ? "validated" : "draft";
        db.sql("""
                UPDATE project_resource_version SET status = :s,
                       issues = CAST(:issues AS jsonb)
                WHERE id = :id
                """)
                .param("s", status)
                .param("issues", toJsonArray(issues))
                .param("id", versionId)
                .update();
        return ApiResponse.ok(Map.of("versionId", versionId, "status", status, "issues", issues,
                "message", issues.isEmpty() ? "资源方案可以启用" : "存在 " + issues.size() + " 项配置问题"));
    }

    /** 发布：validated → 建「资源方案发布」审批单，通过后置 published 并更新项目生效指针。 */
    @PostMapping("/{versionId}/publish")
    @Perm(module = "resourceconfig", action = Perm.Action.EDIT)
    @Transactional
    public ApiResponse<Map<String, Object>> publish(@PathVariable String projectId, @PathVariable long versionId) {
        requireStatus(versionId, "validated");
        // 冻结快照（发布不可变的内容基线）
        db.sql("""
                UPDATE project_resource_version v SET snapshot = (
                    SELECT jsonb_build_object(
                        'accounts', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name)), '[]'::jsonb)
                                     FROM account a JOIN account_assignment aa ON aa.account_id = a.id
                                     WHERE aa.project_id = :pid AND NOT aa.revoked),
                        'groups', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'capacity', g.target_capacity)), '[]'::jsonb)
                                   FROM community_group g WHERE g.project_id = :pid),
                        'rules', (SELECT to_jsonb(r) FROM resource_rules r WHERE r.id = 1))
                )
                WHERE v.id = :id
                """)
                .param("pid", projectId).param("id", versionId).update();
        Long approvalId = db.sql("""
                        INSERT INTO approval (approval_type, title, submitter, project_id, detail, callback_type, callback_ref)
                        VALUES ('资源方案发布', :title, :submitter, :pid, CAST(:detail AS jsonb), 'RESOURCE_PUBLISH', :ref)
                        RETURNING id
                        """)
                .param("title", "发布项目 " + projectId + " 资源方案 v" + versionId)
                .param("submitter", UserContext.get().displayName())
                .param("pid", projectId)
                .param("detail", "{\"versionId\":" + versionId + "}")
                .param("ref", String.valueOf(versionId))
                .query(Long.class).single();
        db.sql("UPDATE project_resource_version SET approval_id = :aid WHERE id = :id")
                .param("aid", approvalId).param("id", versionId).update();
        return ApiResponse.ok(Map.of("versionId", versionId, "approvalId", approvalId,
                "message", "发布申请已提交审批（高风险变更，SPEC §11.2）"));
    }

    private Map<String, Object> get(long id) {
        return db.sql("SELECT * FROM project_resource_version WHERE id = :id").param("id", id)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("资源方案版本"));
    }

    private void requireStatus(long versionId, String... allowed) {
        String status = (String) get(versionId).get("status");
        for (String s : allowed) {
            if (s.equals(status)) {
                return;
            }
        }
        throw BusinessException.conflict("资源方案版本状态「" + status + "」不允许该操作");
    }

    private String toJsonArray(List<Map<String, Object>> issues) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < issues.size(); i++) {
            Map<String, Object> issue = issues.get(i);
            if (i > 0) {
                sb.append(',');
            }
            sb.append("{\"objectId\":\"").append(issue.get("object_id"))
              .append("\",\"name\":\"").append(issue.get("name"))
              .append("\",\"issue\":\"").append(issue.get("issue")).append("\"}");
        }
        return sb.append(']').toString();
    }
}
