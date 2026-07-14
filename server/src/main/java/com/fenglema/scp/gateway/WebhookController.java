package com.fenglema.scp.gateway;

import com.fenglema.scp.assignment.AssignmentService;
import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.identity.MemberService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 外部事件入口（SPEC §6.7：入群成功事件是置「已入群」的合法路径之一）。
 * Mock 阶段免签名；企微真实回调接入时在此加签名/加解密校验。
 */
@RestController
@RequestMapping("/api/v1/webhook")
public class WebhookController {

    private final JdbcClient db;
    private final AssignmentService assignmentService;
    private final MemberService memberService;

    public WebhookController(JdbcClient db, AssignmentService assignmentService, MemberService memberService) {
        this.db = db;
        this.assignmentService = assignmentService;
        this.memberService = memberService;
    }

    public record GroupEvent(@NotBlank String eventType, @NotBlank String groupId, @NotBlank String memberNo) {
    }

    @PostMapping("/wecom/group-event")
    public ApiResponse<Map<String, Object>> groupEvent(@RequestBody GroupEvent event) {
        long memberId = memberService.idOf(event.memberNo());
        if ("join".equals(event.eventType())) {
            Long assignmentId = db.sql("""
                            SELECT id FROM member_group_assignment
                            WHERE member_id = :m AND group_id = :g AND status = '已邀请'
                            ORDER BY updated_at DESC LIMIT 1
                            """)
                    .param("m", memberId).param("g", event.groupId())
                    .query(Long.class).optional()
                    .orElseThrow(() -> BusinessException.conflict("未找到该会员在此群的「已邀请」分配记录，事件进人工核对"));
            return ApiResponse.ok(assignmentService.confirmJoin(assignmentId, "webhook"));
        }
        if ("quit".equals(event.eventType())) {
            Long assignmentId = db.sql("""
                            SELECT id FROM member_group_assignment
                            WHERE member_id = :m AND group_id = :g AND status = '已入群'
                            ORDER BY updated_at DESC LIMIT 1
                            """)
                    .param("m", memberId).param("g", event.groupId())
                    .query(Long.class).optional()
                    .orElseThrow(() -> BusinessException.conflict("未找到已入群记录"));
            assignmentService.transition(assignmentId, "已入群", "已退群", "群成员退群事件");
            db.sql("UPDATE community_group SET member_count = GREATEST(member_count - 1, 0) WHERE id = :g")
                    .param("g", event.groupId()).update();
            return ApiResponse.ok(Map.of("assignmentId", assignmentId, "status", "已退群"));
        }
        throw new BusinessException("不支持的事件类型：" + event.eventType());
    }
}
