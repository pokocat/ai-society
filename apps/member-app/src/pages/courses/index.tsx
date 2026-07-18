import { useCallback, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { getCourses, Course } from "../../api/mp";
import Icon from "../../components/Icon";

const statusColor: Record<string, string> = {
  已排期: "#7c9aff", 直播中: "#f59e0b", 已结束: "#64748b",
};

/** 课程与直播：真实排课（content_course）；有回放点击复制链接。 */
export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);

  const load = useCallback(async () => {
    try {
      setCourses(await getCourses());
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: "none" });
    }
  }, []);

  useDidShow(() => { void load(); });

  const openReplay = (c: Course) => {
    if (!c.replay_url) return;
    void Taro.setClipboardData({ data: c.replay_url });
    Taro.showToast({ title: "回放链接已复制", icon: "success" });
  };

  return (
    <View className="page page--sub" style={{ paddingTop: "30rpx" }}>
      {courses.length === 0 && (
        <View className="card" style={{ textAlign: "center", padding: "70rpx 32rpx" }}>
          <Text className="t-muted">暂无课程安排</Text>
        </View>
      )}
      {courses.map(c => {
        const color = statusColor[c.status] ?? "#64748b";
        return (
          <View key={c.id} className="card" onClick={() => openReplay(c)}>
            <View className="f" style={{ gap: "22rpx" }}>
              <View className="li-icon" style={{ background: `${color}22` }}>
                <Icon name="tv" size={28} color={color} />
              </View>
              <View className="f-1">
                <View className="f-between">
                  <Text className="t-strong">{c.title}</Text>
                  <Text style={{ color, fontSize: "22rpx" }}>{c.status}</Text>
                </View>
                <View style={{ marginTop: "8rpx" }}>
                  <Text className="t-muted">
                    {c.speaker ? `${c.speaker} · ` : ""}{String(c.scheduled_at).slice(0, 16).replace("T", " ")}
                  </Text>
                </View>
                {c.replay_url && (
                  <View style={{ marginTop: "14rpx" }}>
                    <Text className="tag">有回放 · 点击复制链接（微信内可看）</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
