import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import Icon, { IconName } from "../components/Icon";

/**
 * 自定义 TabBar（对齐设计稿底栏）：激活图标带圆角高亮块。
 * 选中态同步：各 Tab 页 useDidShow 里 trigger "scp:tab"（见 utils/tab.ts），
 * 兜底用当前路由初始化（直达非首页 Tab 场景）。
 */
export const TAB_LIST: Array<{ path: string; text: string; icon: IconName }> = [
  { path: "pages/index/index", text: "首页", icon: "home" },
  { path: "pages/group/index", text: "社群", icon: "users" },
  { path: "pages/tasks/index", text: "任务", icon: "check-square" },
  { path: "pages/earnings/index", text: "收益", icon: "trending-up" },
  { path: "pages/mine/index", text: "我的", icon: "user" },
];

export default function CustomTabBar() {
  const [selected, setSelected] = useState(() => {
    const pages = Taro.getCurrentPages();
    const route = pages[pages.length - 1]?.route ?? "";
    const idx = TAB_LIST.findIndex(t => t.path === route);
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    const handler = (idx: number) => setSelected(idx);
    Taro.eventCenter.on("scp:tab", handler);
    return () => {
      Taro.eventCenter.off("scp:tab", handler);
    };
  }, []);

  return (
    <View className="tabbar">
      {TAB_LIST.map((t, i) => {
        const active = i === selected;
        return (
          <View
            key={t.path}
            className="tabbar-item"
            onClick={() => {
              setSelected(i);
              void Taro.switchTab({ url: `/${t.path}` });
            }}
          >
            <View className={active ? "tabbar-icon tabbar-icon--active" : "tabbar-icon"}>
              <Icon name={t.icon} size={36} color={active ? "#4361ee" : "#64748b"} />
            </View>
            <Text className={active ? "tabbar-label tabbar-label--active" : "tabbar-label"}>{t.text}</Text>
          </View>
        );
      })}
    </View>
  );
}
