package com.fenglema.scp.platform;

import com.fenglema.scp.common.AuditService;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ProjectService {

    /** 项目状态机（SPEC §8.1）：合法迁移表。 */
    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "筹备中", Set.of("配置中", "已归档"),
            "配置中", Set.of("待发布", "暂停", "已归档"),
            "待发布", Set.of("运行中", "配置中"),
            "运行中", Set.of("暂停", "已结束"),
            "暂停", Set.of("运行中", "已结束"),
            "已结束", Set.of("已归档"),
            "已归档", Set.of());

    private final JdbcClient db;
    private final AuditService audit;

    public ProjectService(JdbcClient db, AuditService audit) {
        this.db = db;
        this.audit = audit;
    }

    public List<Map<String, Object>> list() {
        return db.sql("""
                SELECT p.*, i.api_type, i.data_scope AS integration_scope, i.endpoint, i.auth_status, i.last_sync_at,
                       (SELECT count(*) FROM member_project_identity mpi WHERE mpi.project_id = p.id AND mpi.status = '有效') AS member_count,
                       (SELECT count(*) FROM community_group g WHERE g.project_id = p.id) AS group_count,
                       (SELECT count(*) FROM account_assignment aa WHERE aa.project_id = p.id AND NOT aa.revoked) AS account_count
                FROM project p
                LEFT JOIN project_integration i ON i.project_id = p.id
                ORDER BY p.created_at
                """).query(Rows.MAP).list();
    }

    public Map<String, Object> get(String id) {
        return db.sql("SELECT * FROM project WHERE id = :id").param("id", id)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("项目"));
    }

    @Transactional
    public Map<String, Object> create(ProjectController.CreateProject req) {
        String id = req.code().toLowerCase(Locale.ROOT).replace('_', '-');
        db.sql("""
                INSERT INTO project (id, code, name, short_name, category, status, service_region)
                VALUES (:id, :code, :name, :shortName, :category, '筹备中', :region)
                """)
                .param("id", id).param("code", req.code()).param("name", req.name())
                .param("shortName", req.shortName()).param("category", req.category())
                .param("region", req.serviceRegion())
                .update();
        if (req.apiType() != null) {
            db.sql("""
                    INSERT INTO project_integration (project_id, api_type, data_scope, endpoint)
                    VALUES (:id, :apiType, :dataScope, :endpoint)
                    """)
                    .param("id", id).param("apiType", req.apiType())
                    .param("dataScope", req.dataScope() == null ? "仅读取项目数据" : req.dataScope())
                    .param("endpoint", req.endpoint())
                    .update();
        }
        audit.log("project", id, "创建项目");
        return get(id);
    }

    @Transactional
    public Map<String, Object> changeStatus(String id, String target) {
        Map<String, Object> project = get(id);
        String current = (String) project.get("status");
        if (!TRANSITIONS.getOrDefault(current, Set.of()).contains(target)) {
            throw BusinessException.conflict("项目状态不允许从「" + current + "」迁移到「" + target + "」");
        }
        db.sql("UPDATE project SET status = :s, updated_at = now() WHERE id = :id")
                .param("s", target).param("id", id).update();
        audit.log("project", id, "状态变更", Map.of("status", current), Map.of("status", target), id, null, null);
        return get(id);
    }

    @Transactional
    public Map<String, Object> markSynced(String id) {
        get(id);
        db.sql("UPDATE project_integration SET last_sync_at = now(), auth_status = '已鉴权' WHERE project_id = :id")
                .param("id", id).update();
        return get(id);
    }
}
