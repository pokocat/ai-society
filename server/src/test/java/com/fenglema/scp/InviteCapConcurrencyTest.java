package com.fenglema.scp;

import com.fenglema.scp.identity.ReferralService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * H2（护栏 25）：邀请成长值每日封顶在并发下不得被击穿。
 * 同一邀请人被 N（&gt;cap）个新号并发绑定（各自独立事务），发奖次数必须恰为 cap——
 * 关系链照常全绑（归因不受封顶影响）。原缺陷：读计数与写发放间无锁，TOCTOU 可并发多发。
 */
class InviteCapConcurrencyTest extends TestSupport {

    @Autowired
    ReferralService referralService;

    private String makeMember(String label) {
        String no = "U-IC" + uid();
        db.sql("INSERT INTO member (member_no, name, city, source_channel) VALUES (:no, :name, '北京', '转介绍')")
                .param("no", no).param("name", label + no).update();
        return no;
    }

    @Test
    void dailyAwardCapHoldsUnderConcurrency() throws InterruptedException {
        int cap = db.sql("SELECT invite_award_daily_cap FROM resource_rules WHERE id = 1")
                .query(Integer.class).single();
        int contenders = cap + 4;
        String referrerNo = makeMember("邀请人");
        long referrerId = memberIdOf(referrerNo);

        List<String> invitees = new ArrayList<>();
        for (int i = 0; i < contenders; i++) {
            invitees.add(makeMember("受邀" + i + "-"));
        }

        ExecutorService pool = Executors.newFixedThreadPool(contenders);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(contenders);
        for (String inviteeNo : invitees) {
            pool.submit(() -> {
                try {
                    start.await();
                    referralService.bind(inviteeNo, referrerNo, "邀请码", "IC-" + uid());
                } catch (Exception ignored) {
                    // 绑定本身应全部成功；此处仅防线程池吞异常导致 latch 不减
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(30, TimeUnit.SECONDS), "并发绑定未在超时内完成");
        pool.shutdownNow();

        int bound = db.sql("SELECT count(*) FROM referral_relation WHERE referrer_id = :r")
                .param("r", referrerId).query(Integer.class).single();
        assertEquals(contenders, bound, "关系链应全部绑定（归因不受奖励封顶限制）");

        int awarded = db.sql("""
                        SELECT count(*) FROM growth_ledger
                        WHERE member_id = :r AND reason = '邀请成功' AND created_at >= date_trunc('day', now())
                        """)
                .param("r", referrerId).query(Integer.class).single();
        assertEquals(cap, awarded, "邀请奖励发放次数必须恰为每日封顶，并发不得击穿");
    }
}
