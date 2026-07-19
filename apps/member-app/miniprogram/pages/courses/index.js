/** 课程与直播：真实排课（content_course）；有回放点击复制链接。 */
const api = require("../../api/mp");
const { d16, toast } = require("../../utils/fmt");

const STATUS = {
  已排期: { c: "#1F6C9F", bg: "#E1F3FE" },
  直播中: { c: "#956400", bg: "#FBF3DB" },
  已结束: { c: "#9B9A97", bg: "#F1F0EC" },
};

Page({
  data: {
    loaded: false,
    courses: [],
  },

  onShow() {
    this.load();
  },

  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
  },

  async load() {
    try {
      const list = await api.getCourses();
      const courses = (list || []).map(c => {
        const st = STATUS[c.status] || { c: "#9B9A97", bg: "#F1F0EC" };
        return {
          id: c.id,
          title: c.title,
          status: c.status,
          color: st.c,
          iconBg: st.bg,
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
