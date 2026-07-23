package com.fenglema.scp.gateway;

import com.fenglema.scp.assignment.AssignmentService;
import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.AuditService;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.identity.MemberService;
import com.fenglema.scp.resource.GroupController;
import com.fenglema.scp.resource.GroupService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 外部事件入口（SPEC §6.7：入群成功事件是置「已入群」的合法路径之一）。
 * M3 §5.2 事件扩展：join/quit（既有）+ create（群建立→回填 wecom_chat_id）+ dismiss（群解散→归档）。
 * 归因：join 事件可带 join_way state（≤30 字符，携带邀请码/会员号上下文）；
 * 会员无法识别时进人工核对（不猜测、不静默丢弃）。
 * 验签（上架审阅项）：scp.webhook.verify-signature=true 时强制校验 msg_signature
 * （企微规则：sha1(sort(token,timestamp,nonce))；接真实企微加密通道时在此基础上加 AES 解密）。
 * 开发/CI 默认关闭（Mock 注入无签名）。
 */
@RestController
@RequestMapping("/api/v1/webhook")
public class WebhookController {

    private final JdbcClient db;
    private final AssignmentService assignmentService;
    private final MemberService memberService;
    private final GroupService groupService;
    private final AuditService audit;
    private final boolean verifySignature;
    private final String webhookToken;

    public WebhookController(JdbcClient db, AssignmentService assignmentService, MemberService memberService,
                             GroupService groupService, AuditService audit,
                             @Value("${scp.webhook.verify-signature:false}") boolean verifySignature,
                             @Value("${scp.webhook.token:}") String webhookToken) {
        this.db = db;
        this.assignmentService = assignmentService;
        this.memberService = memberService;
        this.groupService = groupService;
        this.audit = audit;
        this.verifySignature = verifySignature;
        this.webhookToken = webhookToken;
    }

    /** 企微回调 URL 参数验签：sha1(字典序拼接 token/timestamp/nonce) 必须等于 msg_signature。 */
    private void requireValidSignature(String msgSignature, String timestamp, String nonce) {
        if (!verifySignature) {
            return;
        }
        if (webhookToken == null || webhookToken.isBlank()) {
            throw BusinessException.forbidden("webhook 验签已启用但未配置 token（SCP_WEBHOOK_TOKEN）");
        }
        if (msgSignature == null || timestamp == null || nonce == null) {
            throw BusinessException.forbidden("缺少签名参数 msg_signature/timestamp/nonce");
        }
        String[] parts = {webhookToken, timestamp, nonce};
        java.util.Arrays.sort(parts);
        String expected;
        try {
            var sha1 = java.security.MessageDigest.getInstance("SHA-1");
            expected = java.util.HexFormat.of().formatHex(
                    sha1.digest(String.join("", parts).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
        if (!expected.equalsIgnoreCase(msgSignature)) {
            throw BusinessException.forbidden("webhook 签名校验失败");
        }
    }

    /** groupId 与 chatId 二选一（企微真实回调只有 chat_id，经 wecom_chat_id 反查）；state 为活码归因上下文。 */
    public record GroupEvent(@NotBlank String eventType, String groupId, String memberNo,
                             String chatId, String state) {
    }

    @PostMapping("/wecom/group-event")
    public ApiResponse<Map<String, Object>> groupEvent(
            @RequestBody GroupEvent event,
            @RequestParam(value = "msg_signature", required = false) String msgSignature,
            @RequestParam(value = "timestamp", required = false) String timestamp,
            @RequestParam(value = "nonce", required = false) String nonce) {
        requireValidSignature(msgSignature, timestamp, nonce);
        String groupId = resolveGroupId(event);
        switch (event.eventType()) {
            case "join" -> {
                long memberId = requireMember(event);
                Long assignmentId = db.sql("""
                                SELECT id FROM member_group_assignment
                                WHERE member_id = :m AND group_id = :g AND status = '已邀请'
                                ORDER BY updated_at DESC LIMIT 1
                                """)
                        .param("m", memberId).param("g", groupId)
                        .query(Long.class).optional()
                        .orElseThrow(() -> BusinessException.conflict(
                                "未找到该会员在此群的「已邀请」分配记录，事件进人工核对"));
                return ApiResponse.ok(assignmentService.confirmJoin(assignmentId, "webhook"));
            }
            case "quit" -> {
                long memberId = requireMember(event);
                Long assignmentId = db.sql("""
                                SELECT id FROM member_group_assignment
                                WHERE member_id = :m AND group_id = :g AND status = '已入群'
                                ORDER BY updated_at DESC LIMIT 1
                                """)
                        .param("m", memberId).param("g", groupId)
                        .query(Long.class).optional()
                        .orElseThrow(() -> BusinessException.conflict("未找到已入群记录"));
                return ApiResponse.ok(assignmentService.handleQuit(assignmentId, groupId));
            }
            case "create" -> {
                // 群建立：回填 wecom_chat_id（仅空值可回填，防覆盖）
                if (event.chatId() == null || event.chatId().isBlank()) {
                    throw new BusinessException("create 事件缺 chatId");
                }
                int updated = db.sql("""
                                UPDATE community_group SET wecom_chat_id = :c, updated_at = now()
                                WHERE id = :g AND wecom_chat_id IS NULL
                                """)
                        .param("c", event.chatId()).param("g", groupId).update();
                if (updated == 0) {
                    throw BusinessException.conflict("群 " + groupId + " 已绑定 chat_id，不可覆盖（如需换绑走人工）");
                }
                groupService.refreshStatus(groupId);
                audit.log("community_group", groupId, "企微群建立·绑定chat_id",
                        null, Map.of("wecomChatId", event.chatId()), null, null, null);
                return ApiResponse.ok(Map.of("groupId", groupId, "wecomChatId", event.chatId(), "bound", true));
            }
            case "dismiss" -> {
                // 群解散：经 GroupService.patch 合法通道置已归档（含审计）
                Map<String, Object> result = groupService.patch(groupId,
                        new GroupController.PatchGroup(null, null, null, "已归档"));
                audit.log("community_group", groupId, "企微群解散·归档");
                return ApiResponse.ok(Map.of("groupId", groupId, "status", result.get("status")));
            }
            default -> throw new BusinessException("不支持的事件类型：" + event.eventType());
        }
    }

    private String resolveGroupId(GroupEvent event) {
        if (event.groupId() != null && !event.groupId().isBlank()) {
            return event.groupId();
        }
        if (event.chatId() != null && !event.chatId().isBlank()) {
            return db.sql("SELECT id FROM community_group WHERE wecom_chat_id = :c")
                    .param("c", event.chatId())
                    .query(String.class).optional()
                    .orElseThrow(() -> {
                        // create 事件允许 chatId 未绑定——但那时必须显式带 groupId
                        return BusinessException.conflict("chat_id " + event.chatId() + " 未绑定任何群，事件进人工核对");
                    });
        }
        throw new BusinessException("事件缺 groupId/chatId");
    }

    private long requireMember(GroupEvent event) {
        if (event.memberNo() == null || event.memberNo().isBlank()) {
            throw BusinessException.conflict("事件缺会员标识（state=" + event.state() + "），进人工核对");
        }
        return memberService.idOf(event.memberNo());
    }
}
