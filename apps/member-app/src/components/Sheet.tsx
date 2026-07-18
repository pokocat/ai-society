import { ReactNode } from "react";
import { View, Text } from "@tarojs/components";
import Icon from "./Icon";

/** 底部弹层（对齐设计稿 MobileSheet）：遮罩点击关闭，内容区阻断冒泡与滚动穿透。 */
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <View className="sheet-mask" catchMove onClick={onClose}>
      <View className="sheet-body" onClick={e => e.stopPropagation()}>
        <View className="sheet-head">
          <Text className="sheet-title">{title}</Text>
          <View className="sheet-close" onClick={onClose}>
            <Icon name="x" size={34} color="#64748b" />
          </View>
        </View>
        {children}
      </View>
    </View>
  );
}
