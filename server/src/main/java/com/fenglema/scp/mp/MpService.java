package com.fenglema.scp.mp;

import com.fenglema.scp.common.BusinessException;
import com.fenglema.scp.common.CurrentUser;
import com.fenglema.scp.common.JwtService;
import com.fenglema.scp.common.Rows;
import com.fenglema.scp.identity.MemberService;
import com.fenglema.scp.identity.ReferralService;
import com.fenglema.scp.membership.EntitlementService;
import com.fenglema.scp.ops.InviteCodeService;
import com.fenglema.scp.sync.SyncService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 会员小程序（主理人公社）服务层（M3 §6）。
 * 裂变主链路：扫码落地（scene=邀请码）→ wx.login 静默建档/并档 → 绑定关系链（三公理服务端校验）
 * → 购买会员（权益生效）→ 安置进群 → 生成自己的专属邀请码继续裂变。
 *
 * 登录凭证经 WxClient 适配：scp.wx.mock=true 为确定性 Mock openid（开发/CI），
 * 生产注入 WX_SECRET + WX_MOCK=false 即切真实 code2Session，本服务其余逻辑不变。
 * 合规（M3 §1.1）：邀请奖励=成长值/会员时长（虚拟权益），无现金返利，无强制分享。
 */
@Service
public class MpService {

    private final JdbcClient db;
    private final MemberService memberService;
    private final SyncService syncService;
    private final InviteCodeService inviteCodeService;
    private final ReferralService referralService;
    private final EntitlementService entitlementService;
    private final JwtService jwtService;
    private final WxClient wxClient;
    private final String defaultProject;

    public MpService(JdbcClient db, MemberService memberService, SyncService syncService,
                     InviteCodeService inviteCodeService, ReferralService referralService,
                     EntitlementService entitlementService, JwtService jwtService, WxClient wxClient,
                     @Value("${scp.mp.default-project:flm-membership}") String defaultProject) {
        this.db = db;
        this.memberService = memberService;
        this.syncService = syncService;
        this.inviteCodeService = inviteCodeService;
        this.referralService = referralService;
        this.entitlementService = entitlementService;
        this.jwtService = jwtService;
        this.wxClient = wxClient;
        this.defaultProject = defaultProject;
    }

    public String defaultProject() {
        return defaultProject;
    }

    /**
     * 登录并档（幂等）：code→openid（Mock）→ 老会员直接发 JWT；新用户经同步层建档（游客，
     * 走真实进线口，含待分配身份+时间线+同步作业留痕），再挂 openid 标识。
     * 邀请归因：scene 带邀请码 → 解析码主为推荐人；已有推荐人则静默跳过（单推荐人公理）。
     */
    @Transactional
    public Map<String, Object> login(String code, String inviteCode, String nickname) {
        if (code == null || code.isBlank()) {
            throw new BusinessException("缺少 wx.login code");
        }
        String openid = wxClient.code2Session(code);
        Long memberId = db.sql("""
                        SELECT m.id FROM member_identifier mi JOIN member m ON m.id = mi.member_id
                        WHERE mi.id_type = '小程序openid' AND mi.id_value = :v AND m.merged_into IS NULL
                        """)
                .param("v", openid)
                .query(Long.class).optional().orElse(null);

        boolean created = memberId == null;
        String memberNo;
        String referralNote = "无";
        if (created) {
            String referrerNo = inviteCodeService.ownerOf(inviteCode);
            Map<String, Object> ingest = syncService.ingestPendingMember("小程序", "API",
                    new SyncService.IncomingMember(
                            nickname == null || nickname.isBlank() ? "微信用户" : nickname,
                            null, null, "小程序",
                            defaultProject, "游客", referrerNo, inviteCode, null, null, openid));
            memberId = ((Number) ingest.get("memberId")).longValue();
            memberNo = (String) ingest.get("memberNo");
            referralNote = (String) ingest.get("referral");
            memberService.addIdentifier(memberNo, "小程序openid", openid, "小程序");
        } else {
            memberNo = db.sql("SELECT member_no FROM member WHERE id = :id").param("id", memberId)
                    .query(String.class).single();
            // 老用户带新邀请码进来：无推荐人才补绑（不覆盖既有关系链）
            if (inviteCode != null && !inviteCode.isBlank()) {
                boolean bound = !db.sql("SELECT 1 FROM referral_relation WHERE member_id = :id")
                        .param("id", memberId).query(Rows.MAP).list().isEmpty();
                String referrerNo = inviteCodeService.ownerOf(inviteCode);
                if (!bound && referrerNo != null && !referrerNo.equals(memberNo)) {
                    referralService.bind(memberNo, referrerNo, "小程序", inviteCode);
                    referralNote = "已绑定推荐人 " + referrerNo;
                }
            }
        }
        Map<String, Object> member = db.sql("SELECT * FROM member WHERE id = :id").param("id", memberId)
                .query(Rows.MAP).single();
        String token = jwtService.issue(new CurrentUser(memberId, "mp:" + openid,
                (String) member.get("name"), "member", "SELF", memberNo));
        Map<String, Object> out = new HashMap<>();
        out.put("token", token);
        out.put("memberNo", memberNo);
        out.put("name", member.get("name"));
        out.put("created", created);
        out.put("referral", referralNote);
        out.put("mockSession", wxClient.isMock());
        return out;
    }

