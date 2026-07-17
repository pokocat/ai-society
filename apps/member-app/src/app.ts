import { Component, PropsWithChildren } from "react";
import Taro from "@tarojs/taro";
import { captureInviteCode } from "./utils/auth";
import "./app.scss";

/**
 * 主理人公社 · 会员小程序（M3b）。
 * 裂变归因：启动参数（分享 path 或小程序码 scene）里的 inviteCode 在 onLaunch 捕获暂存，
 * 首次登录建档时绑定关系链（服务端三公理校验，不覆盖既有推荐人）。
 */
class App extends Component<PropsWithChildren> {
  onLaunch(options: Taro.getLaunchOptionsSync.LaunchOptions) {
    captureInviteCode(options);
  }

  render() {
    return this.props.children;
  }
}

export default App;
