package com.fenglema.scp.mp;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.IdempotencyGuard;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.SimpleRateLimiter;
import com.fenglema.scp.common.UserContext;
import com.fenglema.scp.membership.MembershipOrderService;
import com.fenglema.scp.ops.MemberTaskService;
import com.fenglema.scp.ops.WithdrawalService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import org.springframework.web.bind.annotation.GetMapping;
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
 * 会员小程序端点（M3 §6，主理人公社）。/login 免鉴权（WebConfig 放行）；
 * 其余走 member 角色 mp 模块权限位 + SELF 数据范围（memberNo 一律取自 JWT，
 * 不接受请求方指定他人——横向越权从入口杜绝）。
 */
@RestController
@RequestMapping("/api/v1/mp")
public class MpController {

    private final MpService service;
    private final MembershipOrderService orderService;
    private final IdempotencyGuard idempotency;
    private final MemberTaskService taskService;
    private final WithdrawalService withdrawalService;
    private final SimpleRateLimiter rateLimiter;
    private final int loginRateLimit;
    private final boolean mockPayEnabled;

    public MpController(MpService service, MembershipOrderService orderService, IdempotencyGuard idempotency,
                        MemberTaskService taskService, WithdrawalService withdrawalService,
                        SimpleRateLimiter rateLimiter,
                        @Value("${scp.mp.login-rate-limit:30}") int loginRateLimit,
                        @Value("${scp.mp.mock-pay-enabled:true}") boolean mockPayEnabled) {
        this.service = service;
        this.orderService = orderService;
        this.idempotency = idempotency;
        this.taskService = taskService;
        this.withdrawalService = withdrawalService;
        this.rateLimiter = rateLimiter;
        this.loginRateLimit = loginRateLimit;
        this.mockPayEnabled = mockPayEnabled;
    }

    public record LoginRequest(@NotBlank String code, String inviteCode, String nickname) {
    }

