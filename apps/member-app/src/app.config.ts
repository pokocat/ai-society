export default defineAppConfig({
  pages: [
    "pages/index/index",
    "pages/invite/index",
    "pages/group/index",
    "pages/courses/index",
    "pages/mine/index",
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#050805",
    navigationBarTitleText: "主理人公社",
    navigationBarTextStyle: "white",
  },
  tabBar: {
    color: "#68705a",
    selectedColor: "#050805",
    backgroundColor: "#ffffff",
    borderStyle: "black",
    list: [
      { pagePath: "pages/index/index", text: "首页" },
      { pagePath: "pages/invite/index", text: "邀请" },
      { pagePath: "pages/group/index", text: "我的群" },
      { pagePath: "pages/courses/index", text: "课程" },
      { pagePath: "pages/mine/index", text: "我的" },
    ],
  },
});
