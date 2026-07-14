package com.fenglema.scp.common;

/** 登录态载体（来自 JWT）。dataScope：SELF/PROJECT/REGION/ALL（SPEC §11.1 数据范围层）。 */
public record CurrentUser(
        long userId,
        String username,
        String displayName,
        String roleCode,
        String dataScope,
        String memberNo) {
}
