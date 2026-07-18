export default defineAppConfig({
  pages: [
    "pages/index/index",     // 首页（Tab）
    "pages/group/index",     // 社群（Tab）
    "pages/tasks/index",     // 任务（Tab）
    "pages/earnings/index",  // 收益（Tab）
    "pages/mine/index",      // 我的（Tab）
    "pages/invite/index",    // 邀请裂变（从首页/我的进入）
    "pages/courses/index",   // 课程与直播（从首页/我的进入）
  ],
  window: {
    backgroundTextStyle: "dark",
    backgroundColor: "#0d1629",
    navigationBarBackgroundColor: "#0d1629",
    navigationBarTitleText: "主理人公社",
    navigationBarTextStyle: "white",
  },
  tabBar: {
    color: "#64748b",
    selectedColor: "#4361ee",
    backgroundColor: "#0e1120",
    borderStyle: "black",
    list: [
      { pagePath: "pages/index/index", text: "首页" },
      { pagePath: "pages/group/index", text: "社群" },
      { pagePath: "pages/tasks/index", text: "任务" },
      { pagePath: "pages/earnings/index", text: "收益" },
      { pagePath: "pages/mine/index", text: "我的" },
    ],
  },
});
