/** 我的页（对齐设计稿 ProfileTab）：居中档案头 + 信息卡 + 订单记录 + 图标菜单 + FAQ + 退出登录。 */
const api = require("../../api/mp");
const { logout } = require("../../utils/auth");
const { money, d10, toast } = require("../../utils/fmt");

const ORDER_TAG = { 已支付: "tag tag--green", 待支付: "tag tag--amber", 已退款: "tag tag--red", 已取消: "tag" };

Page({
  data: {
    name: "…",
    avatarChar: "主",
    metaText: "",
    isPaid: false,
    identityTag: "",
    pointsText: "0",
    growthText: "0",
    infoRows: [],
    orders: [],
    menus: [],
    faq: [],
    openFaq: -1,
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
    this.load();
  },

  async load() {
    try {
      const [me, profile, inv, faq] = await Promise.all([
        api.getMe(), api.getProfile(), api.getInvite(), api.getFaq(),
      ]);
      const identity = me.identity || {};
      const directInvites = (inv.downline || []).filter(d => Number(d.level) === 1).length;
      this.setData({
        name: me.name,
        avatarChar: (me.name || "主").trim().charAt(0),
        metaText: `${me.member_no}${profile.phone ? ` · ${profile.phone}` : ""}${profile.city ? ` · ${profile.city}` : ""}`,
        isPaid: !!me.hasPaidEntitlement,
        identityTag: me.hasPaidEntitlement
          ? `${identity.identity || "会员"}${identity.valid_until ? ` · 至 ${d10(identity.valid_until)}` : ""}`
          : "",
        pointsText: money(me.pointsTotal),
        growthText: money(me.growthTotal),
        infoRows: [
          { k: "微信号", v: profile.wechatId || "—" },
          { k: "所在城市", v: profile.city || "—" },
          { k: "会员等级", v: me.hasPaidEntitlement ? (identity.identity || "会员") : "未开通" },
          { k: "入会时间", v: profile.created_at ? d10(profile.created_at) : "—" },
          { k: "来源渠道", v: profile.source_channel || "—" },
          { k: "推荐人", v: profile.referrer ? profile.referrer.name : "—" },
        ],
        orders: (me.orders || []).map(o => ({
          orderNo: o.order_no,
          planName: o.plan_name,
          subText: o.paid_at ? d10(o.paid_at) : o.order_no,
          amountText: (o.amount_cents / 100).toFixed(2),
          statusText: o.status,
          tagClass: ORDER_TAG[o.status] || "tag",
        })),
        menus: [
          {
            label: "我的邀请", icon: "heart", type: "page", url: "/pages/invite/index",
            sub: directInvites > 0 ? `已邀请 ${directInvites} 人 · 关系树 · 成长值` : "邀请码 · 关系树 · 成长值",
          },
          { label: "课程与直播", icon: "tv", type: "page", url: "/pages/courses/index", sub: "课表 · 回放" },
          { label: "我的社群", icon: "users", type: "tab", url: "/pages/group/index", sub: "入群进度 · 服务老师" },
        ],
        faq: faq || [],
      });
    } catch (e) {
      toast(e.message);
    }
  },

  menuTap(e) {
    const { type, url } = e.currentTarget.dataset;
    if (type === "tab") wx.switchTab({ url });
    else wx.navigateTo({ url });
  },

  toggleFaq(e) {
    const i = Number(e.currentTarget.dataset.i);
    this.setData({ openFaq: this.data.openFaq === i ? -1 : i });
  },

  async doLogout() {
    const r = await wx.showModal({ title: "退出登录", content: "确定要退出当前账号吗？", confirmText: "退出" });
    if (!r.confirm) return;
    logout();
    wx.reLaunch({ url: "/pages/index/index" });
  },
});
