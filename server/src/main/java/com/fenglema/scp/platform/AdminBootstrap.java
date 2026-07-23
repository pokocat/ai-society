package com.fenglema.scp.platform;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * 引导管理员：clean 部署（V9 清空演示内容后）app_user 为空，此处在启动时按环境变量创建
 * 第一个 founder 管理员，避免「清空即锁在门外」。仅当 app_user 为空时创建——
 * dev/demo（演示账号已在）或已初始化的环境为 no-op。密码走 SCP_ADMIN_PASSWORD，不写死；
 * 未设则跳过并告警（提示设置后重启）。
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final JdbcClient db;
    private final String username;
    private final String password;
    private final String displayName;

    public AdminBootstrap(JdbcClient db,
                          @Value("${scp.admin.username:admin}") String username,
                          @Value("${scp.admin.password:}") String password,
                          @Value("${scp.admin.display-name:系统管理员}") String displayName) {
        this.db = db;
        this.username = username;
        this.password = password == null ? "" : password;
        this.displayName = displayName;
    }

    @Override
    public void run(ApplicationArguments args) {
        Integer count = db.sql("SELECT count(*) FROM app_user").query(Integer.class).single();
        if (count != null && count > 0) {
            return;   // 已有账号（演示 / 已初始化）→ 不动
        }
        if (password.isBlank()) {
            log.warn("[AdminBootstrap] app_user 为空且未设 SCP_ADMIN_PASSWORD，跳过引导管理员创建。"
                    + "请设置 SCP_ADMIN_USERNAME / SCP_ADMIN_PASSWORD 后重启，以创建首个 founder 管理员。");
            return;
        }
        Integer roleExists = db.sql("SELECT count(*) FROM role WHERE code = 'founder'")
                .query(Integer.class).single();
        if (roleExists == null || roleExists == 0) {
            log.warn("[AdminBootstrap] 未找到 founder 角色，跳过引导管理员创建（请检查角色/权限配置种子）。");
            return;
        }
        db.sql("""
                INSERT INTO app_user (username, display_name, password_hash, role_code, data_scope, enabled)
                VALUES (:u, :d, :h, 'founder', 'ALL', TRUE)
                ON CONFLICT (username) DO NOTHING
                """)
                .param("u", username).param("d", displayName)
                .param("h", AuthController.hash(password))
                .update();
        log.info("[AdminBootstrap] 已创建引导管理员「{}」(founder / ALL)。请首次登录后立即修改密码。", username);
    }
}
