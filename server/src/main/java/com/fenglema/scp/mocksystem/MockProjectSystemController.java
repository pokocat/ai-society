package com.fenglema.scp.mocksystem;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.sync.SyncService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

/**
 * mock-project-system：模拟外部 会员/订单/活动 系统向中台推送数据（演示与联调用）。
 * 真实项目系统按同样的载荷走 /api/v1/webhook 或开放 API 接入（SPEC §13.2）；
 * 本控制器仅在演示环境暴露，等价于外部系统的出站调用。
 * 生产必须置 SCP_MOCK_ENDPOINTS=false（无鉴权注入口，push-earnings 可直改余额——上架审阅项）。
 */
@ConditionalOnProperty(name = "scp.mock-endpoints.enabled", havingValue = "true", matchIfMissing = false)
@RestController
@RequestMapping("/api/v1/mock")
public class MockProjectSystemController {

    private final SyncService syncService;

    public MockProjectSystemController(SyncService syncService) {
        this.syncService = syncService;
    }

    public record PushMember(@NotBlank String name, String phone, String city, String sourceChannel,
                             @NotBlank String projectId, String identity, String referrerNo, String inviteCode,
                             String unionid, String wechatId) {
    }

    /** 模拟：项目系统产生新的待分配会员（报名/下单/扫码进线）。 */
    @PostMapping("/push-pending-member")
    public ApiResponse<Map<String, Object>> pushMember(@RequestBody PushMember req) {
        return ApiResponse.ok(syncService.ingestPendingMember("mock-project-system", "Webhook",
                new SyncService.IncomingMember(req.name(), req.phone(), req.city(), req.sourceChannel(),
                        req.projectId(), req.identity(), req.referrerNo(), req.inviteCode(),
                        req.unionid(), req.wechatId(), null)));
    }

    public record PushOrder(@NotBlank String externalOrderNo, @NotBlank String memberNo, String projectId,
                            @NotBlank String productName, @NotNull BigDecimal amount, @NotBlank String status) {
    }

    /** 模拟：订单系统推送订单事件（只读镜像）。 */
    @PostMapping("/push-order")
    public ApiResponse<Map<String, Object>> pushOrder(@RequestBody PushOrder req) {
        return ApiResponse.ok(syncService.ingestOrder("mock-project-system", req.externalOrderNo(),
                req.memberNo(), req.projectId(), req.productName(), req.amount(), req.status()));
    }

    public record PushEarnings(@NotBlank String memberNo, String projectId, @NotNull BigDecimal totalEst,
                               @NotNull BigDecimal withdrawable, BigDecimal pending, BigDecimal frozen) {
    }

    /** 模拟：财务系统推送收益快照。 */
    @PostMapping("/push-earnings")
    public ApiResponse<Map<String, Object>> pushEarnings(@RequestBody PushEarnings req) {
        return ApiResponse.ok(syncService.ingestEarnings("mock-project-system", req.memberNo(), req.projectId(),
                req.totalEst(), req.withdrawable(),
                req.pending() == null ? BigDecimal.ZERO : req.pending(),
                req.frozen() == null ? BigDecimal.ZERO : req.frozen()));
    }
}
