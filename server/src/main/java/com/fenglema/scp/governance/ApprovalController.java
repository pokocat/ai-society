package com.fenglema.scp.governance;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.Perm;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/approvals")
public class ApprovalController {

    private final ApprovalService service;

    public ApprovalController(ApprovalService service) {
        this.service = service;
    }

    @GetMapping
    @Perm(module = "approval")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(required = false) String type,
                                                       @RequestParam(required = false) String status) {
        return ApiResponse.ok(service.list(type, status));
    }

    @GetMapping("/{id}")
    @Perm(module = "approval")
    public ApiResponse<Map<String, Object>> get(@PathVariable long id) {
        return ApiResponse.ok(service.get(id));
    }

    public record Decision(@NotNull Boolean approve, String comment) {
    }

    @PostMapping("/{id}/decision")
    @Perm(module = "approval", action = Perm.Action.APPROVE)
    public ApiResponse<Map<String, Object>> decide(@PathVariable long id, @RequestBody Decision req) {
        return ApiResponse.ok(service.decide(id, req.approve(), req.comment()));
    }
}
