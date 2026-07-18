import { useCallback, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { getCourses, Course } from "../../api/mp";

const statusColor: Record<string, string> = {
  已排期: "#7c9aff", 直播中: "#f59e0b", 已结束: "#64748b",
};

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
    <View style={{ paddingBottom: "32px" }}>
      {courses.length === 0 && (
        <View className="card"><Text className="muted">暂无课程安排</Text></View>
      )}
      {courses.map(c => (
        <View key={c.id} className="card" onClick={() => openReplay(c)}>
          <View style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "28px" }}>{c.title}</Text>
            <Text style={{ color: statusColor[c.status] ?? "#64748b", fontSize: "24px" }}>{c.status}</Text>
          </View>
          <View style={{ marginTop: "8px" }}>
            <Text className="muted">
              {c.speaker ? `${c.speaker} · ` : ""}{String(c.scheduled_at).slice(0, 16).replace("T", " ")}
            </Text>
          </View>
          {c.replay_url && (
            <View style={{ marginTop: "12px" }}>
              <Text className="tag">有回放 · 点击复制链接（微信内可看）</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
