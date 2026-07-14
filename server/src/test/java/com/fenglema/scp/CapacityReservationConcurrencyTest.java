package com.fenglema.scp;

import com.fenglema.scp.assignment.AssignmentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * SPEC §7.2 负载预占 / §16-4「达到容量上限时系统能可靠阻断分配」：
 * 并发向容量 5 的群塞 12 人，行锁 + 预占必须保证成功数 ≤ 5，其余被阻断。
 */
class CapacityReservationConcurrencyTest extends TestSupport {

    @Autowired
    AssignmentService assignmentService;

    @Test
    void concurrentConfirmNeverOversells() throws InterruptedException {
        int capacity = 5;
        int contenders = 12;
        String groupId = createServiceableGroup("北京", "PRO会员群", capacity, 0);

        // 预建 12 条「已推荐」在途分配（各自不同会员，目标同一群）
        List<Long> assignmentIds = new ArrayList<>();
        for (int i = 0; i < contenders; i++) {
            String memberNo = ingestMember("并发" + i + "-" + uid(), "北京", "flm-membership", "PRO会员", null);
            Long id = db.sql("""
                            INSERT INTO member_group_assignment
                                (member_id, project_id, group_id, status, assign_way, recommended_at)
                            VALUES (:m, 'flm-membership', :g, '已推荐', 'AI推荐', now()) RETURNING id
                            """)
                    .param("m", memberIdOf(memberNo)).param("g", groupId)
                    .query(Long.class).single();
            assignmentIds.add(id);
        }

        AtomicInteger success = new AtomicInteger();
        AtomicInteger blocked = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(contenders);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(contenders);
        for (Long id : assignmentIds) {
            pool.submit(() -> {
                try {
                    start.await();
                    assignmentService.confirm(id, null, null);
                    success.incrementAndGet();
                } catch (Exception e) {
                    blocked.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(60, TimeUnit.SECONDS), "并发确认应在时限内完成");
        pool.shutdown();

        int activeReservations = db.sql("""
                        SELECT count(*) FROM capacity_reservation
                        WHERE target_type = '群容量' AND target_id = :g AND status = '生效'
                        """)
                .param("g", groupId).query(Integer.class).single();

        assertEquals(capacity, success.get(), "成功确认数必须等于容量");
        assertEquals(contenders - capacity, blocked.get(), "超出容量的确认必须被阻断");
        assertTrue(activeReservations <= capacity, "生效预占不得超过容量");
    }
}
