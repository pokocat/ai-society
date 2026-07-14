package com.fenglema.scp.assignment;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.Perm;
import jakarta.validation.constraints.NotBlank;
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
@RequestMapping("/api/v1/assignment")
public class AssignmentController {

    private final AssignmentService service;

    public AssignmentController(AssignmentService service) {
        this.service = service;
    }

    @GetMapping("/pending")
    @Perm(module = "assignment")
    public ApiResponse<List<Map<String, Object>>> pending(@RequestParam(required = false) String projectId) {
        return ApiResponse.ok(service.pendingPool(projectId));
    }

    @GetMapping
    @Perm(module = "assignment")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(required = false) String projectId,
                                                       @RequestParam(required = false) String status,
                                                       @RequestParam(required = false) String groupId) {
        return ApiResponse.ok(service.list(projectId, status, groupId));
    }

    @GetMapping("/{id}")
    @Perm(module = "assignment")
    public ApiResponse<Map<String, Object>> get(@PathVariable long id) {
        return ApiResponse.ok(service.get(id));
    }

    public record RecommendRequest(@NotBlank String memberNo, @NotBlank String projectId) {
    }

    @PostMapping("/recommend")
    @Perm(module = "assignment", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> recommend(@RequestBody RecommendRequest req) {
        return ApiResponse.ok(service.recommend(req.memberNo(), req.projectId()));
    }

    public record ConfirmRequest(@NotNull Long assignmentId, String groupId, String overrideReason) {
    }

    @PostMapping("/confirm")
    @Perm(module = "assignment", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> confirm(@RequestBody ConfirmRequest req) {
        return ApiResponse.ok(service.confirm(req.assignmentId(), req.groupId(), req.overrideReason()));
    }

    public record CancelRequest(@NotNull Long assignmentId, String reason) {
    }

    @PostMapping("/cancel")
    @Perm(module = "assignment", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> cancel(@RequestBody CancelRequest req) {
        service.transition(req.assignmentId(), null, "人工取消", req.reason());
        return ApiResponse.ok(service.get(req.assignmentId()));
    }

    /** 人工确认入群（SPEC §6.7 两条合法路径之一；另一条是 webhook 入群事件）。 */
    @PostMapping("/{id}/confirm-join")
    @Perm(module = "assignment", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> confirmJoin(@PathVariable long id) {
        return ApiResponse.ok(service.confirmJoin(id, "manual"));
    }
}
