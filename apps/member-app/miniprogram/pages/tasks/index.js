/** 任务页（对齐设计稿 TaskTab）：头区进度条 + 打卡得积分（member_task + points_ledger，全真实）。 */
const api = require("../../api/mp");
const { d10, toast } = require("../../utils/fmt");

const PRIORITY_COLOR = { 高: "#ef4444", 中: "#f59e0b", 低: "#4361ee" };

Page({
  data: {
    loaded: false,
    tasks: [],
    doneCount: 0,
    total: 0,
    donePoints: 0,
    pct: 0,
    busyId: 0,
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.load();
  },

  async load() {
    try {
      const list = await api.getTasks();
      const tasks = (list || []).map(t => {
        const pc = PRIORITY_COLOR[t.priority] || "#64748b";
        return {
          id: t.id,
          title: t.title,
          done: !!t.done,
          typeText: t.task_type,
          pc,
          tagStyle: `background:${pc}18;color:${pc}`,
          deadlineText: t.deadline ? d10(t.deadline) : "",
          points: t.points || 0,
        };
      });
      const done = tasks.filter(t => t.done);
      this.setData({
        loaded: true,
        tasks,
        doneCount: done.length,
        total: tasks.length,
        donePoints: done.reduce((s, t) => s + t.points, 0),
        pct: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
      });
    } catch (e) {
      toast(e.message);
    }
  },

  async complete(e) {
    const id = Number(e.currentTarget.dataset.id);
    const t = this.data.tasks.find(x => x.id === id);
    if (!t || t.done || this.data.busyId) return;
    this.setData({ busyId: id });
    try {
      const r = await api.completeTask(id);
      wx.showToast({
        title: r.pointsAwarded > 0 ? `+${r.pointsAwarded} 积分，余额 ${r.pointsBalance}` : "已完成",
        icon: "success",
      });
      await this.load();
    } catch (e2) {
      toast(e2.message);
    } finally {
      this.setData({ busyId: 0 });
    }
  },
});
