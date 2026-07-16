-- =====================================================================
-- 运行时连库账号降权（CLAUDE.md 第 6 条 / §8 欠账）
-- scp_app 由 scripts/db-init.sh 预建（集群级角色）。本迁移以属主 scp 身份运行,
-- 授予 scp_app 仅 DML 权限：应用以 scp_app 连接,无 DDL/TRUNCATE,且非属主无法
-- DROP/DISABLE audit_log 的 append-only 触发器——审计不可篡改由权限隔离兜底,不再只靠"应用不删"。
-- =====================================================================

GRANT USAGE ON SCHEMA public TO scp_app;

-- 现有全部表/序列的 DML
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO scp_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO scp_app;

-- 未来迁移（以 scp 身份建表）自动授予 scp_app，无需每次手工补权
ALTER DEFAULT PRIVILEGES FOR ROLE scp IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO scp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE scp IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO scp_app;

-- 纵深防御：audit_log 对运行时账号仅 INSERT/SELECT（叠加 append-only 触发器）
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM scp_app;
