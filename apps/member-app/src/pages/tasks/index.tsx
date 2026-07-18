import { useCallback, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { completeTask, getTasks, MemberTask } from "../../api/mp";
import { useTabSync } from "../../utils/tab";
import { M } from "../../theme";
import Icon from "../../components/Icon";

const priorityColor: Record<string, string> = { 高: "#ef4444", 中: "#f59e0b", 低: "#4361ee" };

/** 任务页（对齐设计稿 TaskTab）：头区进度条 + 打卡得积分（member_task + points_ledger，全真实）。 */
export default function Tasks() {
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useTabSync(2);

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
    <View className="page">
      <View className="hd">
        <Text className="hd-title">我的任务</Text>
        <View className="f" style={{ gap: "24rpx", marginTop: "16rpx" }}>
          <Text className="t-muted">今日进度</Text>
          <Text className="t-green" style={{ fontWeight: 600, fontSize: "24rpx" }}>
            {done.length}/{tasks.length} 已完成
          </Text>
          {donePoints > 0 && <Text className="t-amber" style={{ fontSize: "24rpx" }}>+{donePoints} 积分获得</Text>}
        </View>
        <View className="progress-track" style={{ marginTop: "22rpx" }}>
          <View
            className="progress-fill"
            style={{ width: tasks.length ? `${Math.round((done.length / tasks.length) * 100)}%` : "0%" }}
          />
        </View>
      </View>

      {loaded && tasks.length === 0 && (
        <View className="card" style={{ textAlign: "center", padding: "70rpx 32rpx" }}>
          <Text className="t-muted">暂无任务，稍后再来看看</Text>
        </View>
      )}
      {tasks.map(t => {
        const pc = priorityColor[t.priority] ?? "#64748b";
        return (
          <View
            key={t.id}
            className="card"
            onClick={() => void complete(t)}
            style={{
              opacity: t.done ? 0.75 : 1,
              background: t.done ? "rgba(16,185,129,0.08)" : M.surface2,
              borderColor: t.done ? "rgba(16,185,129,0.3)" : M.border,
            }}
          >
            <View className="f" style={{ gap: "22rpx", alignItems: "flex-start" }}>
              <View
                className="task-check"
                style={{ marginTop: "2rpx", borderColor: t.done ? "#10b981" : pc, background: t.done ? "#10b981" : "transparent" }}
              >
                {t.done && <Icon name="check-circle" size={22} color="#ffffff" />}
              </View>
              <View className="f-1">
                <Text
                  className="t-strong"
                  style={{ color: t.done ? M.muted : M.text, textDecoration: t.done ? "line-through" : "none" }}
                >
                  {t.title}
                </Text>
                <View className="f" style={{ gap: "16rpx", marginTop: "14rpx", flexWrap: "wrap" }}>
                  <Text className="tag" style={{ background: `${pc}18`, color: pc }}>{t.task_type}</Text>
                  {t.deadline && (
                    <View className="f" style={{ gap: "8rpx" }}>
                      <Icon name="clock" size={20} color={M.muted} />
                      <Text className="t-muted">{String(t.deadline).slice(0, 10)}</Text>
                    </View>
                  )}
                  {t.points > 0 && <Text className="t-amber">+{t.points}积分</Text>}
                  {busyId === t.id && <Text className="t-muted">提交中…</Text>}
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
