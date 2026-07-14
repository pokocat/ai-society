package com.fenglema.scp.ops;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.common.UserContext;
import com.fenglema.scp.identity.MemberService;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * 推广码/邀请码：短码（≤32 字符，可作 wxacode scene 映射），7 天有效自动轮换（设计稿规则）。
 * 扫码归因 → attribution_log + referral 绑定由 /referral/bind 完成。
 */
@RestController
@RequestMapping("/api/v1/invite-codes")
public class InviteCodeController {

    private final JdbcClient db;
    private final MemberService memberService;

    public InviteCodeController(JdbcClient db, MemberService memberService) {
        this.db = db;
        this.memberService = memberService;
    }

    @GetMapping("/mine")
    @Perm(module = "users")
    public ApiResponse<Map<String, Object>> mine(@RequestParam(required = false) String memberNo,
                                                 @RequestParam(required = false) String projectScope) {
        String no = memberNo != null ? memberNo : UserContext.get().memberNo();
        long memberId = memberService.idOf(no);
        var current = db.sql("""
                        SELECT * FROM invite_code
                        WHERE owner_member_id = :mid
                          AND ((:scope IS NULL AND project_scope IS NULL) OR project_scope = :scope)
                          AND valid_until > now()
                        ORDER BY created_at DESC LIMIT 1
                        """)
                .param("mid", memberId).param("scope", projectScope)
                .query(Rows.MAP).optional();
        return current.<ApiResponse<Map<String, Object>>>map(ApiResponse::ok)
                .orElseGet(() -> ApiResponse.ok(rotateInternal(memberId, projectScope)));
    }

    @PostMapping("/rotate")
    @Perm(module = "users", action = Perm.Action.EDIT)
    @Transactional
    public ApiResponse<Map<String, Object>> rotate(@RequestParam(required = false) String memberNo,
                                                   @RequestParam(required = false) String projectScope) {
        String no = memberNo != null ? memberNo : UserContext.get().memberNo();
        return ApiResponse.ok(rotateInternal(memberService.idOf(no), projectScope));
    }

    private Map<String, Object> rotateInternal(long memberId, String projectScope) {
        Long previous = db.sql("""
                        SELECT id FROM invite_code WHERE owner_member_id = :mid
                          AND ((:scope IS NULL AND project_scope IS NULL) OR project_scope = :scope)
                        ORDER BY created_at DESC LIMIT 1
                        """)
                .param("mid", memberId).param("scope", projectScope)
                .query(Long.class).optional().orElse(null);
        String code = "FLM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        db.sql("""
                INSERT INTO invite_code (code, owner_member_id, project_scope, valid_until, rotated_from)
                VALUES (:code, :mid, :scope, now() + interval '7 days', :prev)
                """)
                .param("code", code).param("mid", memberId)
                .param("scope", projectScope).param("prev", previous)
                .update();
        return db.sql("SELECT * FROM invite_code WHERE code = :code").param("code", code).query(Rows.MAP).single();
    }
}
