/**
 * 自定义 TabBar（对齐设计稿底栏）：激活图标带圆角高亮块。
 * 选中态：各 Tab 页 onShow 里 this.getTabBar().setData({ selected: i })（原生标准做法）。
 */
Component({
  data: {
    selected: 0,
    list: [
      { path: "/pages/index/index", text: "首页", icon: "home" },
      { path: "/pages/group/index", text: "社群", icon: "users" },
      { path: "/pages/tasks/index", text: "任务", icon: "check-square" },
      { path: "/pages/earnings/index", text: "收益", icon: "trending-up" },
      { path: "/pages/mine/index", text: "我的", icon: "user" },
    ],
  },
  methods: {
    switchTab(e) {
      const { index, path } = e.currentTarget.dataset;
      if (index === this.data.selected) return;
      wx.switchTab({ url: path });
      this.setData({ selected: index });
    },
  },
});
