package com.fenglema.scp;

import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.resource.GroupController;
import com.fenglema.scp.resource.GroupService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * M3（§12）：群状态变更须走状态机——patch 不得直接跳到非法目标态（原 COALESCE 直写可任意跳转）。
 * 流转型状态（可承接/服务中/容量预警/已满…）由 refreshStatus 管，人工 patch 只能进管理态或解冻。
 */
class GroupStateMachineTest extends TestSupport {

    @Autowired
    GroupService groupService;

    private String statusOf(String groupId) {
        return db.sql("SELECT status FROM community_group WHERE id = :g").param("g", groupId)
                .query(String.class).single();
    }

    @Test
    void patchRejectsIllegalJumpAllowsAdminTransition() {
        String groupId = createServiceableGroup("北京", "PRO会员群", 100, 0);   // 初始「可承接」
        assertEquals("可承接", statusOf(groupId));

        // 非法：可承接 → 已满（流转态禁止人工直跳）
        assertThrows(BusinessException.class,
                () -> groupService.patch(groupId, new GroupController.PatchGroup(null, null, null, "已满")));
        assertEquals("可承接", statusOf(groupId), "非法状态跳转应被拒且不落库");

        // 合法：可承接 → 冻结（管理态）
        groupService.patch(groupId, new GroupController.PatchGroup(null, null, null, "冻结"));
        assertEquals("冻结", statusOf(groupId));

        // 冻结 → 已满 非法
        assertThrows(BusinessException.class,
                () -> groupService.patch(groupId, new GroupController.PatchGroup(null, null, null, "已满")));

        // 冻结 → 待配置（解冻）合法；refreshStatus 随后把配齐的群收敛回「可承接」
        groupService.patch(groupId, new GroupController.PatchGroup(null, null, null, "待配置"));
        assertEquals("可承接", statusOf(groupId), "解冻后经 refreshStatus 收敛回可承接");
    }
}
