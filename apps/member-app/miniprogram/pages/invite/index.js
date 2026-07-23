/** 裂变主页：专属邀请码（渐变主卡）+ 转发/复制 + 三级下线树 + 成长值。数据全部真实（referral_edge）。 */
const api = require("../../api/mp");
const { toast } = require("../../utils/fmt");

const LEVELS = [
  { c: "#1F6C9F", bg: "#E1F3FE" },
  { c: "#346538", bg: "#EDF3EC" },
  { c: "#956400", bg: "#FBF3DB" },
];

Page({
  data: {
    loadError: "",
    retrying: false,
    qrOpen: false,
    qrImage: "",
    qrLoading: false,
    inviteCode: "…",
    qrcodeMock: false,
    sharePath: "/pages/index/index",
    stats: [],
    levels: [],
    hasDownline: false,
  },

  onShow() {
    this.load();
  },

  /** 错误条重试入口 */
  async retryLoad() {
    if (this.data.retrying) return;
    this.setData({ retrying: true });
    await this.load();
    this.setData({ retrying: false });
  },

  async load() {
    if (this.data.loadError) this.setData({ loadError: "" });
    try {
      const data = await api.getInvite();
      const downline = data.downline || [];
      const byLevel = lv => downline.filter(d => Number(d.level) === lv);
      const levels = [1, 2, 3]
        .map(lv => {
          const rows = byLevel(lv);
          const palette = LEVELS[lv - 1];
          return {
            level: lv,
            count: rows.length,
            tagStyle: `background:${palette.bg};color:${palette.c}`,
            chipStyle: `background:${palette.bg};color:${palette.c}`,
            indent: (lv - 1) * 30,
            rows: rows.map(d => ({
              memberNo: d.member_no,
              name: d.name,
              char: (d.name || "友").trim().charAt(0),
              metaText: `${d.city || ""}${d.direct_downline > 0 ? ` · 又邀 ${d.direct_downline} 人` : ""}`,
            })),
          };
        })
        .filter(l => l.count > 0);

      this.setData({
        inviteCode: data.inviteCode,
        qrcodeMock: !!data.qrcodeMock,
        sharePath: data.sharePath || "/pages/index/index",
        stats: [
          { label: "覆盖人数(≤3级)", value: String(data.influence || 0), color: "#1F6C9F" },
          { label: "直接邀请", value: String(byLevel(1).length), color: "#346538" },
          { label: "邀请成长值", value: String(data.inviteGrowth || 0), color: "#956400" },
        ],
        levels,
        hasDownline: downline.length > 0,
      });
    } catch (e) {
      this.setData({ loadError: e.message, retrying: false });
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

  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
  },

  /** 专属小程序码（真实环境按需生成；演示环境保留占位说明） */
  async showQrcode() {
    if (this.data.qrLoading) return;
    this.setData({ qrLoading: true });
    try {
      const r = await api.getInviteQrcode();
      if (r.mock || !r.qrcodeBase64) {
        toast("专属小程序码将在正式版提供");
        return;
      }
      this.setData({ qrOpen: true, qrImage: "data:image/png;base64," + r.qrcodeBase64 });
    } catch (e) {
      toast(e.message);
    } finally {
      this.setData({ qrLoading: false });
    }
  },
  closeQrcode() { this.setData({ qrOpen: false }); },
  noop() {},

  copyCode() {
    if (!this.data.inviteCode || this.data.inviteCode === "…") return;
    wx.setClipboardData({ data: this.data.inviteCode });
  },
});
