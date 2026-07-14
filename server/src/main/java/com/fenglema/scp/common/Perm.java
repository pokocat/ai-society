package com.fenglema.scp.common;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 接口权限声明：module=模块键（与 role_permission.module 对齐），action=操作位。
 * 服务端强制校验（SPEC §11.1）——前端隐藏按钮不能代替本注解。
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Perm {

    String module();

    Action action() default Action.VIEW;

    enum Action { VIEW, CREATE, EDIT, DELETE, EXPORT, APPROVE }
}
