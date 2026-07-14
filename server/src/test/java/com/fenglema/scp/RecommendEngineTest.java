package com.fenglema.scp;

import com.fenglema.scp.assignment.RecommendEngine;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 五级推荐引擎：硬性准入过滤、业务匹配加分、填充率降权、超载剔除。 */
class RecommendEngineTest extends TestSupport {

    @Autowired
    RecommendEngine engine;

    @Test
    void prefersCityAndTypeMatchedLowFillGroup() {
        String good = createServiceableGroup("北京", "PRO会员群", 100, 20);   // 匹配 + 低填充
        String crowded = createServiceableGroup("北京", "PRO会员群", 100, 99); // 匹配但 99% 填充 → 降权
        String otherCity = createServiceableGroup("上海", "PRO会员群", 100, 20);
        String member = ingestMember("推荐会员" + uid(), "北京", "flm-membership", "PRO会员", null);

        List<RecommendEngine.Candidate> list = engine.recommend(memberIdOf(member), "flm-membership");
        // 并行测试会产生其他候选群：只对本用例三群做相对断言，保证隔离性
        RecommendEngine.Candidate goodC = list.stream().filter(c -> c.groupId().equals(good)).findFirst().orElseThrow();
        RecommendEngine.Candidate crowdedC = list.stream().filter(c -> c.groupId().equals(crowded)).findFirst().orElseThrow();
        RecommendEngine.Candidate otherCityC = list.stream().filter(c -> c.groupId().equals(otherCity)).findFirst().orElseThrow();

        assertTrue(goodC.hitRules().stream().anyMatch(r -> r.contains("城市匹配")));
        assertTrue(goodC.hitRules().stream().anyMatch(r -> r.contains("身份匹配")));
        assertTrue(goodC.score() > crowdedC.score(), "99% 填充的群必须被降权");
        assertTrue(crowdedC.riskHints().stream().anyMatch(r -> r.contains("降权")), "高填充群应带降权风险提示");
        // SPEC §7.3 优先级字典序：业务匹配（第2级）优先于负载（第3级）——
        // 同城满档位群（即便 99% 填充被降权）也必须排在异地群之前
        List<String> ordered = list.stream().map(RecommendEngine.Candidate::groupId)
                .filter(id -> id.equals(good) || id.equals(crowded) || id.equals(otherCity)).toList();
        assertEquals(List.of(good, crowded, otherCity), ordered,
                "排序必须为 同城低填充 > 同城高填充 > 异地（匹配档位优先，同档位比分数）");
        assertEquals(3, goodC.matchTier());
        assertEquals(2, otherCityC.matchTier());
        assertEquals(good, list.stream()
                        .filter(c -> c.groupId().equals(good) || c.groupId().equals(crowded) || c.groupId().equals(otherCity))
                        .findFirst().orElseThrow().groupId(),
                "本用例三群中排序第一的应为北京低填充 PRO 群");
    }

    @Test
    void fullGroupExcludedByHardAdmission() {
        String full = createServiceableGroup("北京", "PRO会员群", 50, 50); // 已满 → 硬性准入剔除
        String member = ingestMember("准入会员" + uid(), "北京", "flm-membership", "PRO会员", null);
        List<RecommendEngine.Candidate> list = engine.recommend(memberIdOf(member), "flm-membership");
        assertTrue(list.stream().noneMatch(c -> c.groupId().equals(full)), "满员群不得进入候选");
    }

    @Test
    void overloadedWechatExcluded() {
        String group = createServiceableGroup("北京", "PRO会员群", 100, 10);
        // 把该群个微好友数推到硬上限 → 硬性准入剔除
        db.sql("""
                UPDATE account SET friend_count = (SELECT hard_friends FROM resource_rules WHERE id = 1)
                WHERE id = (SELECT account_id FROM group_staffing WHERE group_id = :g AND role = '个微客服')
                """).param("g", group).update();
        String member = ingestMember("超载会员" + uid(), "北京", "flm-membership", "PRO会员", null);
        List<RecommendEngine.Candidate> list = engine.recommend(memberIdOf(member), "flm-membership");
        assertTrue(list.stream().noneMatch(c -> c.groupId().equals(group)), "个微好友达硬上限的群不得进入候选");
    }
}
