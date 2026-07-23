package com.fenglema.scp.ops;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.UserContext;
import com.fenglema.scp.identity.MemberService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** 会员端任务（运营侧视角）：逻辑统一在 MemberTaskService，与小程序端共用。 */
@RestController
@RequestMapping("/api/v1/member-tasks")
public class MemberTaskController {

    private final MemberService memberService;
    private final MemberTaskService taskService;

    public MemberTaskController(MemberService memberService, MemberTaskService taskService) {
        this.memberService = memberService;
        this.taskService = taskService;
    }

    @GetMapping
    @Perm(module = "users")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam String memberNo) {
        UserContext.assertMemberAccess(memberNo);
        return ApiResponse.ok(taskService.list(memberService.idOf(memberNo)));
    }

    @PostMapping("/{id}/complete")
    @Perm(module = "users", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> complete(@PathVariable long id) {
        // 运营端不限归属；SELF 范围用户走 /mp/tasks/{id}/complete（带归属校验）
        return ApiResponse.ok(taskService.complete(id, null));
    }
}
