package com.fenglema.scp.ops;

import com.fenglema.scp.common.Rows;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * 推广码/邀请码（从 InviteCodeController 抽出，供运营端与小程序端共用）：
 * 短码 ≤32 字符（可作 wxacode scene 映射），7 天有效自动轮换，rotated_from 保留轮换链。
 */
@Service
public class InviteCodeService {

    private final JdbcClient db;

    public InviteCodeService(JdbcClient db) {
        this.db = db;
    }

    /** 取当前有效码；没有则自动轮换生成。 */
    @Transactional
    public Map<String, Object> mine(long memberId, String projectScope) {
        return db.sql("""
                        SELECT * FROM invite_code
                        WHERE owner_member_id = :mid
                          AND ((CAST(:scope AS text) IS NULL AND project_scope IS NULL) OR project_scope = :scope)
                          AND valid_until > now()
                        ORDER BY created_at DESC LIMIT 1
                        """)
                .param("mid", memberId).param("scope", projectScope)
                .query(Rows.MAP).optional()
                .orElseGet(() -> rotate(memberId, projectScope));
    }

    @Transactional
    public Map<String, Object> rotate(long memberId, String projectScope) {
        Long previous = db.sql("""
                        SELECT id FROM invite_code WHERE owner_member_id = :mid
                          AND ((CAST(:scope AS text) IS NULL AND project_scope IS NULL) OR project_scope = :scope)
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

    /** 邀请码 → 码主 member_no（过期/不存在返回 null；调用方决定是否静默跳过归因）。 */
    public String ownerOf(String inviteCode) {
        if (inviteCode == null || inviteCode.isBlank()) {
            return null;
        }
        return db.sql("""
                        SELECT m.member_no FROM invite_code ic
                        JOIN member m ON m.id = ic.owner_member_id AND m.merged_into IS NULL
                        WHERE ic.code = :code AND ic.valid_until > now()
                        """)
                .param("code", inviteCode)
                .query(String.class).optional().orElse(null);
    }
}
