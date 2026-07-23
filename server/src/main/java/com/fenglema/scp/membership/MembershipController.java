package com.fenglema.scp.membership;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.IdempotencyGuard;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.UserContext;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.identity.MemberService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 权益域端点（M3 §4.1）：套餐管理、会员费订单（一方交易）、权益查询、到期作业。
 * Mock 支付经 /orders/{orderNo}/mock-pay（管理台演示用，@Perm 鉴权——不扩大 mock/** 无鉴权面）；
 * M3c 真实虚拟支付回调验签后调 paymentCallback 同一入口。
 */
@RestController
@RequestMapping("/api/v1/membership")
public class MembershipController {

    private final MembershipOrderService service;
    private final EntitlementService entitlement;
    private final MemberService memberService;
    private final IdempotencyGuard idempotency;
    private final boolean mockPayEnabled;

    public MembershipController(MembershipOrderService service, EntitlementService entitlement,
                                MemberService memberService, IdempotencyGuard idempotency,
                                @Value("${scp.mp.mock-pay-enabled:false}") boolean mockPayEnabled) {
        this.service = service;
        this.entitlement = entitlement;
        this.memberService = memberService;
        this.idempotency = idempotency;
        this.mockPayEnabled = mockPayEnabled;
    }

    // ── 套餐 ──

    @GetMapping("/plans")
    @Perm(module = "membership")
    public ApiResponse<List<Map<String, Object>>> plans(@RequestParam(defaultValue = "false") boolean onSaleOnly) {
        return ApiResponse.ok(service.plans(onSaleOnly));
    }

    public record CreatePlan(@NotBlank String planCode, @NotBlank String name, @NotBlank String grantIdentity,
                             @NotNull Integer durationDays, @NotNull Integer priceCents,
                             Integer iosPriceCents, String projectScope) {
    }

    @PostMapping("/plans")
    @Perm(module = "membership", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> createPlan(@RequestBody CreatePlan req) {
        return ApiResponse.ok(service.createPlan(req.planCode(), req.name(), req.grantIdentity(),
                req.durationDays(), req.priceCents(), req.iosPriceCents(), req.projectScope()));
    }

    public record PlanStatus(@NotBlank String status) {
    }

    @PatchMapping("/plans/{id}/status")
    @Perm(module = "membership", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> planStatus(@PathVariable long id, @RequestBody PlanStatus req) {
        return ApiResponse.ok(service.setPlanStatus(id, req.status()));
    }

    // ── 订单 ──

    @GetMapping("/orders")
    @Perm(module = "membership")
    public ApiResponse<List<Map<String, Object>>> orders(@RequestParam(required = false) String memberNo,
                                                         @RequestParam(required = false) String status) {
        return ApiResponse.ok(service.orders(memberNo, status));
    }

    public record CreateOrder(@NotBlank String memberNo, @NotBlank String planCode,
                              @NotBlank String channel, String projectId) {
    }

    /** 下单（支持 Idempotency-Key 防重复下单）。 */
    @PostMapping("/orders")
    @Perm(module = "membership", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> createOrder(@RequestBody CreateOrder req,
                                                        @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        if (!idempotency.tryRegister(key, "/membership/orders")) {
            return ApiResponse.ok(Map.of("result", "重复提交，已忽略", "idempotent", true));
        }
        UserContext.assertMemberAccess(req.memberNo());
        return ApiResponse.ok(service.createOrder(req.memberNo(), req.planCode(), req.channel(), req.projectId()));
    }

    /** Mock 支付适配器：模拟虚拟支付成功回调（接口对齐 M3c 真实回调，幂等键=模拟流水号）。 */
    @PostMapping("/orders/{orderNo}/mock-pay")
    @Perm(module = "membership", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> mockPay(@PathVariable String orderNo,
                                                    @RequestParam(required = false) String callbackId) {
        // M5：与小程序侧 pay 同款生产闸——SCP_MOCK_PAY=false 时禁用，真实回调只经验签后的 paymentCallback
        if (!mockPayEnabled) {
            throw BusinessException.forbidden("当前环境不支持演示支付，请走微信虚拟支付回调");
        }
        String cb = callbackId != null ? callbackId : "MOCKCB-" + orderNo;
        return ApiResponse.ok(service.paymentCallback(orderNo, cb));
    }

    public record OrderStatus(@NotBlank String status, String reason) {
    }

    /** 关单/退款流转（已支付→退款中→已退款/回到已支付；置已支付只能走回调）。 */
    @PatchMapping("/orders/{orderNo}/status")
    @Perm(module = "membership", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> orderStatus(@PathVariable String orderNo, @RequestBody OrderStatus req) {
        return ApiResponse.ok(service.changeStatus(orderNo, req.status(), req.reason()));
    }

    // ── 权益 ──

    @GetMapping("/entitlements/{memberNo}")
    @Perm(module = "membership")
    public ApiResponse<Map<String, Object>> entitlement(@PathVariable String memberNo,
                                                        @RequestParam String projectId) {
        UserContext.assertMemberAccess(memberNo);
        return ApiResponse.ok(entitlement.summary(memberService.idOf(memberNo), projectId));
    }

    /** 手动触发到期作业（定时任务每日 02:30 自动跑）。 */
    @PostMapping("/run-expiry")
    @Perm(module = "membership", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> runExpiry() {
        return ApiResponse.ok(service.runExpiry());
    }
}
