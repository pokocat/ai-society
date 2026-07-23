package com.fenglema.scp.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;
    private final String[] allowedOrigins;

    public WebConfig(AuthInterceptor authInterceptor,
                     @Value("${scp.cors.allowed-origins:*}") String allowedOrigins) {
        this.authInterceptor = authInterceptor;
        this.allowedOrigins = allowedOrigins.split("\\s*,\\s*");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/v1/auth/login",
                        "/api/v1/mp/login",     // 小程序 wx.login 静默登录（登录后同走 JWT）
                        "/api/v1/webhook/**",   // 外部事件入口走签名校验（Mock 阶段放行）
                        "/api/v1/mock/**");     // mock-project-system 注入口
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // 开发默认 *；生产以 SCP_CORS_ORIGINS 收敛到管理台域名（上架审阅项）
        registry.addMapping("/**")
                .allowedOriginPatterns(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
