package com.fenglema.scp.gateway;

import org.springframework.stereotype.Component;

import java.util.Map;

/** 默认 Mock 通道：返回演示二维码与受理回执，用于三端联调与演示。 */
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
}
