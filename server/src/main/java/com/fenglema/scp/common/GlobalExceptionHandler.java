package com.fenglema.scp.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ApiResponse<Void> business(BusinessException e) {
        return ApiResponse.error(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ApiResponse<Void> validation(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " " + f.getDefaultMessage())
                .findFirst().orElse("参数错误");
        return ApiResponse.error(4001, msg);
    }

    /**
     * 路由不存在 → 404。
     * 生产用 SCP_MOCK_ENDPOINTS=false 整组下线 mock 接口后，这些路径会落到这里；
     * 若沿用兜底的 500「系统繁忙」，运维会把「接口已按预期下线」误读成「服务故障」，
     * 且每次探测都打一条 ERROR 噪音。
     */
    @ExceptionHandler(NoResourceFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> notFound(NoResourceFoundException e) {
        log.debug("route not found: {}", e.getResourcePath());
        return ApiResponse.error(4040, "接口不存在");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> unexpected(Exception e) {
        log.error("unexpected error", e);
        return ApiResponse.error(5000, "系统繁忙，请稍后再试");
    }
}