    /** 更新昵称（头像昵称填写能力回传；member.name 即展示名）。 */
    @Transactional
    public Map<String, Object> updateNickname(long memberId, String nickname) {
        String name = nickname == null ? "" : nickname.trim();
        if (name.isEmpty() || name.length() > 30) {
            throw new BusinessException("昵称需为 1-30 个字符");
        }
        String old = db.sql("SELECT name FROM member WHERE id = :id").param("id", memberId)
                .query(String.class).single();
        db.sql("UPDATE member SET name = :n, updated_at = now() WHERE id = :id")
                .param("n", name).param("id", memberId).update();
        memberService.appendTimeline(memberId, null, "资料更新", "昵称由「" + old + "」改为「" + name + "」", "会员本人");
        return Map.of("name", name);
    }

    /** 绑定手机号（open-type=getPhoneNumber 的 code 换号；Mock 模式由 WxClient 明确报错）。 */
    @Transactional
    public Map<String, Object> bindPhone(long memberId, String phoneCode) {
        if (phoneCode == null || phoneCode.isBlank()) {
            throw new BusinessException("缺少手机号授权 code");
        }
        String phone = wxClient.phoneNumber(phoneCode);
        db.sql("UPDATE member SET phone = :p, updated_at = now() WHERE id = :id")
                .param("p", phone).param("id", memberId).update();
        memberService.appendTimeline(memberId, null, "资料更新", "绑定手机号（微信快速验证）", "会员本人");
        return Map.of("phone", phone);
    }

    /** 专属小程序码（scene=邀请码，落地 pages/index/index）；Mock 模式返回占位标记。 */
    public Map<String, Object> inviteQrcode(long memberId) {
        Map<String, Object> code = inviteCodeService.mine(memberId, null);
        String base64 = wxClient.unlimitedQrcodeBase64((String) code.get("code"), "pages/index/index");
        Map<String, Object> out = new HashMap<>();
        out.put("inviteCode", code.get("code"));
        out.put("mock", base64 == null);
        out.put("qrcodeBase64", base64);
        return out;
    }

