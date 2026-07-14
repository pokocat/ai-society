package com.fenglema.scp.platform;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.AuditService;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.Rows;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** 全局资源规则（SPEC §7.1）：阈值与推荐权重全部落库可配，业务代码只读表。 */
@RestController
@RequestMapping("/api/v1/rules")
public class RulesController {

    private final JdbcClient db;
    private final AuditService audit;

    public RulesController(JdbcClient db, AuditService audit) {
        this.db = db;
        this.audit = audit;
    }

    @GetMapping
    @Perm(module = "resourceconfig")
    public ApiResponse<Map<String, Object>> get() {
        return ApiResponse.ok(db.sql("SELECT * FROM resource_rules WHERE id = 1").query(Rows.MAP).single());
    }

    public record RulesUpdate(Integer targetGroupSize, Integer maxGroupsPerWechat, Integer warnFriends,
                              Integer hardFriends, Boolean requireEnterpriseCs, Boolean requirePersonalCs,
                              Boolean blockOverload, Integer growthPointsPerInvite) {
    }

    @PutMapping
    @Perm(module = "resourceconfig", action = Perm.Action.EDIT)
    @Transactional
    public ApiResponse<Map<String, Object>> update(@RequestBody RulesUpdate req) {
        Map<String, Object> before = db.sql("SELECT * FROM resource_rules WHERE id = 1").query().singleRow();
        db.sql("""
                UPDATE resource_rules SET
                  target_group_size       = COALESCE(:tgs, target_group_size),
                  max_groups_per_wechat   = COALESCE(:mgw, max_groups_per_wechat),
                  warn_friends            = COALESCE(:wf, warn_friends),
                  hard_friends            = COALESCE(:hf, hard_friends),
                  require_enterprise_cs   = COALESCE(:rec, require_enterprise_cs),
                  require_personal_cs     = COALESCE(:rpc, require_personal_cs),
                  block_overload          = COALESCE(:bo, block_overload),
                  growth_points_per_invite = COALESCE(:gpi, growth_points_per_invite),
                  updated_at = now()
                WHERE id = 1
                """)
                .param("tgs", req.targetGroupSize()).param("mgw", req.maxGroupsPerWechat())
                .param("wf", req.warnFriends()).param("hf", req.hardFriends())
                .param("rec", req.requireEnterpriseCs()).param("rpc", req.requirePersonalCs())
                .param("bo", req.blockOverload()).param("gpi", req.growthPointsPerInvite())
                .update();
        Map<String, Object> after = db.sql("SELECT * FROM resource_rules WHERE id = 1").query().singleRow();
        audit.log("resource_rules", "1", "修改全局规则", before, after, null, null, null);
        return ApiResponse.ok(after);
    }
}
