package com.fenglema.scp;

import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.identity.ReferralService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 本体三公理：单推荐人 / 无环 / ≤3 级物化路径；影响力矩阵聚合。 */
class ReferralRelationTest extends TestSupport {

    @Autowired
    ReferralService referralService;

    @Test
    void materializedPathTruncatesAtThreeLevels() {
        String a = ingestMember("链A" + uid(), "北京", "flm-membership", "运营商", null);
        String b = ingestMember("链B" + uid(), "北京", "flm-membership", "尊享官", a);
        String c = ingestMember("链C" + uid(), "北京", "flm-membership", "体验官", b);
        String d = ingestMember("链D" + uid(), "北京", "flm-membership", "游客", c);
        String e = ingestMember("链E" + uid(), "北京", "flm-membership", "游客", d);

        Map<String, Object> pathE = db.sql("SELECT * FROM referral_relation WHERE member_id = :id")
                .param("id", memberIdOf(e)).query(Rows.MAP).single();
        assertEquals(memberIdOf(d), ((Number) pathE.get("lv1_parent")).longValue());
        assertEquals(memberIdOf(c), ((Number) pathE.get("lv2_parent")).longValue());
        assertEquals(memberIdOf(b), ((Number) pathE.get("lv3_parent")).longValue());
        // A 在 4 级之外，被截断（佣金/影响力只看三级内）
        assertTrue(pathE.values().stream().noneMatch(v -> v instanceof Number n && n.longValue() == memberIdOf(a)));

        // A 的影响力覆盖 = B/C/D（E 超出三级）
        Map<String, Object> chainA = referralService.chain(a);
        assertEquals(3L, ((Number) chainA.get("influence")).longValue());
    }

    @Test
    void singleReferrerAxiomRejected() {
        String a = ingestMember("单A" + uid(), "北京", "flm-membership", "运营商", null);
        String b = ingestMember("单B" + uid(), "北京", "flm-membership", "运营商", null);
        String c = ingestMember("单C" + uid(), "北京", "flm-membership", "游客", a);
        BusinessException ex = assertThrows(BusinessException.class,
                () -> referralService.bind(c, b, "推广码", null));
        assertTrue(ex.getMessage().contains("已绑定推荐人"));
    }

    @Test
    void deepCycleRejectedByRecursiveWalk() {
        // A→B→C→D→E（E 的物化路径已不含 A），再试 bind(A, E) 构成 5 级环 → 必须被递归上溯拦下
        String a = ingestMember("环A" + uid(), "北京", "flm-membership", "运营商", null);
        String b = ingestMember("环B" + uid(), "北京", "flm-membership", "游客", a);
        String c = ingestMember("环C" + uid(), "北京", "flm-membership", "游客", b);
        String d = ingestMember("环D" + uid(), "北京", "flm-membership", "游客", c);
        String e = ingestMember("环E" + uid(), "北京", "flm-membership", "游客", d);
        BusinessException ex = assertThrows(BusinessException.class,
                () -> referralService.bind(a, e, "推广码", null));
        assertTrue(ex.getMessage().contains("成环"));
    }

    @Test
    void influenceMatrixAggregatesByLevelAndIdentity() {
        String root = ingestMember("矩阵根" + uid(), "北京", "flm-membership", "运营商", null);
        String l1 = ingestMember("矩阵一级" + uid(), "北京", "flm-membership", "尊享官", root);
        ingestMember("矩阵二级" + uid(), "北京", "flm-membership", "体验官", l1);

        List<Map<String, Object>> matrix = referralService.influenceMatrix(root);
        long lv1Premium = matrix.stream()
                .filter(r -> ((Number) r.get("level")).intValue() == 1 && "尊享官".equals(r.get("identity")))
                .mapToLong(r -> ((Number) r.get("cnt")).longValue()).sum();
        long lv2Experiencer = matrix.stream()
                .filter(r -> ((Number) r.get("level")).intValue() == 2 && "体验官".equals(r.get("identity")))
                .mapToLong(r -> ((Number) r.get("cnt")).longValue()).sum();
        assertEquals(1, lv1Premium);
        assertEquals(1, lv2Experiencer);
        assertNull(matrix.stream().filter(r -> ((Number) r.get("level")).intValue() > 3).findFirst().orElse(null));
    }
}
