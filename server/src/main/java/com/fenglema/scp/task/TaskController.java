package com.fenglema.scp.task;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.Perm;
import jakarta.validation.constraints.NotBlank;
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

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    @GetMapping
    @Perm(module = "assignment")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(required = false) String taskType,
                                                       @RequestParam(required = false) String status,
                                                       @RequestParam(required = false) String projectId) {
        return ApiResponse.ok(service.list(taskType, status, projectId));
    }

    @GetMapping("/{id}")
    @Perm(module = "assignment")
    public ApiResponse<Map<String, Object>> get(@PathVariable long id) {
        return ApiResponse.ok(service.get(id));
    }

    @PostMapping("/{id}/claim")
    @Perm(module = "assignment", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> claim(@PathVariable long id) {
        return ApiResponse.ok(service.claim(id));
    }

    public record AttemptRequest(@NotBlank String result, String failReason) {
    }

    @PostMapping("/{id}/attempts")
    @Perm(module = "assignment", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> attempt(@PathVariable long id,
                                                    @RequestBody AttemptRequest req,
                                                    @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return ApiResponse.ok(service.attempt(id, req.result(), req.failReason(), key));
    }

    public record EvidenceRequest(String kind, @NotBlank String content) {
    }

    @PostMapping("/{id}/evidence")
    @Perm(module = "assignment", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> evidence(@PathVariable long id, @RequestBody EvidenceRequest req) {
        return ApiResponse.ok(service.addEvidence(id, req.kind(), req.content()));
    }
}
