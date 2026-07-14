package com.fenglema.scp.common;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * 幂等键守卫：任务回填/审批/同步等写接口必须携带 Idempotency-Key（SPEC §16-8）。
 * 首次登记成功返回 true；重复键返回 false（调用方应直接返回既有结果，不重复执行）。
 */
@Service
public class IdempotencyGuard {

    private final JdbcClient db;

    public IdempotencyGuard(JdbcClient db) {
        this.db = db;
    }

    public boolean tryRegister(String key, String endpoint) {
        if (key == null || key.isBlank()) {
            return true; // 未携带键则不做幂等保护（由接口自行决定是否强制）
        }
        try {
            db.sql("INSERT INTO idempotency_record (key, endpoint) VALUES (:k, :e)")
                    .param("k", key).param("e", endpoint).update();
            return true;
        } catch (DuplicateKeyException e) {
            return false;
        }
    }
}
