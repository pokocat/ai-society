const { captureInviteCode } = require("./utils/auth");

App({
  onLaunch(options) {
    // 裂变归因：冷启动即捕获邀请码（分享 path 查询参数 / 小程序码 scene）
    captureInviteCode(options || {});
  },
  onShow(options) {
    captureInviteCode(options || {});
  },
});
