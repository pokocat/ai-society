package com.fenglema.scp.platform;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.CurrentUser;
import com.fenglema.scp.common.JwtService;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.common.UserContext;
import jakarta.validation.constraints.NotBlank;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final JdbcClient db;
    private final JwtService jwtService;

    public AuthController(JdbcClient db, JwtService jwtService) {
        this.db = db;
        this.jwtService = jwtService;
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody LoginRequest req) {
        var row = db.sql("""
                        SELECT id, username, display_name, password_hash, role_code, data_scope, member_no
                        FROM app_user WHERE username = :u AND enabled
                        """)
                .param("u", req.username())
                .query(Rows.MAP).optional()
                .orElseThrow(() -> BusinessException.forbidden("账号或密码错误"));

        if (!hash(req.password()).equals(row.get("password_hash"))) {
            throw BusinessException.forbidden("账号或密码错误");
        }
        CurrentUser user = new CurrentUser(
                ((Number) row.get("id")).longValue(),
                (String) row.get("username"),
                (String) row.get("display_name"),
                (String) row.get("role_code"),
                (String) row.get("data_scope"),
                (String) row.get("member_no"));
        return ApiResponse.ok(Map.of(
                "token", jwtService.issue(user),
                "user", user));
    }

    @GetMapping("/me")
    public ApiResponse<CurrentUser> me() {
        return ApiResponse.ok(UserContext.get());
    }

    static String hash(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] out = digest.digest(("scp:" + password).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(out);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
