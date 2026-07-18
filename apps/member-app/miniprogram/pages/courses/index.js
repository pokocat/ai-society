/** 课程与直播：真实排课（content_course）；有回放点击复制链接。 */
const api = require("../../api/mp");
const { d16, toast } = require("../../utils/fmt");

const STATUS_COLOR = { 已排期: "#7c9aff", 直播中: "#f59e0b", 已结束: "#64748b" };

Page({
  data: {
    loaded: false,
    courses: [],
  },

  onShow() {
    this.load();
  },

  async load() {
    try {
      const list = await api.getCourses();
      const courses = (list || []).map(c => {
        const color = STATUS_COLOR[c.status] || "#64748b";
        return {
          id: c.id,
          title: c.title,
          status: c.status,
          color,
          iconBg: `${color}22`,
          metaText: `${c.speaker ? `${c.speaker} · ` : ""}${d16(c.scheduled_at)}`,
          replayUrl: c.replay_url || "",
        };
      });
      this.setData({ loaded: true, courses });
    } catch (e) {
      toast(e.message);
    }
  },

  openReplay(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.setClipboardData({ data: url });
    wx.showToast({ title: "回放链接已复制", icon: "success" });
  },
});
