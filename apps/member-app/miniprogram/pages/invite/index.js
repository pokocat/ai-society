/** 裂变主页：专属邀请码（渐变主卡）+ 转发/复制 + 三级下线树 + 成长值。数据全部真实（referral_edge）。 */
const api = require("../../api/mp");
const { toast } = require("../../utils/fmt");

const LEVEL_COLOR = ["#7c9aff", "#34d399", "#f59e0b"];

Page({
  data: {
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

  async load() {
    try {
      const data = await api.getInvite();
      const downline = data.downline || [];
      const byLevel = lv => downline.filter(d => Number(d.level) === lv);
      const levels = [1, 2, 3]
        .map(lv => {
          const rows = byLevel(lv);
          const color = LEVEL_COLOR[lv - 1];
          return {
            level: lv,
            count: rows.length,
            tagStyle: `background:${color}22;color:${color}`,
            chipStyle: `background:${color}22;color:${color}`,
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
          { label: "覆盖人数(≤3级)", value: String(data.influence || 0), color: "#7c9aff" },
          { label: "直接邀请", value: String(byLevel(1).length), color: "#34d399" },
          { label: "邀请成长值", value: String(data.inviteGrowth || 0), color: "#f59e0b" },
        ],
        levels,
        hasDownline: downline.length > 0,
      });
    } catch (e) {
      toast(e.message);
    }
  },

  onShareAppMessage() {
    return {
      title: "我在主理人公社，邀你一起进圈子",
      path: this.data.sharePath,
    };
  },

  copyCode() {
    if (!this.data.inviteCode || this.data.inviteCode === "…") return;
    wx.setClipboardData({ data: this.data.inviteCode });
  },
});
