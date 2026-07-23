import { Database, UserPlus, AlertTriangle, TrendingUp, Shield, RefreshCw, BarChart3, LineChart as LineIcon, Bot } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useProject } from "../contexts/ProjectContext";
import { assignmentApi, riskApi, ApiError } from "../../api";
import type { RiskEventRow } from "../../api/risk";

const D = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.07)",
  primary: "#4361ee", text: "#e2e8f0", textSec: "#94a3b8", muted: "#64748b",
};

/**
 * 数据总览。
 * 有后端来源的指标走真实接口（待分配用户数 assignmentApi、高风险事件 riskApi、项目聚合来自 ProjectContext）；
 * 无后端聚合来源的部分（增长/收益/城市分布趋势图、AI 建议、待办、团队）不再渲染硬编码演示数据，
 * 统一显示「暂无接口来源」占位——聚合报表接口落地后再接。
 */
function Placeholder({ title, sub, icon }: { title: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 flex flex-col" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
      <div className="mb-3">
        <div className="text-sm font-semibold" style={{ color: D.text }}>{title}</div>
        <div style={{ color: D.muted, fontSize: "11px" }}>{sub}</div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8" style={{ minHeight: 140 }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(67,97,238,0.1)" }}>{icon}</div>
        <div style={{ color: D.textSec, fontSize: 11 }}>暂无接口来源</div>
        <div style={{ color: D.muted, fontSize: 9 }}>聚合报表接口落地后展示</div>
      </div>
    </div>
  );
}

