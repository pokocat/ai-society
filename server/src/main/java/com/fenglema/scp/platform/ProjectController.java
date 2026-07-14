package com.fenglema.scp.platform;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.Perm;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService service;

    public ProjectController(ProjectService service) {
        this.service = service;
    }

    @GetMapping
    @Perm(module = "workspace")
    public ApiResponse<List<Map<String, Object>>> list() {
        return ApiResponse.ok(service.list());
    }

    @GetMapping("/{id}")
    @Perm(module = "workspace")
    public ApiResponse<Map<String, Object>> get(@PathVariable String id) {
        return ApiResponse.ok(service.get(id));
    }

    public record CreateProject(@NotBlank String code, @NotBlank String name, @NotBlank String shortName,
                                @NotBlank String category, String serviceRegion, String apiType,
                                String dataScope, String endpoint) {
    }

    @PostMapping
    @Perm(module = "integrations", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> create(@RequestBody CreateProject req) {
        return ApiResponse.ok(service.create(req));
    }

    public record StatusChange(@NotBlank String status) {
    }

    @PatchMapping("/{id}/status")
    @Perm(module = "integrations", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> changeStatus(@PathVariable String id, @RequestBody StatusChange req) {
        return ApiResponse.ok(service.changeStatus(id, req.status()));
    }

    @PostMapping("/{id}/sync")
    @Perm(module = "integrations", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> sync(@PathVariable String id) {
        return ApiResponse.ok(service.markSynced(id));
    }
}
