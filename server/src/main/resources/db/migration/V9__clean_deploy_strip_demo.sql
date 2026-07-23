-- =====================================================================
-- V9 · 部署纯净化：把「演示内容」与「系统配置」解耦
-- 背景：V2/V5/V7 把演示数据（项目/账号/会员/群/订单/样例套餐…）与系统配置
--   （字典/规则/角色/权限）混在同一迁移里且无条件 INSERT，导致生产部署也带一堆
--   演示数据。本迁移按 Flyway 占位符 ${seedmode} 决定是否清空演示内容：
--     seedmode=clean（生产默认，application.yml）→ 清空除配置表外的全部表；
--     seedmode=demo （dev/test profile）        → 完全 no-op，保留 V2 演示数据供本地演示/冒烟。
-- 保留表 = 系统运行必需的配置：字典枚举 / 规则单行 / 角色 / 权限矩阵（+ Flyway 自身历史）。
-- 清空后 app_user 为空，由 AdminBootstrap 在启动时按 SCP_ADMIN_PASSWORD 建引导管理员。
-- 用「除保留表外全清」而非逐表枚举：新增表自动覆盖，且 CASCADE 处理外键顺序。
-- 以属主 scp 执行（flyway.user=scp），可 TRUNCATE audit_log（其触发器仅挡 UPDATE/DELETE，不挡 TRUNCATE）。
-- =====================================================================

DO $$
DECLARE
    keep text[] := ARRAY['dict_entry', 'resource_rules', 'role', 'role_permission', 'flyway_schema_history'];
    r record;
BEGIN
    IF '${seedmode}' = 'clean' THEN
        FOR r IN
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public' AND NOT (tablename = ANY(keep))
        LOOP
            EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', r.tablename);
        END LOOP;
        RAISE NOTICE '[V9] seedmode=clean：已清空演示内容，仅保留系统配置（字典/规则/角色/权限）。';
    ELSE
        RAISE NOTICE '[V9] seedmode=%（非 clean）：保留演示数据，未做清理。', '${seedmode}';
    END IF;
END $$;