export default function Overview() {
  const { currentProject } = useProject();
  const projectId = currentProject.id;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [riskEvents, setRiskEvents] = useState<RiskEventRow[]>([]);

  const loadStats = useCallback(async () => {
    if (!projectId) { setPendingCount(null); setRiskEvents([]); return; }
    try {
      const rows = await assignmentApi.listPending(projectId);
      setPendingCount(rows.length);
    } catch (err) {
      console.error("[Overview] 加载待分配用户数失败：", err instanceof ApiError ? err.message : err);
      setPendingCount(null);
    }
    try {
      const risks = await riskApi.listRiskEvents({ level: "高", projectId });
      setRiskEvents(risks.filter(r => r.status === "待处理" || r.status === "处理中"));
    } catch (err) {
      console.error("[Overview] 加载高风险事件失败：", err instanceof ApiError ? err.message : err);
      setRiskEvents([]);
    }
  }, [projectId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await loadStats(); } finally { setIsRefreshing(false); }
  };

  const kpiCards = [
    { label: "总用户数", value: currentProject.users != null ? currentProject.users.toLocaleString() : "—", sub: "当前项目成员", color: "#4361ee", glow: "rgba(67,97,238,0.2)" },
    { label: "活跃微信账号", value: currentProject.wechatAccounts != null ? currentProject.wechatAccounts.toLocaleString() : "—", sub: "账号资产", color: "#06b6d4", glow: "rgba(6,182,212,0.2)" },
    { label: "活跃社群", value: currentProject.groups != null ? currentProject.groups.toLocaleString() : "—", sub: "本项目群组", color: "#8b5cf6", glow: "rgba(139,92,246,0.2)" },
    { label: "待分配用户", value: pendingCount != null ? pendingCount.toLocaleString() : "—", sub: "待入群分配", color: "#10b981", glow: "rgba(16,185,129,0.2)" },
    { label: "本月收益", value: "—", sub: "交易域不在中台", color: "#f59e0b", glow: "rgba(245,158,11,0.2)" },
  ];

  return (
    <div className="p-5 space-y-4" style={{ background: D.bg }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: D.text }}>数据总览</h1>
          <p style={{ color: D.muted, fontSize: "12px" }}>实时监控私域运营核心指标</p>
        </div>
        <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: D.surface, color: D.textSec, border: `1px solid ${D.border}` }}>
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />{isRefreshing ? "刷新中..." : "刷新数据"}
        </button>
      </div>

      {/* KPI strip — 真实项目聚合 + 待分配（riskApi/assignmentApi/ProjectContext），无来源显示 "—" */}
      <div className="grid grid-cols-5 gap-3">
        {kpiCards.map((k, i) => (
          <div key={i} className="rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-20 -translate-y-4 translate-x-4" style={{ background: k.glow, filter: "blur(20px)" }} />
            <div className="text-xs" style={{ color: D.muted }}>{k.label}</div>
            <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <span style={{ color: D.muted, fontSize: "10px" }}>{k.sub}</span>
          </div>
        ))}
      </div>

      {/* 高风险提醒（真实 riskApi） + 账号概览 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 320px" }}>
        <div className="rounded-2xl p-5" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} style={{ color: "#ef4444" }} />
            <span className="text-sm font-semibold" style={{ color: D.text }}>高风险提醒</span>
            <span className="ml-auto px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", fontSize: 10 }}>{riskEvents.length} 项待处理</span>
          </div>
          <div className="space-y-2">
            {riskEvents.slice(0, 6).map(r => (
              <div key={r.id} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#ef4444" }} />
                <div>
                  <div style={{ color: "#fca5a5", fontSize: 11, fontWeight: 500 }}>{r.title}</div>
                  <div style={{ color: D.muted, fontSize: 9, marginTop: 2 }}>{r.risk_type} · {r.status}</div>
                </div>
              </div>
            ))}
            {riskEvents.length === 0 && (
              <div className="py-10 text-center" style={{ color: D.muted, fontSize: 11 }}>暂无高风险事项</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <span className="text-sm font-semibold" style={{ color: D.text }}>账号概览</span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[
              { label: "账号总数", value: currentProject.wechatAccounts != null ? currentProject.wechatAccounts.toLocaleString() : "—", color: "#4361ee" },
              { label: "活跃社群", value: currentProject.groups != null ? currentProject.groups.toLocaleString() : "—", color: "#8b5cf6" },
              { label: "总用户数", value: currentProject.users != null ? currentProject.users.toLocaleString() : "—", color: "#06b6d4" },
              { label: "待分配", value: pendingCount != null ? pendingCount.toLocaleString() : "—", color: "#10b981" },
            ].map((s, i) => (
              <div key={i} className="rounded-xl p-3 text-center" style={{ background: D.surface2 }}>
                <div className="font-bold" style={{ color: s.color, fontSize: "16px" }}>{s.value}</div>
                <div style={{ color: D.muted, fontSize: "10px" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(67,97,238,0.06)", border: `1px solid ${D.border}` }}>
            <Bot size={13} style={{ color: D.muted }} />
            <span style={{ color: D.muted, fontSize: 9 }}>AI 运营建议引擎接线中</span>
          </div>
        </div>
      </div>

      {/* 趋势图表 — 聚合报表接口落地前统一占位，不渲染演示数据 */}
      <div className="grid grid-cols-3 gap-4">
        <Placeholder title="用户增长趋势" sub="近 7 日新增用户 & 订单" icon={<LineIcon size={20} style={{ color: D.primary }} />} />
        <Placeholder title="月度收益趋势" sub="交易域不在中台，收益为外部只读镜像" icon={<TrendingUp size={20} style={{ color: D.primary }} />} />
        <Placeholder title="城市会员分布" sub="各城市会员数量" icon={<BarChart3 size={20} style={{ color: D.primary }} />} />
      </div>

      {/* 底部指标 — 有真实来源走接口，无来源显示 "—" */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "账号资产总数", value: currentProject.wechatAccounts != null ? currentProject.wechatAccounts.toLocaleString() : "—", sub: "当前项目", icon: Database, color: "#4361ee", bg: "rgba(67,97,238,0.12)" },
          { label: "待分配用户", value: pendingCount != null ? pendingCount.toLocaleString() : "—", sub: "待入群分配", icon: UserPlus, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
          { label: "高风险事项", value: riskEvents.length.toLocaleString(), sub: "待处理/处理中", icon: Shield, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
          { label: "活跃社群", value: currentProject.groups != null ? currentProject.groups.toLocaleString() : "—", sub: "本项目群组", icon: TrendingUp, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-4 flex items-center gap-3" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ color: D.muted, fontSize: "11px" }}>{s.label}</div>
              <div className="font-bold" style={{ color: s.color, fontSize: "18px" }}>{s.value}</div>
              <div style={{ color: D.muted, fontSize: "10px" }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
