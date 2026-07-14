package com.fenglema.scp.identity;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.Perm;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/referral")
public class ReferralController {

    private final ReferralService service;

    public ReferralController(ReferralService service) {
        this.service = service;
    }

    public record BindRequest(@NotBlank String memberNo, @NotBlank String referrerNo, String source, String inviteCode) {
    }

    /** 绑定推荐关系：服务端校验 单推荐人/无环/≤3级（本体三公理）。 */
    @PostMapping("/bind")
    @Perm(module = "users", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> bind(@RequestBody BindRequest req) {
        return ApiResponse.ok(service.bind(req.memberNo(), req.referrerNo(), req.source(), req.inviteCode()));
    }

    @GetMapping("/{memberNo}/chain")
    @Perm(module = "users")
    public ApiResponse<Map<String, Object>> chain(@PathVariable String memberNo) {
        return ApiResponse.ok(service.chain(memberNo));
    }

    /** 影响力矩阵：关系层级（lv1/lv2/lv3）× 会员身份 的覆盖人数聚合（金服端影响力页数据源）。 */
    @GetMapping("/{memberNo}/influence-matrix")
    @Perm(module = "users")
    public ApiResponse<List<Map<String, Object>>> influenceMatrix(@PathVariable String memberNo) {
        return ApiResponse.ok(service.influenceMatrix(memberNo));
    }
}
