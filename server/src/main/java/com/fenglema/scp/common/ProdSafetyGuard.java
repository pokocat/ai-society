package com.fenglema.scp.common;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 生产安全闸（上线前收口的「代码级」兜底）：当激活 prod profile（SPRING_PROFILES_ACTIVE 含 prod）时，
 * 逐条校验危险开关必须已收口，否则抛异常拒绝启动——fail-closed，不给「忘设环境变量」留后门。
 * 运行时逐接口验证仍走 scripts/prod-check.sh（对已启动实例打接口），二者互补：本闸挡「启动即不安全」，
 * prod-check.sh 挡「行为是否真收口」。
 */
@Component
public class ProdSafetyGuard {

    private static final Logger log = LoggerFactory.getLogger(ProdSafetyGuard.class);
    /** 仓库内开发默认 JWT 密钥（与 application.yml 一致）——生产若仍为此值即视为未收口。 */
    static final String DEV_JWT_SECRET = "fenglema-scp-dev-secret-key-change-in-production-0123456789abcdef";

    private final Environment env;
    private final boolean mockEndpoints;
    private final boolean mockPay;
    private final boolean wxMock;
    private final boolean webhookVerify;
    private final String webhookToken;
    private final String jwtSecret;
    private final String corsOrigins;

    public ProdSafetyGuard(Environment env,
                           @Value("${scp.mock-endpoints.enabled:false}") boolean mockEndpoints,
                           @Value("${scp.mp.mock-pay-enabled:false}") boolean mockPay,
                           @Value("${scp.wx.mock:true}") boolean wxMock,
                           @Value("${scp.webhook.verify-signature:false}") boolean webhookVerify,
                           @Value("${scp.webhook.token:}") String webhookToken,
                           @Value("${scp.jwt.secret:}") String jwtSecret,
                           @Value("${scp.cors.allowed-origins:*}") String corsOrigins) {
        this.env = env;
        this.mockEndpoints = mockEndpoints;
        this.mockPay = mockPay;
        this.wxMock = wxMock;
        this.webhookVerify = webhookVerify;
        this.webhookToken = webhookToken == null ? "" : webhookToken;
        this.jwtSecret = jwtSecret == null ? "" : jwtSecret;
        this.corsOrigins = corsOrigins == null ? "" : corsOrigins;
    }

    @PostConstruct
    void verify() {
        boolean prod = false;
        for (String p : env.getActiveProfiles()) {
            if ("prod".equalsIgnoreCase(p)) {
                prod = true;
                break;
            }
        }
        if (!prod) {
            return;   // 仅 prod profile 强制；dev/test/默认 profile 不拦（本地演示需要 mock）
        }
        List<String> violations = new ArrayList<>();
        if (mockEndpoints) violations.add("scp.mock-endpoints.enabled 必须为 false（mock 无鉴权注入口，push-earnings 可改余额）");
        if (mockPay) violations.add("scp.mp.mock-pay-enabled 必须为 false（演示支付可无实付发放权益）");
        if (wxMock) violations.add("scp.wx.mock 必须为 false（否则任意 code 可伪造登录）");
        if (!webhookVerify) violations.add("scp.webhook.verify-signature 必须为 true（否则可伪造企微回调置人入群/退群）");
        if (webhookVerify && webhookToken.isBlank()) violations.add("scp.webhook.token 不能为空");
        if (jwtSecret.isBlank() || jwtSecret.equals(DEV_JWT_SECRET))
            violations.add("scp.jwt.secret 必须为外部注入的非默认高熵密钥");
        if ("*".equals(corsOrigins.trim())) violations.add("scp.cors.allowed-origins 不能为 *（收敛到业务域名）");
        if (!violations.isEmpty()) {
            String msg = "生产安全闸拦截启动（prod profile）：\n  - " + String.join("\n  - ", violations)
                    + "\n请补齐上述环境变量后再启动，或先跑 scripts/prod-check.sh 核对。";
            log.error(msg);
            throw new IllegalStateException(msg);
        }
        log.info("[ProdSafetyGuard] 生产安全开关校验通过（prod profile）。");
    }
}
