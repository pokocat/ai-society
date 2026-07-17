package com.fenglema.scp;

import com.fenglema.scp.membership.MembershipOrderService;
import com.fenglema.scp.mp.MpService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * M3b 小程序裂变闭环测试：登录幂等并档 / scene 邀请归因（三公理不破坏）/
 * 购买生效 / 邀请统计。自建数据 + 唯一后缀（护栏 24）。
 */
class MpFlowTest extends TestSupport {

    static final String PROJECT = "flm-membership";

    @Autowired
    MpService mpService;
    @Autowired
    MembershipOrderService orderService;

    @Test
    void loginIsIdempotentPerWxCode() {
        String code = "wxcode-" + uid();
        Map<String, Object> first = mpService.login(code, null, "裂变甲" + uid());
        assertEquals(Boolean.TRUE, first.get("created"));
        String memberNo = (String) first.get("memberNo");
        assertNotNull(first.get("token"));

        // 同 code 再登录 → 命中 openid 标识，不重复建档
        Map<String, Object> second = mpService.login(code, null, "换了昵称也不新建");
        assertEquals(Boolean.FALSE, second.get("created"));
        assertEquals(memberNo, second.get("memberNo"));
    }

    @Test
    void sceneInviteCodeBindsReferralOnceAndAwardsGrowth() {
        // 邀请人 A：小程序登录建档 → 拿专属邀请码
        Map<String, Object> inviter = mpService.login("inviter-" + uid(), null, "邀请人A" + uid());
        String inviterNo = (String) inviter.get("memberNo");
        long inviterId = memberIdOf(inviterNo);
        Map<String, Object> invitePage = mpService.myInvite(inviterId, inviterNo);
        String inviteCode = (String) invitePage.get("inviteCode");
        assertNotNull(inviteCode);
        assertTrue(((String) invitePage.get("sharePath")).contains(inviteCode), "分享路径应带邀请码");

        // 被邀人 B 扫码落地（scene=邀请码）→ 静默建档并绑定关系链
        String inviteeCode = "invitee-" + uid();
        Map<String, Object> invitee = mpService.login(inviteeCode, inviteCode, "被邀人B" + uid());
        assertEquals(Boolean.TRUE, invitee.get("created"));
        assertTrue(((String) invitee.get("referral")).contains(inviterNo), "应绑定推荐人：" + invitee.get("referral"));

        // 邀请成长值入账
        Integer growth = db.sql("""
                        SELECT COALESCE(SUM(delta),0) FROM growth_ledger WHERE member_id = :m AND reason = '邀请成功'
                        """)
                .param("m", inviterId).query(Integer.class).single();
        assertTrue(growth >= 288, "邀请成长值应入账，实际 " + growth);

        // 下线树可见 B
        Map<String, Object> after = mpService.myInvite(inviterId, inviterNo);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> downline = (List<Map<String, Object>>) after.get("downline");
        assertTrue(downline.stream().anyMatch(d -> invitee.get("memberNo").equals(d.get("member_no"))));

        // B 带「别人的邀请码」复登 → 单推荐人公理：不覆盖既有关系
        Map<String, Object> other = mpService.login("other-" + uid(), null, "码主C" + uid());
        Map<String, Object> otherInvite = mpService.myInvite(memberIdOf((String) other.get("memberNo")),
                (String) other.get("memberNo"));
        Map<String, Object> replay = mpService.login(inviteeCode, (String) otherInvite.get("inviteCode"), null);
        assertEquals(Boolean.FALSE, replay.get("created"), "同 code 复登不得新建档");
        String lv1 = db.sql("""
                        SELECT ref.member_no FROM referral_relation rr JOIN member ref ON ref.id = rr.lv1_parent
                        WHERE rr.member_id = (SELECT id FROM member WHERE member_no = :no)
                        """)
                .param("no", invitee.get("memberNo"))
                .query(String.class).single();
        assertEquals(inviterNo, lv1, "已有推荐人不可被新邀请码覆盖");
    }

    @Test
    void purchaseThroughMpActivatesEntitlement() {
        String code = "buyer-" + uid();
        Map<String, Object> login = mpService.login(code, null, "购买者" + uid());
        String memberNo = (String) login.get("memberNo");
        long memberId = memberIdOf(memberNo);

        Map<String, Object> order = orderService.createOrder(memberNo, "MPLAN-PRO-M", "android", PROJECT);
        String orderNo = (String) order.get("order_no");
        // Mock 支付（确定性幂等键，双击只付一次）
        Map<String, Object> paid = orderService.paymentCallback(orderNo, "MPCB-" + orderNo);
        assertEquals("已支付", paid.get("status"));
        Map<String, Object> me = mpService.me(memberId, memberNo, PROJECT);
        assertEquals(Boolean.TRUE, me.get("hasPaidEntitlement"));
        assertEquals("PRO会员", ((Map<?, ?>) me.get("identity")).get("identity"));

        Map<String, Object> group = mpService.myGroup(memberId, PROJECT);
        assertEquals(Boolean.TRUE, group.get("hasPaidEntitlement"));
    }

    @Test
    void faqAndCoursesAvailable() {
        assertFalse(mpService.faq().isEmpty(), "FAQ 字典应有种子");
        mpService.courses();   // 不抛即可（可能为空）
    }
}
