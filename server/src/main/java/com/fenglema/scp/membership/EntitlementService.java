package com.fenglema.scp.membership;

import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * 付费权益门控（M3 §4.1）：判定「会员在项目内是否持有效付费身份」。
 * 权益载体复用 member_project_identity——付费身份必须有 valid_until（NULL 视为无效）。
 * 三个注入点：①推荐引擎硬性准入 ②AssignmentService.confirm 前置 ③小程序端点（M3b）。
 * 门控总开关 resource_rules.paid_gate_enabled；豁免群类型读 dict paid_gate_exempt_group_types
 * （默认 游客群/体验官群 作转化前置漏斗，运营可调）。
 */
@Service
public class EntitlementService {

    private final JdbcClient db;

    public EntitlementService(JdbcClient db) {
        this.db = db;
    }

    /**
     * 会员在项目内是否持有效付费身份（付费档 ∧ 有效期未到；无有效期=无效）。
     * 状态口径：「有效」与「待分配」均算持有（待分配=身份已授予、尚未安置进群——付费新会员
     * 等待拉群正是这个状态）；「已过期/已冻结」不算。
     */
    public boolean hasPaidEntitlement(long memberId, String projectId) {
        return !db.sql("""
                        SELECT 1 FROM member_project_identity mpi
                        JOIN dict_entry d ON d.dict_code = 'paid_identity' AND d.item_label = mpi.identity AND d.enabled
                        WHERE mpi.member_id = :m AND mpi.project_id = :p AND mpi.status IN ('有效', '待分配')
                          AND mpi.valid_until IS NOT NULL AND mpi.valid_until > now()
                        """)
                .param("m", memberId).param("p", projectId)
                .query(Rows.MAP).list().isEmpty();
    }

    /** 群类型是否豁免付费门控（转化前置漏斗）。 */
    public boolean isExemptGroupType(String groupType) {
        return !db.sql("""
                        SELECT 1 FROM dict_entry
                        WHERE dict_code = 'paid_gate_exempt_group_types' AND item_label = :t AND enabled
                        """)
                .param("t", groupType)
                .query(Rows.MAP).list().isEmpty();
    }

    public boolean gateEnabled() {
        return db.sql("SELECT paid_gate_enabled FROM resource_rules WHERE id = 1")
                .query(Boolean.class).single();
    }

    /**
     * 注入点②：确认分配前置校验（防绕过推荐引擎直接 confirm 进付费档群）。
     * 门控关 / 群类型豁免 / 持有效权益 → 放行；否则阻断并引导购买。
     */
    public void assertCanPlace(long memberId, String projectId, String groupType) {
        if (!gateEnabled() || isExemptGroupType(groupType) || hasPaidEntitlement(memberId, projectId)) {
            return;
        }
        throw BusinessException.conflict("付费门控：会员在项目「" + projectId + "」无有效付费权益，"
                + "不可安置进「" + groupType + "」。请先完成会员购买或改选豁免群类型");
    }

    /** 权益概览（管理台/小程序「我的权益」数据源）。 */
    public Map<String, Object> summary(long memberId, String projectId) {
        var identity = db.sql("""
                        SELECT mpi.identity, mpi.status, mpi.valid_from, mpi.valid_until,
                               (d.id IS NOT NULL) AS is_paid_tier
                        FROM member_project_identity mpi
                        LEFT JOIN dict_entry d ON d.dict_code = 'paid_identity' AND d.item_label = mpi.identity AND d.enabled
                        WHERE mpi.member_id = :m AND mpi.project_id = :p
                        """)
                .param("m", memberId).param("p", projectId)
                .query(Rows.MAP).optional().orElse(null);
        return Map.of(
                "memberId", memberId,
                "projectId", projectId,
                "identity", identity == null ? Map.of() : identity,
                "hasPaidEntitlement", hasPaidEntitlement(memberId, projectId),
                "gateEnabled", gateEnabled());
    }
}
