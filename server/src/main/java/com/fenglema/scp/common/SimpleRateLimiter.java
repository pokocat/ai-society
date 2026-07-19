package com.fenglema.scp.common;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 进程内固定窗口限流（上架审阅项：/mp/login 防批量小号刷注册/刷邀请奖励）。
 * 单实例部署够用；多实例部署时换 Redis 令牌桶，调用方接口不变。
 */
@Component
public class SimpleRateLimiter {

    private record Window(long epochMinute, AtomicInteger count) {
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /** 返回 true=放行；false=该 key 在当前分钟窗口内已超过 limit 次。 */
    public boolean tryAcquire(String key, int limit) {
        long minute = Instant.now().getEpochSecond() / 60;
        Window w = windows.compute(key, (k, old) ->
                old == null || old.epochMinute() != minute ? new Window(minute, new AtomicInteger()) : old);
        boolean ok = w.count().incrementAndGet() <= limit;
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(e -> e.getValue().epochMinute() != minute); // 防内存膨胀
        }
        return ok;
    }
}
