package com.fenglema.scp.common;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * 审计日志写入（append-only，表级触发器禁 UPDATE/DELETE，SPEC §11.3）。
 * 记录对象、前后值、操作者、项目、原因与关联审批。
 */
@Service
public class AuditService {

    private final JdbcClient db;
    private final ObjectMapper mapper;

    public AuditService(JdbcClient db, ObjectMapper mapper) {
        this.db = db;
        this.mapper = mapper;
    }

    public void log(String objectType, String objectId, String action,
                    Map<String, ?> before, Map<String, ?> after,
                    String projectId, String reason, Long approvalId) {
        CurrentUser user = UserContext.getOrNull();
        String operator = user != null ? user.displayName() : "系统";
        db.sql("""
                INSERT INTO audit_log (object_type, object_id, action, before_value, after_value,
                                       operator, project_id, reason, approval_id)
                VALUES (:t, :id, :a, CAST(:before AS jsonb), CAST(:after AS jsonb), :op, :pid, :reason, :aid)
                """)
                .param("t", objectType).param("id", objectId).param("a", action)
                .param("before", toJson(before)).param("after", toJson(after))
                .param("op", operator).param("pid", projectId)
                .param("reason", reason).param("aid", approvalId)
                .update();
    }

    public void log(String objectType, String objectId, String action) {
        log(objectType, objectId, action, null, null, null, null, null);
    }

    private String toJson(Map<String, ?> value) {
        if (value == null) {
            return null;
        }
        try {
            return mapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return "{\"_error\":\"serialize\"}";
        }
    }
}
