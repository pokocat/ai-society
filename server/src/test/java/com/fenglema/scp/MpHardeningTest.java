package com.fenglema.scp;

import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.SimpleRateLimiter;
import com.fenglema.scp.mp.MpService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 上架收口测试：昵称更新 / 手机号 Mock 明确报错 / 小程序码 Mock 占位 /
 * 登录限流器 / 邀请奖励每日封顶（关系照绑、奖励不发）。自建数据 + 唯一后缀（护栏 24）。
 */
class MpHardeningTest extends TestSupport {

    @Autowired
    MpService mpService;
    @Autowired
    SimpleRateLimiter rateLimiter;

    @Test
    void nicknameUpdateChangesDisplayNameWithTimeline() {
        Map<String, Object> login = mpService.login("nick-" + uid(), null, null);
        long id = memberIdOf((String) login.get("memberNo"));
        assertEquals("微信用户", login.get("name"), "未填昵称的默认名");

        String newName = "主理人甲" + uid();
        Map<String, Object> updated = mpService.updateNickname(id, "  " + newName + "  ");
        assertEquals(newName, updated.get("name"), "昵称应去空白后落库");

        String stored = db.sql("SELECT name FROM member WHERE id = :id").param("id", id)
                .query(String.class).single();
        assertEquals(newName, stored);
        Integer timeline = db.sql("""
                        SELECT COUNT(*) FROM member_timeline
                        WHERE member_id = :id AND event_type = '资料更新'
                        """).param("id", id).query(Integer.class).single();
        assertTrue(timeline >= 1, "资料更新应留时间线");

        assertThrows(BusinessException.class, () -> mpService.updateNickname(id, "   "),
                "空昵称应被拒绝");
        assertThrows(BusinessException.class, () -> mpService.updateNickname(id, "超".repeat(31)),
                "超长昵称应被拒绝");
    }

    @Test
    void phoneBindFailsClearlyInMockMode() {
        Map<String, Object> login = mpService.login("phone-" + uid(), null, null);
        long id = memberIdOf((String) login.get("memberNo"));
        BusinessException ex = assertThrows(BusinessException.class,
                () -> mpService.bindPhone(id, "any-phone-code"));
        assertTrue(ex.getMessage().contains("演示环境"), "Mock 模式应明确报错：" + ex.getMessage());
    }

    @Test
    void inviteQrcodeReturnsMockPlaceholderInMockMode() {
        Map<String, Object> login = mpService.login("qrc-" + uid(), null, null);
        long id = memberIdOf((String) login.get("memberNo"));
        Map<String, Object> qrcode = mpService.inviteQrcode(id);
        assertEquals(Boolean.TRUE, qrcode.get("mock"));
        assertNotNull(qrcode.get("inviteCode"));
    }

    @Test
    void rateLimiterBlocksBeyondLimitWithinWindow() {
        String key = "test-rl-" + uid();
        for (int i = 0; i < 5; i++) {
            assertTrue(rateLimiter.tryAcquire(key, 5), "前 5 次应放行（第 " + (i + 1) + " 次）");
        }
        assertFalse(rateLimiter.tryAcquire(key, 5), "第 6 次应被限流");
        assertTrue(rateLimiter.tryAcquire("other-" + uid(), 5), "不同 key 互不影响");
    }

    @Test
    void inviteAwardIsCappedDailyButRelationStillBinds() {
        // 邀请人 A 建档并取邀请码
        Map<String, Object> inviter = mpService.login("cap-inviter-" + uid(), null, "封顶甲" + uid());
        String inviterNo = (String) inviter.get("memberNo");
        long inviterId = memberIdOf(inviterNo);
        String inviteCode = (String) mpService.myInvite(inviterId, inviterNo).get("inviteCode");

        // 把 A 今日的邀请奖励次数直接灌到上限（自建数据，不动全局规则行）
        int cap = db.sql("SELECT invite_award_daily_cap FROM resource_rules WHERE id = 1")
                .query(Integer.class).single();
        for (int i = 0; i < cap; i++) {
            db.sql("""
                    INSERT INTO growth_ledger (member_id, delta, reason, ref_type, ref_id)
                    VALUES (:m, 1, '邀请成功', 'member', 'cap-seed')
                    """).param("m", inviterId).update();
        }
        int growthBefore = db.sql("SELECT COALESCE(SUM(delta),0) FROM growth_ledger WHERE member_id = :m")
                .param("m", inviterId).query(Integer.class).single();

        // 新好友仍经 A 的码进入：关系必须照绑，但当日奖励不再发放
        Map<String, Object> invitee = mpService.login("cap-invitee-" + uid(), inviteCode, "封顶乙" + uid());
        assertTrue(((String) invitee.get("referral")).contains(inviterNo), "超限后关系链仍应绑定");

        int growthAfter = db.sql("SELECT COALESCE(SUM(delta),0) FROM growth_ledger WHERE member_id = :m")
                .param("m", inviterId).query(Integer.class).single();
        assertEquals(growthBefore, growthAfter, "达到每日上限后不应再发成长值");

        Integer relation = db.sql("""
                        SELECT COUNT(*) FROM referral_relation rr
                        JOIN member m ON m.id = rr.member_id
                        WHERE rr.referrer_id = :ref AND m.member_no = :no
                        """)
                .param("ref", inviterId).param("no", invitee.get("memberNo"))
                .query(Integer.class).single();
        assertEquals(1, relation, "关系链记录存在");
    }
}
