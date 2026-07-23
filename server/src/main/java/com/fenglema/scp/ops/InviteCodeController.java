package com.fenglema.scp.ops;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.UserContext;
import com.fenglema.scp.identity.MemberService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 推广码/邀请码（运营端）。逻辑在 InviteCodeService（与小程序端 /mp/* 共用）。
 * 扫码归因 → attribution_log + referral 绑定由 /referral/bind 完成。
 */
@RestController
@RequestMapping("/api/v1/invite-codes")
public class InviteCodeController {

    private final InviteCodeService service;
    private final MemberService memberService;

    public InviteCodeController(InviteCodeService service, MemberService memberService) {
        this.service = service;
        this.memberService = memberService;
    }

    @GetMapping("/mine")
    @Perm(module = "users")
    public ApiResponse<Map<String, Object>> mine(@RequestParam(required = false) String memberNo,
                                                 @RequestParam(required = false) String projectScope) {
        String no = memberNo != null ? memberNo : UserContext.get().memberNo();
        return ApiResponse.ok(service.mine(memberService.idOf(no), projectScope));
    }

    @PostMapping("/rotate")
    @Perm(module = "users", action = Perm.Action.EDIT)
    public ApiResponse<Map<String, Object>> rotate(@RequestParam(required = false) String memberNo,
                                                   @RequestParam(required = false) String projectScope) {
        String no = memberNo != null ? memberNo : UserContext.get().memberNo();
        return ApiResponse.ok(service.rotate(memberService.idOf(no), projectScope));
    }
}
