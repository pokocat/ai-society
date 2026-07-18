import Taro, { useDidShow } from "@tarojs/taro";

/** Tab 页在每次显示时上报自身序号，驱动自定义 TabBar 选中态。 */
export function useTabSync(index: number) {
  useDidShow(() => {
    Taro.eventCenter.trigger("scp:tab", index);
  });
}
