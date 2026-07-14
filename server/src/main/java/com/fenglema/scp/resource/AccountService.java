package com.fenglema.scp.resource;

import com.fenglema.scp.common.AuditService;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AccountService {

    /** 账号状态机（SPEC §8.2）。 */
    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "库存", Set.of("待激活", "已归档"),
            "待激活", Set.of("可用", "库存"),
            "可用", Set.of("使用中", "冻结", "已停用"),
            "使用中", Set.of("风险", "冻结", "待交接", "已停用"),
            "风险", Set.of("使用中", "冻结", "待交接", "已停用"),
            "冻结", Set.of("可用", "待交接", "已停用"),
            "待交接", Set.of("使用中", "可用", "已停用"),
            "已停用", Set.of("已归档"),
            "已归档", Set.of());

    private final JdbcClient db;
    private final AuditService audit;

    public AccountService(JdbcClient db, AuditService audit) {
        this.db = db;
        this.audit = audit;
    }

    public List<Map<String, Object>> list(String type, String status, String projectId, String keyword) {
        return db.sql("""
                SELECT a.*,
                       ce.name AS custodian_name, ue.name AS user_name,
                       (SELECT COALESCE(jsonb_agg(aa.project_id), '[]'::jsonb) FROM account_assignment aa
                         WHERE aa.account_id = a.id AND NOT aa.revoked) AS project_ids,
                       (SELECT count(*) FROM group_staffing gs
                         WHERE gs.account_id = a.id AND gs.role = '个微客服') AS staffing_group_count
                FROM account a
                LEFT JOIN employee ce ON ce.id = a.custodian_employee_id
                LEFT JOIN employee ue ON ue.id = a.user_employee_id
                WHERE (CAST(:type AS text) IS NULL OR a.account_type = :type)
                  AND (CAST(:status AS text) IS NULL OR a.status = :status)
                  AND (CAST(:kw AS text) IS NULL OR a.name ILIKE '%' || :kw || '%' OR a.identifier ILIKE '%' || :kw || '%')
                  AND (CAST(:pid AS text) IS NULL OR EXISTS (SELECT 1 FROM account_assignment aa
                        WHERE aa.account_id = a.id AND aa.project_id = :pid AND NOT aa.revoked))
                ORDER BY a.id
                """)
                .param("type", type).param("status", status)
                .param("kw", keyword).param("pid", projectId)
                .query(Rows.MAP).list();
    }

    public Map<String, Object> get(String id) {
        return db.sql("SELECT * FROM account WHERE id = :id").param("id", id)
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.notFound("账号"));
    }

    @Transactional
    public Map<String, Object> create(AccountController.CreateAccount req) {
        // 准入：账号标识唯一（SPEC §6.1），由 UNIQUE(account_type, identifier) 双保险
        boolean dup = !db.sql("SELECT 1 FROM account WHERE account_type = :t AND identifier = :i")
                .param("t", req.accountType()).param("i", req.identifier())
                .query(Rows.MAP).list().isEmpty();
        if (dup) {
            throw BusinessException.conflict("账号标识已建档，不得重复：" + req.identifier());
        }
        db.sql("""
                INSERT INTO account (id, account_type, name, identifier, status, phone, region, city,
                                     custodian_employee_id, user_employee_id)
                VALUES (:id, :type, :name, :identifier, '库存', :phone, :region, :city, :cust, :user)
                """)
                .param("id", req.id()).param("type", req.accountType()).param("name", req.name())
                .param("identifier", req.identifier()).param("phone", req.phone())
                .param("region", req.region()).param("city", req.city())
                .param("cust", req.custodianEmployeeId()).param("user", req.userEmployeeId())
                .update();
        audit.log("account", req.id(), "新建账号");
        return get(req.id());
    }

    @Transactional
    public Map<String, Object> changeStatus(String id, String target, String reason) {
        Map<String, Object> account = get(id);
        String current = (String) account.get("status");
        if (!TRANSITIONS.getOrDefault(current, Set.of()).contains(target)) {
            throw BusinessException.conflict("账号状态不允许从「" + current + "」迁移到「" + target + "」");
        }
        db.sql("UPDATE account SET status = :s, updated_at = now() WHERE id = :id")
                .param("s", target).param("id", id).update();
        audit.log("account", id, "状态变更", Map.of("status", current), Map.of("status", target), null, reason, null);
        return get(id);
    }

    @Transactional
    public Map<String, Object> assignToProject(String accountId, String projectId) {
        Map<String, Object> account = get(accountId);
        String status = (String) account.get("status");
        // 准入：异常/冻结/待交接账号不得分配新项目（SPEC §6.1）
        if (Set.of("风险", "冻结", "待交接", "已停用", "已归档").contains(status)) {
            throw BusinessException.conflict("账号状态「" + status + "」不得分配新项目");
        }
        db.sql("""
                INSERT INTO account_assignment (account_id, project_id)
                VALUES (:aid, :pid)
                ON CONFLICT (account_id, project_id) DO UPDATE SET revoked = FALSE, valid_from = now()
                """)
                .param("aid", accountId).param("pid", projectId).update();
        audit.log("account_assignment", accountId + "→" + projectId, "账号分配项目", null, null, projectId, null, null);
        return get(accountId);
    }

    @Transactional
    public Map<String, Object> revokeFromProject(String accountId, String projectId) {
        db.sql("UPDATE account_assignment SET revoked = TRUE WHERE account_id = :aid AND project_id = :pid")
                .param("aid", accountId).param("pid", projectId).update();
        audit.log("account_assignment", accountId + "→" + projectId, "账号移出项目", null, null, projectId, null, null);
        return get(accountId);
    }

    @Transactional
    public Map<String, Object> createHandover(String accountId, Long toEmployeeId, String reason) {
        Map<String, Object> account = get(accountId);
        Long handoverId = db.sql("""
                        INSERT INTO account_handover (account_id, from_employee_id, to_employee_id, reason)
                        VALUES (:aid, :fromEmp, :toEmp, :reason) RETURNING id
                        """)
                .param("aid", accountId)
                .param("fromEmp", account.get("custodian_employee_id"))
                .param("toEmp", toEmployeeId)
                .param("reason", reason)
                .query(Long.class).single();
        // 交接属高风险操作 → 建审批单（SPEC §11.2），账号进入待交接
        Long approvalId = db.sql("""
                        INSERT INTO approval (approval_type, title, submitter, urgent, detail, callback_type, callback_ref)
                        VALUES ('账号交接', :title, :submitter, TRUE, CAST(:detail AS jsonb), 'HANDOVER', :ref)
                        RETURNING id
                        """)
                .param("title", account.get("name") + " 账号交接")
                .param("submitter", "系统")
                .param("detail", "{\"账号\":\"" + account.get("identifier") + "\",\"原因\":\"" + (reason == null ? "" : reason) + "\"}")
                .param("ref", String.valueOf(handoverId))
                .query(Long.class).single();
        db.sql("UPDATE account_handover SET approval_id = :apid WHERE id = :id")
                .param("apid", approvalId).param("id", handoverId).update();
        changeStatus(accountId, "待交接", "发起交接");
        return Map.of("handoverId", handoverId, "approvalId", approvalId);
    }
}
