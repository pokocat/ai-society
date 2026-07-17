package com.fenglema.scp.gateway;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** 默认 Mock 通道：返回演示数据，接口形状对齐企微官方 API，用于三端联调与演示（M3c 换实连）。 */
@Component
public class MockCommunityGateway implements CommunityGateway {

    @Override
    public Map<String, Object> generateGroupQrcode(String groupId) {
        return Map.of(
                "groupId", groupId,
                "imageUrl", "/reference-assets/wechat-qr.png",
                "channel", "mock");
    }

    @Override
    public Map<String, Object> notifyFriendRequest(String accountId, String memberNo) {
        return Map.of(
                "accountId", accountId,
                "memberNo", memberNo,
                "accepted", true,
                "channel", "mock");
    }

    @Override
    public Map<String, Object> createJoinWay(String groupId, String state) {
        return Map.of(
                "joinWayId", "JW-" + shortId(),
                "qrcodeUrl", "/reference-assets/wechat-qr.png",
                "state", state == null ? "" : state,
                "autoCreateRoom", true,
                "channel", "mock");
    }

    @Override
    public Map<String, Object> syncWelcomeTemplate(long templateId, String contentJson) {
        return Map.of(
                "templateId", templateId,
                "materialId", "WM-" + shortId(),
                "channel", "mock");
    }

    @Override
    public Map<String, Object> createGroupBroadcast(long planId, List<String> chatIds) {
        return Map.of(
                "planId", planId,
                "msgId", "BC-" + shortId(),
                "chatCount", chatIds.size(),
                "note", "企微群发需群主客户端确认（半自动）",
                "channel", "mock");
    }

    @Override
    public Map<String, Object> fetchGroupDetail(String chatId) {
        return Map.of(
                "chatId", chatId,
                "memberList", List.of(),
                "channel", "mock");
    }

    @Override
    public Map<String, Object> createLive(long courseSessionId, String title, String speaker) {
        String liveId = "LIVE-" + shortId();
        return Map.of(
                "courseSessionId", courseSessionId,
                "liveId", liveId,
                "watchUrl", "https://work.weixin.qq.com/live/mock/" + liveId,
                "channel", "mock");
    }

    @Override
    public Map<String, Object> fetchLiveInfo(String liveId) {
        return Map.of(
                "liveId", liveId,
                "status", "已结束",
                "replayUrl", "https://work.weixin.qq.com/live/mock/" + liveId + "/replay",
                "channel", "mock");
    }

    private String shortId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }
}
