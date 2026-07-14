package com.fenglema.scp.common;

/** 请求级用户上下文。由 AuthInterceptor 装载，请求结束清理。 */
public final class UserContext {

    private static final ThreadLocal<CurrentUser> HOLDER = new ThreadLocal<>();

    private UserContext() {
    }

    public static void set(CurrentUser user) {
        HOLDER.set(user);
    }

    public static CurrentUser get() {
        CurrentUser u = HOLDER.get();
        if (u == null) {
            throw BusinessException.forbidden("未登录");
        }
        return u;
    }

    public static CurrentUser getOrNull() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }
}