    /** wx.login 登录并档（幂等）；scene 邀请码在此完成归因。免鉴权，按来源 IP 限流（防刷号刷邀请奖励）。 */
    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody LoginRequest req, HttpServletRequest http) {
        String ip = http.getHeader("X-Forwarded-For");
        ip = ip == null || ip.isBlank() ? http.getRemoteAddr() : ip.split(",")[0].trim();
        if (!rateLimiter.tryAcquire("mp-login:" + ip, loginRateLimit)) {
            throw BusinessException.conflict("操作过于频繁，请稍后再试");
        }
        return ApiResponse.ok(service.login(req.code(), req.inviteCode(), req.nickname()));
    }

    public record NicknameRequest(@NotBlank String nickname) {
    }

    /** 更新昵称（头像昵称填写能力回传）。 */
    @PostMapping("/profile/nickname")
    @Perm(module = "mp", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> updateNickname(@RequestBody NicknameRequest req) {
        return ApiResponse.ok(service.updateNickname(UserContext.get().userId(), req.nickname()));
    }

    public record PhoneRequest(@NotBlank String code) {
    }

    /** 绑定手机号（open-type=getPhoneNumber code 换号；演示环境返回明确提示）。 */
    @PostMapping("/phone")
    @Perm(module = "mp", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> bindPhone(@RequestBody PhoneRequest req) {
        return ApiResponse.ok(service.bindPhone(UserContext.get().userId(), req.code()));
    }

    /** 专属小程序码（scene=邀请码）；Mock 模式返回 mock=true 占位。 */
    @GetMapping("/invite/qrcode")
    @Perm(module = "mp")
    public ApiResponse<Map<String, Object>> inviteQrcode() {
        return ApiResponse.ok(service.inviteQrcode(UserContext.get().userId()));
    }

    @GetMapping("/me")
    @Perm(module = "mp")
    public ApiResponse<Map<String, Object>> me(@RequestParam(required = false) String projectId) {
        var user = UserContext.get();
        return ApiResponse.ok(service.me(user.userId(), user.memberNo(), projectId));
    }

    /** 裂变主页：专属邀请码 + 分享路径 + 下线树 + 邀请成长值。 */
    @GetMapping("/invite")
    @Perm(module = "mp")
    public ApiResponse<Map<String, Object>> invite() {
        var user = UserContext.get();
        return ApiResponse.ok(service.myInvite(user.userId(), user.memberNo()));
    }

    @GetMapping("/plans")
    @Perm(module = "mp")
    public ApiResponse<List<Map<String, Object>>> plans() {
        return ApiResponse.ok(orderService.plans(true));
    }

    public record MpOrder(@NotBlank String planCode, String channel, String projectId) {
    }

    /** 下单（memberNo 取自 JWT；支持幂等键）。 */
    @PostMapping("/orders")
    @Perm(module = "mp", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> createOrder(@RequestBody MpOrder req,
                                                        @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        if (!idempotency.tryRegister(key, "/mp/orders")) {
            return ApiResponse.ok(Map.of("result", "重复提交，已忽略", "idempotent", true));
        }
        var user = UserContext.get();
        String channel = req.channel() == null ? "android" : req.channel();
        String projectId = req.projectId() == null ? service.defaultProject() : req.projectId();
        return ApiResponse.ok(orderService.createOrder(user.memberNo(), req.planCode(), channel, projectId));
    }

    /**
     * 支付（M3b Mock 适配器：接口对齐 wx.requestVirtualPayment 回调语义，幂等键=确定性流水号，
     * 重复点击只支付一次；M3c 换真实虚拟支付回调，本端点退役）。
     */
    @PostMapping("/orders/{orderNo}/pay")
    @Perm(module = "mp", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> pay(@PathVariable String orderNo) {
        if (!mockPayEnabled) {
            // 生产环境（SCP_MOCK_PAY=false）：支付确认只认微信虚拟支付服务端回调，禁止客户端直报成功
            throw BusinessException.forbidden("当前环境不支持演示支付，请走微信支付");
        }
        var user = UserContext.get();
        // 只允许支付自己的订单
        boolean mine = orderService.orders(user.memberNo(), null).stream()
                .anyMatch(o -> orderNo.equals(o.get("order_no")));
        if (!mine) {
            throw com.fenglema.scp.common.BusinessException.forbidden("只能支付本人订单");
        }
        return ApiResponse.ok(orderService.paymentCallback(orderNo, "MPCB-" + orderNo));
    }

    @GetMapping("/my-group")
    @Perm(module = "mp")
    public ApiResponse<Map<String, Object>> myGroup(@RequestParam(required = false) String projectId) {
        return ApiResponse.ok(service.myGroup(UserContext.get().userId(), projectId));
    }

    @GetMapping("/courses")
    @Perm(module = "mp")
    public ApiResponse<List<Map<String, Object>>> courses() {
        return ApiResponse.ok(service.courses());
    }

    @GetMapping("/faq")
    @Perm(module = "mp")
    public ApiResponse<List<Map<String, Object>>> faq() {
        return ApiResponse.ok(service.faq());
    }

    /** 档案卡（「我的」页信息卡：个微号/城市/入会时间/来源渠道/推荐人）。 */
    @GetMapping("/profile")
    @Perm(module = "mp")
    public ApiResponse<Map<String, Object>> profile() {
        return ApiResponse.ok(service.profileCard(UserContext.get().userId()));
    }

    /** 收益（只读镜像）+ 提现记录。 */
    @GetMapping("/earnings")
    @Perm(module = "mp")
    public ApiResponse<Map<String, Object>> earnings() {
        return ApiResponse.ok(service.earnings(UserContext.get().userId()));
    }

    public record MpWithdrawal(@NotNull BigDecimal amount, @NotBlank String method, String accountInfo) {
    }

    /** 提现申请（审批协同，打款归外部系统）：memberNo 取自 JWT，支持幂等键。 */
    @PostMapping("/withdrawals")
    @Perm(module = "mp", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> withdraw(@RequestBody MpWithdrawal req,
                                                     @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        if (!idempotency.tryRegister(key, "/mp/withdrawals")) {
            return ApiResponse.ok(Map.of("result", "重复提交，已按首次受理", "idempotent", true));
        }
        var user = UserContext.get();
        return ApiResponse.ok(withdrawalService.apply(user.userId(), req.amount(), req.method(),
                req.accountInfo(), key, user.displayName()));
    }

    /** 我的任务（打卡得积分）。 */
    @GetMapping("/tasks")
    @Perm(module = "mp")
    public ApiResponse<List<Map<String, Object>>> tasks() {
        return ApiResponse.ok(taskService.list(UserContext.get().userId()));
    }

    /** 完成任务：带归属校验（只能完成本人任务），完成得积分。 */
    @PostMapping("/tasks/{id}/complete")
    @Perm(module = "mp", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> completeTask(@PathVariable long id) {
        return ApiResponse.ok(taskService.complete(id, UserContext.get().userId()));
    }
}
