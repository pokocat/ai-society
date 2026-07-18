package com.fenglema.scp.sync;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.IdempotencyGuard;
import com.fenglema.scp.common.Perm;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/sync")
public class SyncController {

    private final SyncService service;
    private final IdempotencyGuard idempotency;

    public SyncController(SyncService service, IdempotencyGuard idempotency) {
        this.service = service;
        this.idempotency = idempotency;
    }

    public record ImportMember(@NotBlank String name, String phone, String city, String sourceChannel,
                               @NotBlank String projectId, String identity, String referrerNo, String inviteCode) {
    }

    /** 人工导入待分配会员（SPEC §13.2 四类来源之一）。支持 Idempotency-Key 防重复建档（§22）。 */
    @PostMapping("/import/pending-member")
    @Perm(module = "assignment", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> importPendingMember(@RequestBody ImportMember req,
                                                                @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        if (!idempotency.tryRegister(key, "/sync/import/pending-member")) {
            return ApiResponse.ok(Map.of("result", "重复提交，已忽略", "idempotent", true));
        }
        return ApiResponse.ok(service.ingestPendingMember("人工导入", "人工导入",
                new SyncService.IncomingMember(req.name(), req.phone(), req.city(), req.sourceChannel(),
                        req.projectId(), req.identity(), req.referrerNo(), req.inviteCode(), null, null, null)));
    }

    @GetMapping("/jobs")
    @Perm(module = "integrations")
    public ApiResponse<List<Map<String, Object>>> jobs() {
        return ApiResponse.ok(service.jobs());
    }

    @GetMapping("/errors")
    @Perm(module = "integrations")
    public ApiResponse<List<Map<String, Object>>> errors() {
        return ApiResponse.ok(service.errors());
    }

    /** 对账报告：聚合 vs 明细（SPEC §16-3）。 */
    @GetMapping("/reconcile")
    @Perm(module = "integrations")
    public ApiResponse<List<Map<String, Object>>> reconcile() {
        return ApiResponse.ok(service.reconcile());
    }
}