    /** 我的（档案摘要+权益）。 */
    public Map<String, Object> me(long memberId, String memberNo, String projectId) {
        String pid = projectId == null ? defaultProject : projectId;
        Map<String, Object> member = db.sql("SELECT member_no, name, city, created_at FROM member WHERE id = :id")
                .param("id", memberId).query(Rows.MAP).single();
        Map<String, Object> identity = db.sql("""
                        SELECT identity, status, valid_from, valid_until FROM member_project_identity
                        WHERE member_id = :m AND project_id = :p
                        """)
                .param("m", memberId).param("p", pid)
                .query(Rows.MAP).optional().orElse(Map.of());
        Integer growth = db.sql("SELECT COALESCE(SUM(delta),0) FROM growth_ledger WHERE member_id = :m")
                .param("m", memberId).query(Integer.class).single();
        Integer points = db.sql("SELECT COALESCE(SUM(delta),0) FROM points_ledger WHERE member_id = :m")
                .param("m", memberId).query(Integer.class).single();
        List<Map<String, Object>> orders = db.sql("""
                        SELECT o.order_no, o.status, o.amount_cents, o.paid_at, p.name AS plan_name, p.duration_days
                        FROM membership_order o JOIN membership_plan p ON p.id = o.plan_id
                        WHERE o.member_id = :m ORDER BY o.created_at DESC LIMIT 20
                        """)
                .param("m", memberId).query(Rows.MAP).list();
        Map<String, Object> out = new HashMap<>(member);
        out.put("projectId", pid);
        out.put("identity", identity);
        out.put("hasPaidEntitlement", entitlementService.hasPaidEntitlement(memberId, pid));
        out.put("growthTotal", growth);
        out.put("pointsTotal", points);
        out.put("orders", orders);
        return out;
    }

    /** 档案卡（小程序「我的」信息卡）：个微号/城市/入会时间/来源渠道/推荐人，全部真实字段。 */
    public Map<String, Object> profileCard(long memberId) {
        Map<String, Object> member = db.sql("""
                        SELECT member_no, name, phone, city, source_channel, created_at
                        FROM member WHERE id = :id
                        """)
                .param("id", memberId).query(Rows.MAP).single();
        String wechatId = db.sql("""
                        SELECT id_value FROM member_identifier
                        WHERE member_id = :m AND id_type = '个微号' ORDER BY created_at LIMIT 1
                        """)
                .param("m", memberId).query(String.class).optional().orElse(null);
        Map<String, Object> referrer = db.sql("""
                        SELECT r.member_no, r.name FROM referral_relation rr
                        JOIN member r ON r.id = rr.referrer_id
                        WHERE rr.member_id = :m
                        """)
                .param("m", memberId).query(Rows.MAP).optional().orElse(null);
        Map<String, Object> out = new HashMap<>(member);
        out.put("wechatId", wechatId);
        out.put("referrer", referrer);
        return out;
    }

    /** 收益（earnings_snapshot 只读镜像，SPEC §2.2）+ 提现记录 + 已打款累计。 */
    public Map<String, Object> earnings(long memberId) {
        Map<String, Object> snapshot = db.sql("""
                        SELECT total_est, withdrawable, pending, frozen, synced_at FROM earnings_snapshot
                        WHERE member_id = :mid AND project_id IS NULL
                        """)
                .param("mid", memberId)
                .query(Rows.MAP).optional()
                .orElse(Map.of("total_est", 0, "withdrawable", 0, "pending", 0, "frozen", 0));
        List<Map<String, Object>> withdrawals = db.sql("""
                        SELECT id, amount, method, status, created_at, decided_at
                        FROM withdrawal_request WHERE member_id = :mid ORDER BY created_at DESC LIMIT 20
                        """)
                .param("mid", memberId).query(Rows.MAP).list();
        var paidOut = db.sql("""
                        SELECT COALESCE(SUM(amount),0) FROM withdrawal_request
                        WHERE member_id = :mid AND status = '已打款'
                        """)
                .param("mid", memberId).query(java.math.BigDecimal.class).single();
        Map<String, Object> out = new HashMap<>();
        out.put("summary", snapshot);
        out.put("paidOut", paidOut);
        out.put("withdrawals", withdrawals);
        return out;
    }

