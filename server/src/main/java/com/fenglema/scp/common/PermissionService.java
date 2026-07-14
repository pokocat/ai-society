package com.fenglema.scp.common;

import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.LoadingCache;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashSet;
import java.util.Set;

/** 角色功能位（role_permission）查询，进程内缓存 60s。 */
@Service
public class PermissionService {

    private final JdbcClient db;
    private final LoadingCache<String, Set<String>> cache;

    public PermissionService(JdbcClient db) {
        this.db = db;
        this.cache = Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofSeconds(60))
                .build(this::loadRole);
    }

    /** 缓存键=角色，值=已授权的 "module:ACTION" 集合。 */
    private Set<String> loadRole(String roleCode) {
        Set<String> granted = new HashSet<>();
        db.sql("SELECT module, can_view, can_create, can_edit, can_delete, can_export, can_approve FROM role_permission WHERE role_code = :role")
                .param("role", roleCode)
                .query(rs -> {
                    String module = rs.getString("module");
                    if (rs.getBoolean("can_view")) granted.add(module + ":VIEW");
                    if (rs.getBoolean("can_create")) granted.add(module + ":CREATE");
                    if (rs.getBoolean("can_edit")) granted.add(module + ":EDIT");
                    if (rs.getBoolean("can_delete")) granted.add(module + ":DELETE");
                    if (rs.getBoolean("can_export")) granted.add(module + ":EXPORT");
                    if (rs.getBoolean("can_approve")) granted.add(module + ":APPROVE");
                });
        return granted;
    }

    public boolean allowed(String roleCode, String module, Perm.Action action) {
        return cache.get(roleCode).contains(module + ":" + action.name());
    }

    public void invalidate() {
        cache.invalidateAll();
    }
}
