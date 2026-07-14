package com.fenglema.scp.common;

/** 业务异常：message 直接面向前端展示。 */
public class BusinessException extends RuntimeException {

    private final int code;

    public BusinessException(String message) {
        this(4000, message);
    }

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    /** 4030：越权 */
    public static BusinessException forbidden(String message) {
        return new BusinessException(4030, message);
    }

    /** 4040：对象不存在 */
    public static BusinessException notFound(String what) {
        return new BusinessException(4040, what + "不存在");
    }

    /** 4090：状态/规则冲突（阻断类） */
    public static BusinessException conflict(String message) {
        return new BusinessException(4090, message);
    }
}
