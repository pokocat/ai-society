package com.fenglema.scp;

import com.fenglema.scp.common.Rows;
import com.fenglema.scp.identity.MemberService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 统一会员并档（§5.5 / SPEC §16-1）与成长值规则（邀请 +288 可配）。 */
class IdentityMergeAndGrowthTest extends TestSupport {

    @Autowired
    MemberService memberService;

    @Test
    void samePhoneDedupesOnIngest() {
        String phone = "13" + uid();
        var first = syncService.ingestPendingMember("test", "人工导入",
                new com.fenglema.scp.sync.SyncService.IncomingMember("并档甲" + uid(), phone, "北京", "公众号",
                        "flm-membership", "游客", null, null, null, null, null));
        var second = syncService.ingestPendingMember("test", "人工导入",
                new com.fenglema.scp.sync.SyncService.IncomingMember("并档甲改名" + uid(), phone, "北京", "抖音",
                        "experience-camp", "游客", null, null, null, null, null));
        assertEquals(first.get("memberNo"), second.get("memberNo"), "同手机号必须归并到同一统一会员");
        assertEquals(Boolean.FALSE, second.get("created"));
    }

    @Test
    void strongIdentifierTriggersAutoMergeWeakGoesToConflictQueue() {
        String a = ingestMember("并档A" + uid(), "北京", "flm-membership", "游客", null);
        String b = ingestMember("并档B" + uid(), "上海", "experience-camp", "游客", null);
        // 给 B 登记一个 unionid，再向 A 添加同一 unionid → 强标识自动合并
        String unionid = "uid-" + uid();
        memberService.addIdentifier(b, "unionid", unionid, "test");
        Map<String, Object> merged = memberService.addIdentifier(a, "unionid", unionid, "test");
        assertEquals("已合并", merged.get("result"));

        // 弱标识（个微号）冲突 → 人工核对队列
        String c = ingestMember("并档C" + uid(), "北京", "flm-membership", "游客", null);
        String d = ingestMember("并档D" + uid(), "北京", "flm-membership", "游客", null);
        String wechat = "wx-" + uid();
        memberService.addIdentifier(c, "个微号", wechat, "test");
        Map<String, Object> conflict = memberService.addIdentifier(d, "个微号", wechat, "test");
        assertEquals("冲突待人工核对", conflict.get("result"));
        int queued = db.sql("SELECT count(*) FROM member_merge_conflict WHERE status = '待核对' AND conflict_on = :on")
                .param("on", "个微号=" + wechat).query(Integer.class).single();
        assertEquals(1, queued);
    }

    @Test
    void growthPerInviteReadsConfigurableRule() {
        // 默认 288
        String a1 = ingestMember("成长A" + uid(), "北京", "flm-membership", "运营商", null);
        String b1 = ingestMember("成长B" + uid(), "北京", "flm-membership", "游客", a1);
        Long defaultGrowth = db.sql("""
                        SELECT delta FROM growth_ledger WHERE member_id = :m AND reason = '邀请成功' ORDER BY id DESC LIMIT 1
                        """)
                .param("m", memberIdOf(a1)).query(Long.class).single();
        assertEquals(288L, defaultGrowth, "默认邀请成长值应为 288");
        assertTrue(b1.startsWith("U-"));

        // 调整规则 → 生效
        db.sql("UPDATE resource_rules SET growth_points_per_invite = 100 WHERE id = 1").update();
        try {
            String a2 = ingestMember("成长C" + uid(), "北京", "flm-membership", "运营商", null);
            ingestMember("成长D" + uid(), "北京", "flm-membership", "游客", a2);
            Long adjusted = db.sql("""
                            SELECT delta FROM growth_ledger WHERE member_id = :m AND reason = '邀请成功' ORDER BY id DESC LIMIT 1
                            """)
                    .param("m", memberIdOf(a2)).query(Long.class).single();
            assertEquals(100L, adjusted, "规则调整后应按新值计发");
        } finally {
            db.sql("UPDATE resource_rules SET growth_points_per_invite = 288 WHERE id = 1").update();
        }
    }

    @Test
    void profileAggregatesAllSections() {
        String memberNo = ingestMember("档案" + uid(), "北京", "flm-membership", "PRO会员", null);
        Map<String, Object> profile = memberService.profile(memberNo);
        assertTrue(profile.containsKey("identifiers"));
        assertTrue(profile.containsKey("projectIdentities"));
        assertTrue(profile.containsKey("groups"));
        assertTrue(profile.containsKey("orders"));
        assertTrue(profile.containsKey("referral"));
        assertTrue(profile.containsKey("points"));
        assertTrue(((java.util.List<?>) db.sql("SELECT * FROM member_timeline WHERE member_id = :m")
                .param("m", memberIdOf(memberNo)).query(Rows.MAP).list()).size() >= 1, "进线即有时间线");
    }

    @Test
    void mergePreservesProfileBlocksAndChain() {
        // H2 回归：并档必须迁移全部档案块与关系链，原来只迁 3 表致订单/积分/群/下级整段丢失
        String winner = ingestMember("主档" + uid(), "北京", "flm-membership", "PRO会员", null);
        String loser = ingestMember("败档" + uid(), "上海", "experience-camp", "游客", null);
        long wid = memberIdOf(winner), lid = memberIdOf(loser);
        // 败档挂：订单、积分、一个下级
        db.sql("""
                INSERT INTO order_reference (external_order_no, source_system, member_id, product_name, amount, status, external_time)
                VALUES (:no, 'test', :l, '年卡', 2480, '已完成', now())
                """).param("no", "O-" + uid()).param("l", lid).update();
        db.sql("INSERT INTO points_ledger (member_id, delta, reason) VALUES (:l, 500, 'test')").param("l", lid).update();
        String down = ingestMember("下级" + uid(), "上海", "experience-camp", "游客", loser);

        memberService.merge(wid, lid, "test-merge");

        Map<String, Object> profile = memberService.profile(winner);
        assertTrue(!((java.util.List<?>) profile.get("orders")).isEmpty(), "并档后主档档案应含败档订单（H2）");
        assertTrue(((Number) profile.get("points")).longValue() >= 500, "并档后主档应含败档积分");
        Long downRef = db.sql("SELECT referrer_id FROM referral_relation WHERE member_id = :d")
                .param("d", memberIdOf(down)).query(Long.class).single();
        assertEquals(wid, downRef, "败档的下级关系链应 re-point 到主档（H2 关系链）");
        // 败档已隐藏（merged_into 指向主档）
        Long mergedInto = db.sql("SELECT merged_into FROM member WHERE id = :l").param("l", lid).query(Long.class).single();
        assertEquals(wid, mergedInto);
    }
}
