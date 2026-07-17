package com.fenglema.scp.content;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.Perm;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/** 运营内容域端点（M3 §4.4）：欢迎语（全自动）/ 群发（半自动，群主确认）/ 讲课（群直播）。 */
@RestController
@RequestMapping("/api/v1/content")
public class ContentController {

    private final ContentService service;

    public ContentController(ContentService service) {
        this.service = service;
    }

    // ── 欢迎语 ──

    @GetMapping("/welcome-templates")
    @Perm(module = "content")
    public ApiResponse<List<Map<String, Object>>> welcomeTemplates(@RequestParam(required = false) String status) {
        return ApiResponse.ok(service.welcomeTemplates(status));
    }

    public record CreateWelcome(@NotBlank String name, String scopeGroupType, String projectId,
                                @NotNull Map<String, Object> content) {
    }

    @PostMapping("/welcome-templates")
    @Perm(module = "content", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> createWelcome(@RequestBody CreateWelcome req) {
        return ApiResponse.ok(service.createWelcomeTemplate(req.name(), req.scopeGroupType(),
                req.projectId(), req.content()));
    }

    public record PatchWelcome(String status, Map<String, Object> content) {
    }

    @PatchMapping("/welcome-templates/{id}")
    @Perm(module = "content", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> patchWelcome(@PathVariable long id, @RequestBody PatchWelcome req) {
        return ApiResponse.ok(service.patchWelcomeTemplate(id, req.status(), req.content()));
    }

    @PostMapping("/welcome-templates/{id}/sync")
    @Perm(module = "content", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> syncWelcome(@PathVariable long id) {
        return ApiResponse.ok(service.syncWelcomeTemplate(id));
    }

    // ── 群发 ──

    @GetMapping("/broadcasts")
    @Perm(module = "content")
    public ApiResponse<List<Map<String, Object>>> broadcasts(@RequestParam(required = false) String status) {
        return ApiResponse.ok(service.broadcasts(status));
    }

    public record CreateBroadcast(@NotBlank String title, @NotNull Map<String, Object> content,
                                  Map<String, Object> targetScope) {
    }

    @PostMapping("/broadcasts")
    @Perm(module = "content", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> createBroadcast(@RequestBody CreateBroadcast req) {
        return ApiResponse.ok(service.createBroadcast(req.title(), req.content(), req.targetScope()));
    }

    /** 派发：圈群→额度校验→生成群主「群发确认」任务（半自动，跳过数如实返回）。 */
    @PostMapping("/broadcasts/{id}/dispatch")
    @Perm(module = "content", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> dispatch(@PathVariable long id) {
        return ApiResponse.ok(service.dispatchBroadcast(id));
    }

    /** 状态收敛（任务全完成→已完成）。 */
    @PostMapping("/broadcasts/{id}/refresh")
    @Perm(module = "content")
    public ApiResponse<Map<String, Object>> refresh(@PathVariable long id) {
        return ApiResponse.ok(service.refreshBroadcast(id));
    }

    public record CancelBroadcast(String reason) {
    }

    @PostMapping("/broadcasts/{id}/cancel")
    @Perm(module = "content", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> cancel(@PathVariable long id, @RequestBody CancelBroadcast req) {
        return ApiResponse.ok(service.cancelBroadcast(id, req.reason()));
    }

    // ── 讲课 ──

    @GetMapping("/courses")
    @Perm(module = "content")
    public ApiResponse<List<Map<String, Object>>> courses(@RequestParam(required = false) String status) {
        return ApiResponse.ok(service.courses(status));
    }

    public record CreateCourse(@NotBlank String title, String speaker, @NotNull OffsetDateTime scheduledAt,
                               Map<String, Object> groupScope) {
    }

    @PostMapping("/courses")
    @Perm(module = "content", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> createCourse(@RequestBody CreateCourse req) {
        return ApiResponse.ok(service.createCourse(req.title(), req.speaker(), req.scheduledAt(), req.groupScope()));
    }

    @PostMapping("/courses/{id}/start-live")
    @Perm(module = "content", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> startLive(@PathVariable long id) {
        return ApiResponse.ok(service.startLive(id));
    }

    @PostMapping("/courses/{id}/finish")
    @Perm(module = "content", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> finish(@PathVariable long id) {
        return ApiResponse.ok(service.finishLive(id));
    }
}
