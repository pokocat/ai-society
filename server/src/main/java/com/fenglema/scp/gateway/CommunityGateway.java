package com.fenglema.scp.gateway;

import java.util.List;
import java.util.Map;

/**
 * 社群网关抽象：屏蔽企微/个微渠道差异（会话既定架构）。
 * 首期由 MockCommunityGateway 实现；M3c 接真实企微凭证时新增 WeComCommunityGateway
 * 并按 profile 切换，业务代码不改。
 * M3 扩展（方案 §5.1）：活码/欢迎语/群发/群详情/群直播——全部对应企微官方能力，
 * 不含任何客户群内自动收发消息（官方无此能力，外挂协议违反 CLAUDE.md §17）。
 */
public interface CommunityGateway {

    /** 生成群二维码（Mock 返回演示图；企微实现调 contact_way/群活码）。 */
    Map<String, Object> generateGroupQrcode(String groupId);

    /** 下发加好友请求提示（Mock 直接返回受理；真实场景为任务提醒，不自动操作个微，SPEC §2.3）。 */
    Map<String, Object> notifyFriendRequest(String accountId, String memberNo);

    /**
     * 「加入群聊」活码（join_way）：state ≤30 字符携带归因上下文（邀请码/会员号）；
     * 企微实现 auto_create_room=1 满员自动开新群。返回 {joinWayId, qrcodeUrl, state}。
     */
    Map<String, Object> createJoinWay(String groupId, String state);

    /** 同步入群欢迎语模板到企微素材库（≤100 条约束在服务层），返回 {materialId}。 */
    Map<String, Object> syncWelcomeTemplate(long templateId, String contentJson);

    /**
     * 创建客户群群发任务（半自动，诚实建模：API 只建任务，群主客户端手动确认；
     * 每群每天≤1 条的额度由派发器校验）。返回 {msgId, chatCount}。
     */
    Map<String, Object> createGroupBroadcast(long planId, List<String> chatIds);

    /** 拉取客户群详情（成员明细/invitor/join_scene，对账用）。 */
    Map<String, Object> fetchGroupDetail(String chatId);

    /** 创建企微群直播（讲课主力，不占群发额度），返回 {liveId, watchUrl}。 */
    Map<String, Object> createLive(long courseSessionId, String title, String speaker);

    /** 直播状态/回放查询，返回 {liveId, status, replayUrl}。 */
    Map<String, Object> fetchLiveInfo(String liveId);
}