    /**
     * 裂变主页：专属邀请码 + 下线树 + 成长值。
     * 小程序码为 Mock 占位（M3c 用 getUnlimitedQRCode scene=邀请码 预生成）；
     * 小程序内分享用 onShareAppMessage path 带码，今天即可用。
     */
    public Map<String, Object> myInvite(long memberId, String memberNo) {
        Map<String, Object> code = inviteCodeService.mine(memberId, null);
        Map<String, Object> chain = referralService.chain(memberNo);
        Integer growth = db.sql("""
                        SELECT COALESCE(SUM(delta),0) FROM growth_ledger WHERE member_id = :m AND reason = '邀请成功'
                        """)
                .param("m", memberId).query(Integer.class).single();
        Map<String, Object> out = new HashMap<>();
        out.put("inviteCode", code.get("code"));
        out.put("validUntil", code.get("valid_until"));
        out.put("sharePath", "/pages/index/index?inviteCode=" + code.get("code"));
        out.put("qrcodeUrl", null);          // 真实小程序码经 GET /mp/invite/qrcode 按需生成
        out.put("qrcodeMock", wxClient.isMock());
        out.put("downline", chain.get("downline"));
        out.put("influence", chain.get("influence"));
        out.put("inviteGrowth", growth);
        return out;
    }

    /** 我的群：最近一次入群分配（八态漏斗对外展示）+ 群信息 + 入群二维码/活码。 */
    public Map<String, Object> myGroup(long memberId, String projectId) {
        String pid = projectId == null ? defaultProject : projectId;
        var assignment = db.sql("""
                        SELECT a.id, a.status, a.joined_at, a.group_id, g.name AS group_name,
                               g.member_count, g.target_capacity, g.join_way_id, g.qrcode_version
                        FROM member_group_assignment a
                        JOIN community_group g ON g.id = a.group_id
                        WHERE a.member_id = :m AND a.project_id = :p
                        ORDER BY a.updated_at DESC LIMIT 1
                        """)
                .param("m", memberId).param("p", pid)
                .query(Rows.MAP).optional().orElse(null);
        boolean entitled = entitlementService.hasPaidEntitlement(memberId, pid);
        Map<String, Object> out = new HashMap<>();
        out.put("projectId", pid);
        out.put("hasPaidEntitlement", entitled);
        if (assignment == null) {
            out.put("assignment", null);
            out.put("hint", entitled
                    ? "已具备会员权益，运营正在为你匹配最合适的群，稍后会有专属客服联系你"
                    : "完成会员购买后，将为你匹配专属社群");
            return out;
        }
        out.put("assignment", assignment);
        String qr = db.sql("""
                        SELECT image_url FROM group_qrcode WHERE group_id = :g AND valid_until > now()
                        ORDER BY version DESC LIMIT 1
                        """)
                .param("g", assignment.get("group_id"))
                .query(String.class).optional().orElse(null);
        out.put("groupQrcodeUrl", qr);
        // 我的服务老师：本群主责客服（优先个微客服；个微客服经 account.user_employee_id 落到员工）
        out.put("serviceTeacher", db.sql("""
                        SELECT e.name, e.service_region, gs.role
                        FROM group_staffing gs
                        LEFT JOIN account a ON a.id = gs.account_id
                        LEFT JOIN employee e ON e.id = COALESCE(gs.employee_id, a.user_employee_id)
                        WHERE gs.group_id = :g AND gs.is_primary AND e.id IS NOT NULL
                        ORDER BY CASE gs.role WHEN '个微客服' THEN 0 ELSE 1 END
                        LIMIT 1
                        """)
                .param("g", assignment.get("group_id"))
                .query(Rows.MAP).optional().orElse(null));
        return out;
    }

    /** 课程页：课表 + 直播/回放入口。 */
    public List<Map<String, Object>> courses() {
        return db.sql("""
                        SELECT id, title, speaker, scheduled_at, status, live_id, replay_url
                        FROM course_session WHERE status <> '已取消'
                        ORDER BY scheduled_at DESC LIMIT 50
                        """)
                .query(Rows.MAP).list();
    }

    /** FAQ（dict:mp_faq，item_label=问题 remark=答案；AI 答疑 M3c 接入微信客服后作兜底语料）。 */
    public List<Map<String, Object>> faq() {
        return db.sql("""
                        SELECT item_label AS question, remark AS answer FROM dict_entry
                        WHERE dict_code = 'mp_faq' AND enabled ORDER BY sort_order
                        """)
                .query(Rows.MAP).list();
    }
}
