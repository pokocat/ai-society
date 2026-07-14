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
@RequestMapping("/api/v1/accounts")
public class AccountController {

    private final AccountService service;

    public AccountController(AccountService service) {
        this.service = service;
    }

    @GetMapping
    @Perm(module = "accounts")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(required = false) String type,
                                                       @RequestParam(required = false) String status,
                                                       @RequestParam(required = false) String projectId,
                                                       @RequestParam(required = false) String keyword) {
        return ApiResponse.ok(service.list(type, status, projectId, keyword));
    }

    @GetMapping("/{id}")
    @Perm(module = "accounts")
    public ApiResponse<Map<String, Object>> get(@PathVariable String id) {
        return ApiResponse.ok(service.get(id));
    }

    public record CreateAccount(@NotBlank String id, @NotBlank String accountType, @NotBlank String name,
                                @NotBlank String identifier, String phone, String region, String city,
                                Long custodianEmployeeId, Long userEmployeeId) {
    }

    @PostMapping
    @Perm(module = "accounts", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> create(@RequestBody CreateAccount req) {
        return ApiResponse.ok(service.create(req));
    }

    public record StatusChange(@NotBlank String status, String reason) {
    }

    @PatchMapping("/{id}/status")
    @Perm(module = "accounts", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> changeStatus(@PathVariable String id, @RequestBody StatusChange req) {
        return ApiResponse.ok(service.changeStatus(id, req.status(), req.reason()));
    }

    public record AssignProject(@NotBlank String projectId) {
    }

    @PostMapping("/{id}/assignments")
    @Perm(module = "resourceconfig", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> assign(@PathVariable String id, @RequestBody AssignProject req) {
        return ApiResponse.ok(service.assignToProject(id, req.projectId()));
    }

    @PostMapping("/{id}/assignments/revoke")
    @Perm(module = "resourceconfig", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> revoke(@PathVariable String id, @RequestBody AssignProject req) {
        return ApiResponse.ok(service.revokeFromProject(id, req.projectId()));
    }

    public record CreateHandover(Long toEmployeeId, String reason) {
    }

    @PostMapping("/{id}/handovers")
    @Perm(module = "accounts", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> handover(@PathVariable String id, @RequestBody CreateHandover req) {
        return ApiResponse.ok(service.createHandover(id, req.toEmployeeId(), req.reason()));
    }
}
