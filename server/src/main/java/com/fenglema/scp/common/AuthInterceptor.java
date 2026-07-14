package com.fenglema.scp.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 鉴权拦截器：解析 Bearer JWT → UserContext；再按 @Perm 校验角色功能位。
 * 三层权限的 ①角色功能位 在此强制；②数据范围 由各服务经 DataScopeGuard 注入；③资源授权 按需在服务内校验。
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final JwtService jwtService;
    private final PermissionService permissionService;

    public AuthInterceptor(JwtService jwtService, PermissionService permissionService) {
        this.jwtService = jwtService;
        this.permissionService = permissionService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw BusinessException.forbidden("未登录");
        }
        CurrentUser user = jwtService.parse(auth.substring(7));
        UserContext.set(user);

        if (handler instanceof HandlerMethod method) {
            Perm perm = method.getMethodAnnotation(Perm.class);
            if (perm == null) {
                perm = method.getBeanType().getAnnotation(Perm.class);
            }
            if (perm != null && !permissionService.allowed(user.roleCode(), perm.module(), perm.action())) {
                throw BusinessException.forbidden("无权限：" + perm.module() + "." + perm.action());
            }
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }
}
