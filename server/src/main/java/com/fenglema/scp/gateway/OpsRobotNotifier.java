package com.fenglema.scp.gateway;

import com.fenglema.scp.common.Json;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;

/**
 * 企微「内部群机器人」通知器（官方 webhook，文档 91770）——真实通道，非 Mock。
 * 官方边界（2026-07 核实）：群机器人仅可加入**内部群**，客户群不可用（无 API 突破，
 * 协议类外挂违反 CLAUDE.md §17 不做）。因此本通知器只用于**运营协同**出站：
 * 群发派发提醒群主确认、到期/风险告警等。频控 20 条/分钟（本系统量级远低于此）。
 *
 * 配置：scp.wecom.ops-robot-webhook（env SCP_WECOM_OPS_ROBOT_WEBHOOK），
 * 即企微内部群添加机器人后得到的 webhook 地址；留空则静默跳过（开发/CI 环境）。
 * 发送为 best-effort：失败只记日志，绝不影响业务事务。
 */
@Component
public class OpsRobotNotifier {

    private static final Logger log = LoggerFactory.getLogger(OpsRobotNotifier.class);

    private final String webhookUrl;
    private final RestClient http;

    public OpsRobotNotifier(@Value("${scp.wecom.ops-robot-webhook:}") String webhookUrl) {
        this.webhookUrl = webhookUrl == null ? "" : webhookUrl.trim();
        // M8：连接/读取超时，防企微侧慢响应挂起线程（best-effort 通知，宁可快速失败）
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(2).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(3).toMillis());
        this.http = RestClient.builder().requestFactory(factory).build();
    }

    public boolean enabled() {
        return !webhookUrl.isBlank();
    }

    /** 发送 markdown 消息到运营内部群（机器人 webhook）。返回是否实际送出。 */
    public boolean sendMarkdown(String content) {
        if (!enabled()) {
            log.debug("[OpsRobot] 未配置 webhook，跳过通知：{}", content);
            return false;
        }
        try {
            String body = Json.obj("msgtype", "markdown",
                    "markdown", Map.of("content", content));
            String resp = http.post().uri(webhookUrl)
                    .header("Content-Type", "application/json")
                    .body(body)
                    .retrieve()
                    .body(String.class);
            boolean ok = resp != null && resp.contains("\"errcode\":0");
            if (!ok) {
                log.warn("[OpsRobot] 企微机器人返回异常：{}", resp);
            }
            return ok;
        } catch (Exception e) {
            log.warn("[OpsRobot] 企微机器人通知失败（best-effort，不影响业务）：{}", e.getMessage());
            return false;
        }
    }
}
