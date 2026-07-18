/** 社群页（对齐设计稿 CommunityTab）：渐变群卡 + 容量进度条 + 入群二维码弹窗 + 服务老师。 */
const api = require("../../api/mp");
const { d10, toast } = require("../../utils/fmt");

/** 入群漏斗对外话术（内部八态 → 用户视角三段） */
function statusLabel(status) {
  if (status === "已入群") return { label: "已入群", hint: "你已在专属社群中，欢迎多多互动" };
  if (["待加好友", "已加好友", "待邀请", "已邀请"].indexOf(status) >= 0) {
    return { label: "客服对接中", hint: "专属客服正在添加你的微信并邀请入群，请留意好友申请" };
  }
  return { label: "匹配中", hint: "运营正在为你匹配最合适的群" };
}

Page({
  data: {
    loaded: false,
    hasPaid: false,
    hint: "",
    subTitle: "尚未分配社群",
    a: null, // 群卡视图模型
    teacher: null,
    qrUrl: "",
    showQR: false,
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.load();
  },

  async load() {
    try {
      const data = await api.getMyGroup();
      const asg = data.assignment;
      let a = null;
      let subTitle = "尚未分配社群";
      if (asg) {
        const st = statusLabel(asg.status);
        const ratio = asg.target_capacity > 0 ? Math.min(1, asg.member_count / asg.target_capacity) : 0;
        const nearFull = ratio >= 0.9;
        a = {
          char: asg.group_name.charAt(0),
          groupName: asg.group_name,
          memberCount: asg.member_count,
          capacity: asg.target_capacity,
          ratioPct: Math.round(ratio * 100),
          nearFull,
          isJoined: asg.status === "已入群",
          statusText: st.label,
          statusHint: st.hint,
          joinedAt: asg.joined_at ? d10(asg.joined_at) : "",
        };
        subTitle = a.isJoined ? "已加入 1 个群" : `入群进度：${st.label}`;
      }
      const t = data.serviceTeacher;
      this.setData({
        loaded: true,
        hasPaid: !!data.hasPaidEntitlement,
        hint: data.hint || "",
        subTitle,
        a,
        qrUrl: data.groupQrcodeUrl || "",
        teacher: t
          ? {
              char: t.name.charAt(0),
              name: t.name,
              metaText: `${t.service_region ? `${t.service_region} · ` : ""}专属服务老师（${t.role}）`,
            }
          : null,
      });
    } catch (e) {
      toast(e.message);
    }
  },

  goHome() { wx.switchTab({ url: "/pages/index/index" }); },
  openQR() { this.setData({ showQR: true }); },
  closeQR() { this.setData({ showQR: false }); },
  noop() {},
});
