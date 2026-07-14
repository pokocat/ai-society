package com.fenglema.scp.gateway;

import java.util.Map;

/**
 * 社群网关抽象：屏蔽企微/个微渠道差异（会话既定架构）。
 * 首期由 MockCommunityGateway 实现；真实企微适配（外部联系人/群事件/活码）为阶段四工作，
 * 届时新增 WeComCommunityGateway 并按 profile 切换，业务代码不改。
 */
public interface CommunityGateway {

    /** 生成群二维码（Mock 返回演示图；企微实现调 contact_way/群活码）。 */
    Map<String, Object> generateGroupQrcode(String groupId);

    /** 下发加好友请求提示（Mock 直接返回受理；真实场景为任务提醒，不自动操作个微，SPEC §2.3）。 */
    Map<String, Object> notifyFriendRequest(String accountId, String memberNo);
}
