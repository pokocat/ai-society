/**
 * 我的页（浅色编辑风）：居中档案头（点击设置昵称）+ 信息卡 + 手机号绑定（微信快速验证）+
 * 订单记录 + 图标菜单（含在线客服）+ FAQ + 退出登录。
 */
const api = require("../../api/mp");
const { logout } = require("../../utils/auth");
const { money, d10, toast } = require("../../utils/fmt");

const ORDER_TAG = { 已支付: "tag tag--green", 待支付: "tag tag--amber", 已退款: "tag tag--red", 已取消: "tag tag--gray" };

Page({
  data: {
    name: "…",
    isDefaultName: false,
    avatarChar: "主",
    metaText: "",
    isPaid: false,
    identityTag: "",
    pointsText: "0",
    growthText: "0",
    hasPhone: false,
    infoRows: [],
    orders: [],
    menus: [],
    faq: [],
    openFaq: -1,
    // 昵称设置弹层（头像昵称填写能力）
    nickOpen: false,
    nickInput: "",
    nickSaving: false,
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
    this.load();
  },

  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
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
        isDefaultName: me.name === "微信用户",
        avatarChar: (me.name || "主").trim().charAt(0),
        metaText: `${me.member_no}${profile.phone ? ` · ${profile.phone}` : ""}${profile.city ? ` · ${profile.city}` : ""}`,
        isPaid: !!me.hasPaidEntitlement,
        identityTag: me.hasPaidEntitlement
          ? `${identity.identity || "会员"}${identity.valid_until ? ` · 至 ${d10(identity.valid_until)}` : ""}`
          : "",
        pointsText: money(me.pointsTotal),
        growthText: money(me.growthTotal),
        hasPhone: !!profile.phone,
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
          { label: "课程与直播", sub: "课表 · 回放", icon: "tv", type: "page", url: "/pages/courses/index" },
          { label: "我的社群", sub: "入群进度 · 服务老师", icon: "users", type: "tab", url: "/pages/group/index" },
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

  // ── 昵称设置（input type=nickname：键盘上方出现微信昵称快捷填入） ──
  openNick() {
    this.setData({ nickOpen: true, nickInput: this.data.isDefaultName ? "" : this.data.name });
  },
  closeNick() {
    this.setData({ nickOpen: false });
  },
  onNickInput(e) {
    this.setData({ nickInput: e.detail.value });
  },
  async saveNick() {
    const name = (this.data.nickInput || "").trim();
    if (!name) {
      toast("请输入昵称");
      return;
    }
    if (this.data.nickSaving) return;
    this.setData({ nickSaving: true });
    try {
      await api.updateNickname(name);
      this.setData({ nickOpen: false });
      wx.showToast({ title: "昵称已更新", icon: "success" });
      await this.load();
    } catch (e) {
      toast(e.message);
    } finally {
      this.setData({ nickSaving: false });
    }
  },

  // ── 手机号绑定（open-type=getPhoneNumber；演示环境后端返回明确提示） ──
  async onPhone(e) {
    const code = e.detail && e.detail.code;
    if (!code) {
      // 用户取消授权或环境不支持
      if (e.detail && e.detail.errMsg && e.detail.errMsg.indexOf("deny") < 0) {
        toast("当前环境暂不支持手机号快速验证");
      }
      return;
    }
    try {
      const r = await api.bindPhone(code);
      wx.showToast({ title: `已绑定 ${r.phone}`, icon: "success" });
      await this.load();
    } catch (e2) {
      toast(e2.message);
    }
  },

  async doLogout() {
    const r = await wx.showModal({ title: "退出登录", content: "确定要退出当前账号吗？", confirmText: "退出" });
    if (!r.confirm) return;
    logout();
    wx.reLaunch({ url: "/pages/index/index" });
  },
});
