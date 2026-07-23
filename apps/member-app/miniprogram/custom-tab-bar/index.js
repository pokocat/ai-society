/**
 * 自定义 TabBar。
 * 选中态双保险：① 页面 onShow 调 setTab(i)（标准做法）；② 组件 attached 时按当前路由自推断，
 * 避免页面漏调用或时序错位导致高亮丢失。图标为纯 WXSS 内联 SVG，无组件依赖。
 */
const LIST = [
  { path: "/pages/index/index", text: "首页", icon: "home" },
  { path: "/pages/group/index", text: "社群", icon: "users" },
  { path: "/pages/tasks/index", text: "任务", icon: "check-square" },
  { path: "/pages/earnings/index", text: "收益", icon: "trending-up" },
  { path: "/pages/mine/index", text: "我的", icon: "user" },
];

Component({
  data: { selected: 0, list: LIST },

  lifetimes: {
    attached() {
      this.syncFromRoute();
    },
  },

  methods: {
    /** 按当前页面路由推断选中项（兜底） */
    syncFromRoute() {
      const pages = getCurrentPages();
      const route = pages.length ? pages[pages.length - 1].route : "";
      const idx = LIST.findIndex(t => t.path === `/${route}`);
      if (idx >= 0 && idx !== this.data.selected) this.setData({ selected: idx });
    },

    switchTab(e) {
      const { index, path } = e.currentTarget.dataset;
      if (index === this.data.selected) return;
      this.setData({ selected: index });
      wx.switchTab({
        url: path,
        fail: () => this.syncFromRoute(), // 跳转失败则回滚高亮
      });
    },
  },
});
