package com.fenglema.scp.identity;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.UserContext;
import jakarta.validation.constraints.NotBlank;
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
@RequestMapping("/api/v1/members")
public class MemberController {

    private final MemberService service;

    public MemberController(MemberService service) {
        this.service = service;
    }

    @GetMapping
    @Perm(module = "users")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(required = false) String projectId,
                                                       @RequestParam(required = false) String identity,
                                                       @RequestParam(required = false) String keyword) {
        return ApiResponse.ok(service.list(projectId, identity, keyword));
    }

    @GetMapping("/{memberNo}/profile")
    @Perm(module = "users")
    public ApiResponse<Map<String, Object>> profile(@PathVariable String memberNo) {
        UserContext.assertMemberAccess(memberNo);
        return ApiResponse.ok(service.profile(memberNo));
    }

    @GetMapping("/{memberNo}/timeline")
    @Perm(module = "users")
    public ApiResponse<List<Map<String, Object>>> timeline(@PathVariable String memberNo) {
        UserContext.assertMemberAccess(memberNo);
        return ApiResponse.ok(service.timeline(memberNo));
    }

    public record AddIdentifier(@NotBlank String idType, @NotBlank String idValue, String sourceSystem) {
    }

    /** 身份并档：命中既有标识即触发统一会员合并（SPEC §6.4、§16-1）。 */
    @PostMapping("/{memberNo}/identifiers")
    @Perm(module = "users", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> addIdentifier(@PathVariable String memberNo, @RequestBody AddIdentifier req) {
        return ApiResponse.ok(service.addIdentifier(memberNo, req.idType(), req.idValue(), req.sourceSystem()));
    }
}
