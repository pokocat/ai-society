package com.fenglema.scp;

import com.fenglema.scp.content.ContentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * M1（护栏 25）：群发每日配额在并发派发下不得被穿透。
 * 两个计划并发派发到同一群，配额默认 1 → 只应生成 1 条「群发确认」任务，另一条因当日额度跳过。
 * 原缺陷：只锁 broadcast_plan 行不锁群，两派发各读到当日计数 0 各插一条。
 */
class BroadcastQuotaConcurrencyTest extends TestSupport {

    @Autowired
    ContentService contentService;

    @Test
    void perGroupDailyQuotaHoldsUnderConcurrentDispatch() throws InterruptedException {
        String groupType = "群发测试群" + uid();
        String groupId = createServiceableGroup("北京", groupType, 100, 10);
        db.sql("UPDATE community_group SET status = '服务中' WHERE id = :g").param("g", groupId).update();

        int quota = db.sql("SELECT broadcast_daily_quota FROM resource_rules WHERE id = 1")
                .query(Integer.class).single();

        Map<String, Object> scope = Map.of("projectId", "flm-membership", "groupType", groupType);
        Map<String, Object> content = Map.of("text", "并发群发测试");
        long planA = ((Number) contentService.createBroadcast("BC-A-" + uid(), content, scope).get("id")).longValue();
        long planB = ((Number) contentService.createBroadcast("BC-B-" + uid(), content, scope).get("id")).longValue();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        for (long planId : new long[]{planA, planB}) {
            pool.submit(() -> {
                try {
                    start.await();
                    contentService.dispatchBroadcast(planId);
                } catch (Exception ignored) {
                    // 忽略：一方可能因群被另一方锁定/额度已满而无任务产出
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(30, TimeUnit.SECONDS), "并发派发未在超时内完成");
        pool.shutdownNow();

        int tasks = db.sql("""
                        SELECT count(*) FROM task_item
                        WHERE group_id = :g AND task_type = '群发确认' AND created_at::date = now()::date
                        """)
                .param("g", groupId).query(Integer.class).single();
        assertEquals(quota, tasks, "每群每日群发确认任务数必须恰为配额，并发不得穿透");
    }
}
