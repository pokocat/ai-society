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

    /**
     * 数据范围第②层的横向越权兜底（SPEC §11.1）：dataScope=SELF 的用户（会员端/金服端）
     * 只能访问自己的 memberNo；PROJECT/REGION/ALL 由项目/区域过滤控制，此处放行。
     * 用于会员档案/收益/提现/会员任务等以 memberNo 为入参的敏感端点，防 IDOR。
     */
    public static void assertMemberAccess(String memberNo) {
        CurrentUser u = get();
        if (!"SELF".equals(u.dataScope())) {
            return;
        }
        if (memberNo == null || !memberNo.equals(u.memberNo())) {
            throw BusinessException.forbidden("无权访问其他会员的数据");
        }
    }
}
