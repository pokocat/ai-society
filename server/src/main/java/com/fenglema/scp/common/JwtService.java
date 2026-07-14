package com.fenglema.scp.common;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final Duration ttl;

    public JwtService(@Value("${scp.jwt.secret}") String secret,
                      @Value("${scp.jwt.ttl-hours}") long ttlHours) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.ttl = Duration.ofHours(ttlHours);
    }

    public String issue(CurrentUser user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(user.userId()))
                .claim("username", user.username())
                .claim("displayName", user.displayName())
                .claim("role", user.roleCode())
                .claim("dataScope", user.dataScope())
                .claim("memberNo", user.memberNo())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    public CurrentUser parse(String token) {
        try {
            Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return new CurrentUser(
                    Long.parseLong(c.getSubject()),
                    c.get("username", String.class),
                    c.get("displayName", String.class),
                    c.get("role", String.class),
                    c.get("dataScope", String.class),
                    c.get("memberNo", String.class));
        } catch (JwtException | IllegalArgumentException e) {
            throw BusinessException.forbidden("登录态无效或已过期");
        }
    }
}
