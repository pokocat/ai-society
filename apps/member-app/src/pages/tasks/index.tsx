import { useCallback, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { completeTask, getTasks, MemberTask } from "../../api/mp";

const priorityColor: Record<string, string> = { 高: "#ef4444", 中: "#f59e0b", 低: "#4361ee" };

/** 任务页（对齐设计稿 TaskTab）：进度条 + 打卡得积分（member_task + points_ledger，全真实）。 */
export default function Tasks() {
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      setTasks(await getTasks());
      setLoaded(true);
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: "none" });
    }
  }, []);

  useDidShow(() => { void load(); });

  const done = tasks.filter(t => t.done);
  const donePoints = done.reduce((s, t) => s + (t.points || 0), 0);

  const complete = async (t: MemberTask) => {
    if (t.done || busyId != null) return;
    setBusyId(t.id);
    try {
      const r = await completeTask(t.id);
      Taro.showToast({
        title: r.pointsAwarded > 0 ? `+${r.pointsAwarded} 积分，余额 ${r.pointsBalance}` : "已完成",
        icon: "success",
      });
      await load();
    } catch (e) {
      Taro.showToast({ title: (e as Error).message, icon: "none" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={{ paddingBottom: "32px" }}>
      <View style={{ padding: "32px 24px 0" }}>
        <Text style={{ fontSize: "38px", fontWeight: 700, color: "#e2e8f0" }}>我的任务</Text>
        <View style={{ display: "flex", gap: "24px", marginTop: "14px" }}>
          <Text className="muted">完成进度</Text>
          <Text style={{ fontSize: "24px", color: "#34d399", fontWeight: 600 }}>
            {done.length}/{tasks.length} 已完成
          </Text>
          {donePoints > 0 && (
            <Text style={{ fontSize: "24px", color: "#f59e0b" }}>已得 {donePoints} 积分</Text>
          )}
        </View>
        <View className="progress-track" style={{ marginTop: "18px" }}>
          <View className="progress-fill"
            style={{ width: tasks.length ? `${Math.round((done.length / tasks.length) * 100)}%` : "0%" }} />
        </View>
      </View>

      <View style={{ marginTop: "12px" }}>
        {loaded && tasks.length === 0 && (
          <View className="card" style={{ textAlign: "center", padding: "60px 32px" }}>
            <Text className="muted">暂无任务，稍后再来看看</Text>
          </View>
        )}
        {tasks.map(t => (
          <View key={t.id} className="card" onClick={() => void complete(t)} style={{
            opacity: t.done ? 0.72 : 1,
            background: t.done ? "rgba(16,185,129,0.08)" : "#1a2640",
            border: `1px solid ${t.done ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.07)"}`,
          }}>
            <View style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
              <View style={{
                width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0, marginTop: "4px",
                border: `3px solid ${t.done ? "#10b981" : (priorityColor[t.priority] ?? "#64748b")}`,
                background: t.done ? "#10b981" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {t.done && <Text style={{ color: "#ffffff", fontSize: "22px" }}>✓</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{
                  fontSize: "28px", fontWeight: 600,
                  color: t.done ? "#64748b" : "#e2e8f0",
                  textDecoration: t.done ? "line-through" : "none",
                }}>
                  {t.title}
                </Text>
                <View style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "12px", flexWrap: "wrap" }}>
                  <Text style={{
                    fontSize: "22px", padding: "2px 16px", borderRadius: "999px",
                    background: `${priorityColor[t.priority] ?? "#64748b"}2e`,
                    color: priorityColor[t.priority] ?? "#94a3b8",
                  }}>
                    {t.task_type}
                  </Text>
                  {t.deadline && (
                    <Text className="muted">截止 {String(t.deadline).slice(0, 10)}</Text>
                  )}
                  {t.points > 0 && (
                    <Text style={{ fontSize: "24px", color: "#f59e0b" }}>+{t.points} 积分</Text>
                  )}
                  {busyId === t.id && <Text className="muted">提交中…</Text>}
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
