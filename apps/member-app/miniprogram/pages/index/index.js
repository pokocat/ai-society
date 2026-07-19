/**
 * 首页（对齐设计稿 HomeTab）：问候头 + 消息铃铛 + 会员卡 + 快捷四宫格 + 课程公告轮播 +
 * 我的数据 + 服务老师（弹层联系）+ 待办任务。未开通会员时展示套餐购买（M3b Mock 支付）。
 * 所有数字均来自真实接口；通知内容由待办/排课/入群进度真实数据聚合而成。
 */
const api = require("../../api/mp");
const { captureInviteCode, ensureLogin } = require("../../utils/auth");
const { money, d10, d11, toast } = require("../../utils/fmt");

Page({
  data: {
    greeting: "登录中…",
    subText: "",
    isPaid: false,
    avatarChar: "主",
    identityLabel: "会员卡 · 未开通",
    periodText: "未开通",
    pointsText: "0",
    quickActions: [
      { label: "入群码", icon: "qr-code", color: "#1F6C9F", bg: "#E1F3FE", type: "tab", url: "/pages/group/index" },
      { label: "邀请好友", icon: "gift", color: "#346538", bg: "#EDF3EC", type: "page", url: "/pages/invite/index" },
      { label: "课程直播", icon: "tv", color: "#956400", bg: "#FBF3DB", type: "page", url: "/pages/courses/index" },
      { label: "我的收益", icon: "wallet", color: "#9F2F2D", bg: "#FDEBEC", type: "tab", url: "/pages/earnings/index" },
    ],
    // iOS 虚拟支付受苹果政策限制：iOS 端隐藏购买入口（上架审阅项）
    iosLimited: false,
    courses: [],
    courseIdx: 0,
    stats: [],
    teacher: null,
    todos: [],
    plans: [],
    busyCode: "",
    notifications: [],
    serviceOpen: false,
    notifyOpen: false,
    sharePath: "/pages/index/index",
  },

  onLoad(options) {
    captureInviteCode({ query: options || {} });
    const info = wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync();
    this.setData({ iosLimited: info.platform === "ios" });
  },

  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.load();
  },

  async load() {
    try {
      await ensureLogin(); // 先确保登录，避免并发请求各自触发登录
      const [me, inv, earn, allCourses, allTasks, group] = await Promise.all([
        api.getMe(), api.getInvite(), api.getEarnings(), api.getCourses(), api.getTasks(), api.getMyGroup(),
      ]);

      const identity = me.identity || {};
      const period = identity.valid_from && identity.valid_until
        ? `${d10(identity.valid_from).replace(/-/g, ".")} → ${d10(identity.valid_until).replace(/-/g, ".")}`
        : "—";
      const subText = me.hasPaidEntitlement
        ? `${identity.identity || "会员"} · ${me.city || "未填城市"}${identity.valid_until ? ` · 有效至 ${d10(identity.valid_until)}` : ""}`
        : `${me.member_no} · 尚未开通会员`;

      const courses = (allCourses || [])
        .filter(c => c.status !== "已结束")
        .slice(0, 3)
        .map(c => ({
          title: c.title,
          status: c.status,
          metaText: `${c.speaker ? `${c.speaker} · ` : ""}${d11(c.scheduled_at)} · ${c.status}`,
        }));

      const todos = (allTasks || [])
        .filter(t => !t.done)
        .slice(0, 3)
        .map(t => ({
          id: t.id,
          title: t.title,
          urgent: t.priority === "高",
          timeText: t.deadline ? String(t.deadline).slice(5, 10) : "",
        }));

      const directInvites = (inv.downline || []).filter(d => Number(d.level) === 1).length;
      const stats = [
        { label: "影响力(≤3级)", value: String(inv.influence || 0), color: "#1F6C9F" },
        { label: "直接邀请", value: `${directInvites} 人`, color: "#346538" },
        { label: "可提现", value: `¥${money(earn.summary.withdrawable)}`, color: "#956400" },
      ];

      const t = group.serviceTeacher;
      const teacher = t
        ? { char: t.name.charAt(0), name: t.name, metaText: `${t.service_region ? `${t.service_region} · ` : ""}${t.role}` }
        : null;

      // 通知：全部由真实数据聚合（待办任务 / 未结束排课 / 入群进度）
      const notifications = [];
      if (todos.length > 0) notifications.push(`你有 ${todos.length} 项任务待完成，完成可得积分`);
      courses.forEach(c => notifications.push(`${c.status === "直播中" ? "正在直播" : "即将开课"}：${c.title}`));
      const a = group.assignment;
      if (a && a.status !== "已入群") notifications.push(`入群进度更新：${a.group_name} 匹配对接中`);

      this.setData({
        greeting: `嗨，${me.name}`,
        subText,
        isPaid: !!me.hasPaidEntitlement,
        avatarChar: (me.name || "主").trim().charAt(0),
        identityLabel: me.hasPaidEntitlement ? (identity.identity || "会员") : "会员卡 · 未开通",
        periodText: me.hasPaidEntitlement ? period : "未开通",
        pointsText: money(me.pointsTotal),
        courses,
        courseIdx: 0,
        stats,
        teacher,
        todos,
        notifications,
        sharePath: inv.sharePath || "/pages/index/index",
      });

      if (!me.hasPaidEntitlement) {
        const plans = (await api.getPlans()).map(p => ({
          code: p.plan_code,
          name: p.name,
          metaText: `${p.grant_identity} · ${p.duration_days} 天`,
          priceText: (p.price_cents / 100).toFixed(0),
        }));
        this.setData({ plans });
      } else {
        this.setData({ plans: [] });
      }
    } catch (e) {
      toast(e.message);
    }
  },

  onShareAppMessage() {
    return {
      title: "我在主理人公社，邀你一起进圈子",
      path: this.data.sharePath,
      imageUrl: "/assets/share.png",
    };
  },

  async buy(e) {
    const code = e.currentTarget.dataset.code;
    if (this.data.busyCode) return;
    this.setData({ busyCode: code });
    try {
      const order = await api.createOrder(code);
      // M3b：Mock 支付直接回调成功；M3c 换 wx.requestVirtualPayment
      await api.payOrder(order.order_no);
      wx.showToast({ title: "开通成功，权益已生效", icon: "success" });
      await this.load();
    } catch (e2) {
      toast(e2.message);
    } finally {
      this.setData({ busyCode: "" });
    }
  },

  quickTap(e) {
    const { type, url } = e.currentTarget.dataset;
    if (type === "tab") wx.switchTab({ url });
    else wx.navigateTo({ url });
  },
  goTasks() { wx.switchTab({ url: "/pages/tasks/index" }); },
  goInvite() { wx.navigateTo({ url: "/pages/invite/index" }); },
  goCourses() { wx.navigateTo({ url: "/pages/courses/index" }); },
  goGroup() { wx.switchTab({ url: "/pages/group/index" }); },

  setCourseIdx(e) { this.setData({ courseIdx: Number(e.currentTarget.dataset.i) }); },

  openService() { this.setData({ serviceOpen: true }); },
  closeService() { this.setData({ serviceOpen: false }); },
  openNotify() { this.setData({ notifyOpen: true }); },
  closeNotify() { this.setData({ notifyOpen: false }); },
  serviceToGroup() {
    this.setData({ serviceOpen: false });
    wx.switchTab({ url: "/pages/group/index" });
  },
  noop() {},
});
