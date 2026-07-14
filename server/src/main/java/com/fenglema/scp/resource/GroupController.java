package com.fenglema.scp.resource;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.Perm;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/groups")
public class GroupController {

    private final GroupService service;

    public GroupController(GroupService service) {
        this.service = service;
    }

    @GetMapping
    @Perm(module = "community")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(required = false) String projectId,
                                                       @RequestParam(required = false) String status,
                                                       @RequestParam(required = false) String groupType,
                                                       @RequestParam(required = false, defaultValue = "false") boolean poolOnly) {
        return ApiResponse.ok(service.list(projectId, status, groupType, poolOnly));
    }

    @GetMapping("/{id}")
    @Perm(module = "community")
    public ApiResponse<Map<String, Object>> get(@PathVariable String id) {
        return ApiResponse.ok(service.detail(id));
    }

    public record CreateGroup(@NotBlank String id, @NotBlank String name, @NotBlank String groupType,
                              String city, String region, String builderAccountId, Integer targetCapacity) {
    }

    @PostMapping
    @Perm(module = "community", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> create(@RequestBody CreateGroup req) {
        return ApiResponse.ok(service.create(req));
    }

    public record PatchGroup(String projectId, String builderAccountId, Integer targetCapacity, String status) {
    }

    @PatchMapping("/{id}")
    @Perm(module = "community", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> patch(@PathVariable String id, @RequestBody PatchGroup req) {
        return ApiResponse.ok(service.patch(id, req));
    }

    public record StaffingRequest(Long wecomEmployeeId, String wecomAccountId, String personalWechatId) {
    }

    /** 服务编组：配企微客服+个微客服，返回个微承接负载预测（SPEC §6.3 第3步）。 */
    @PostMapping("/{id}/staffing")
    @Perm(module = "resourceconfig", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> staffing(@PathVariable String id, @RequestBody StaffingRequest req) {
        return ApiResponse.ok(service.applyStaffing(id, req));
    }

    /** 编组前的负载预测（只算不落库）。 */
    @GetMapping("/{id}/staffing/preview")
    @Perm(module = "resourceconfig")
    public ApiResponse<Map<String, Object>> preview(@PathVariable String id, @RequestParam String personalWechatId) {
        return ApiResponse.ok(service.predictLoad(id, personalWechatId));
    }

    @PostMapping("/{id}/qrcode/rotate")
    @Perm(module = "community", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> rotateQrcode(@PathVariable String id) {
        return ApiResponse.ok(service.rotateQrcode(id));
    }
}
