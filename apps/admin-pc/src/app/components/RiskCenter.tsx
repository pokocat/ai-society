import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Check, ListChecks, ShieldAlert, ClipboardCheck,
  RefreshCw, CircleDot, Loader2, X,
} from "lucide-react";
import { riskApi, ApiError } from "../../api";
import type { RiskEventRow } from "../../api/risk";

/** 纯白黄绿黑主题（与 PCLayout 外壳一致） */
const C = {
  bg: "#ffffff", surface: "#ffffff", panel2: "#f7ffd9", border: "rgba(5,8,5,0.14)",
  primary: "#b6ff00", ink: "#050805", text: "#050805", textSec: "#2f3a29", muted: "#68705a",
  danger: "#ff4d4f", warning: "#f2b600", success: "#22c55e",
};

const LEVEL_CFG: Record<string, { bg: string; color: string }> = {
  "高": { bg: "rgba(255,77,79,0.14)", color: "#d92d20" },
  "中": { bg: "rgba(242,182,0,0.18)", color: "#9a6b00" },
  "低": { bg: "rgba(5,8,5,0.08)", color: "#2f3a29" },
};
const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  "待处理": { bg: "rgba(255,77,79,0.12)", color: "#d92d20" },
  "处理中": { bg: "rgba(242,182,0,0.16)", color: "#9a6b00" },
  "已解决": { bg: "rgba(34,197,94,0.16)", color: "#047a32" },
  "已忽略": { bg: "rgba(5,8,5,0.06)", color: "#68705a" },
};
const cfg = (m: Record<string, { bg: string; color: string }>, k: string) =>
  m[k] ?? { bg: "rgba(5,8,5,0.06)", color: "#68705a" };

interface Toast { text: string; kind: "success" | "error"; }

export default function RiskCenter() {
  const [events, setEvents] = useState<RiskEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("待处理");
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [resolving, setResolving] = useState<RiskEventRow | null>(null);
  const [resolution, setResolution] = useState("");

  const notify = (text: string, kind: "success" | "error" = "success") => setToast({ text, kind });
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await riskApi.listRiskEvents({ status: statusFilter, level: levelFilter });
      setEvents(rows);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "加载风险事件失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, levelFilter]);
  useEffect(() => { load(); }, [load]);

  // 统计口径：始终基于当前筛选结果，避免与展示不一致
  const stats = useMemo(() => {
    const by = (pred: (e: RiskEventRow) => boolean) => events.filter(pred).length;
    return {
      total: events.length,
      high: by(e => e.level === "高"),
      pending: by(e => e.status === "待处理"),
      processing: by(e => e.status === "处理中"),
    };
  }, [events]);

  const convert = async (e: RiskEventRow, target: "task" | "approval") => {
    setBusyId(e.id);
    try {
      const r = await riskApi.convertRiskEvent(e.id, target);
      notify(target === "task" ? `已转为整改任务 #${r.taskId}` : `已转为审批单 #${r.approvalId}`);
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "转换失败", "error");
    } finally {
      setBusyId(null);
    }
  };

  const doResolve = async () => {
    if (!resolving) return;
    setBusyId(resolving.id);
    try {
      await riskApi.resolveRiskEvent(resolving.id, resolution.trim() || "已处理");
      notify(`风险事件 #${resolving.id} 已标记解决`);
      setResolving(null);
      setResolution("");
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "操作失败", "error");
    } finally {
      setBusyId(null);
    }
  };

  const STAT_TILES = [
    { label: "当前风险事项", value: stats.total, icon: <ShieldAlert size={16} />, color: C.text },
    { label: "高风险", value: stats.high, icon: <AlertTriangle size={16} />, color: C.danger },
    { label: "待处理", value: stats.pending, icon: <CircleDot size={16} />, color: C.warning },
    { label: "处理中", value: stats.processing, icon: <Loader2 size={16} />, color: C.textSec },
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: C.bg, color: C.text }}>
      {toast && (
        <div className="fixed top-16 left-1/2 z-[80] -translate-x-1/2 px-4 py-2.5 rounded-md shadow-2xl flex items-center gap-2"
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: toast.kind === "success" ? "#047a32" : C.danger, fontSize: 11 }}>
          {toast.kind === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}{toast.text}
        </div>
      )}

      {/* 标题 */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="font-semibold" style={{ fontSize: 16 }}>异常与风险中心</div>
          <div style={{ color: C.muted, fontSize: 11 }}>统一收口群配置、账号、负载、同步与任务异常，可转整改任务或审批处置</div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text, fontSize: 11 }}>
          <RefreshCw size={12} /> 刷新
        </button>
      </div>

      {/* 统计卡 */}
      <div className="px-6 grid grid-cols-4 gap-3 flex-shrink-0">
        {STAT_TILES.map(t => (
          <div key={t.label} className="rounded-xl px-4 py-3" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between" style={{ color: t.color }}>
              <span style={{ fontSize: 11, color: C.muted }}>{t.label}</span>{t.icon}
            </div>
            <div className="mt-1 font-bold" style={{ fontSize: 22, color: t.color }}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* 过滤 */}
      <div className="px-6 py-3 flex items-center gap-2 flex-shrink-0">
        {["待处理", "处理中", "已解决", ""].map(s => (
          <button key={s || "all"} onClick={() => setStatusFilter(s)}
            className="px-3 py-1.5 rounded-lg" style={{ fontSize: 11,
              background: statusFilter === s ? C.primary : C.panel2,
              color: statusFilter === s ? C.ink : C.textSec,
              border: `1px solid ${C.border}`, fontWeight: statusFilter === s ? 600 : 400 }}>
            {s || "全部状态"}
          </button>
        ))}
        <span className="w-px h-4 mx-1" style={{ background: C.border }} />
        {["", "高", "中", "低"].map(l => (
          <button key={l || "alllv"} onClick={() => setLevelFilter(l)}
            className="px-3 py-1.5 rounded-lg" style={{ fontSize: 11,
              background: levelFilter === l ? C.ink : C.panel2,
              color: levelFilter === l ? C.primary : C.textSec,
              border: `1px solid ${C.border}`, fontWeight: levelFilter === l ? 600 : 400 }}>
            {l ? `${l}风险` : "全部级别"}
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: C.muted, fontSize: 12 }}>
            <Loader2 size={16} className="animate-spin mr-2" /> 加载中…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20" style={{ color: C.danger, fontSize: 12 }}>
            <AlertTriangle size={16} className="mr-2" /> {error}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: C.muted, fontSize: 12 }}>
            <Check size={28} style={{ color: C.success }} />
            <div className="mt-2">当前筛选下没有风险事项</div>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            {events.map((e, i) => {
              const lc = cfg(LEVEL_CFG, e.level);
              const sc = cfg(STATUS_CFG, e.status);
              const converted = e.converted_task_id || e.converted_approval_id;
              const terminal = e.status === "已解决" || e.status === "已忽略";
              return (
                <div key={e.id} className="px-4 py-3 flex items-center gap-3"
                  style={{ background: C.surface, borderTop: i ? `1px solid ${C.border}` : "none" }}>
                  <span className="px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: lc.bg, color: lc.color, fontSize: 10, fontWeight: 600 }}>{e.level}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ fontSize: 12, color: C.text }}>{e.title}</div>
                    <div className="flex items-center gap-2 mt-0.5" style={{ fontSize: 10, color: C.muted }}>
                      <span>{e.risk_type}</span>
                      {e.ref_id && <span>· {e.ref_type}:{e.ref_id}</span>}
                      {e.owner && <span>· 负责人 {e.owner}</span>}
                      {converted ? <span style={{ color: C.textSec }}>· {e.converted_task_id ? `整改任务#${e.converted_task_id}` : `审批#${e.converted_approval_id}`}</span> : null}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: sc.bg, color: sc.color, fontSize: 10 }}>{e.status}</span>
                  {!terminal && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button disabled={busyId === e.id} onClick={() => convert(e, "task")}
                        className="flex items-center gap-1 px-2 py-1 rounded-md disabled:opacity-50" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text, fontSize: 10 }}>
                        <ListChecks size={11} /> 转任务
                      </button>
                      <button disabled={busyId === e.id} onClick={() => convert(e, "approval")}
                        className="flex items-center gap-1 px-2 py-1 rounded-md disabled:opacity-50" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text, fontSize: 10 }}>
                        <ClipboardCheck size={11} /> 转审批
                      </button>
                      <button disabled={busyId === e.id} onClick={() => { setResolving(e); setResolution(""); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md disabled:opacity-50" style={{ background: C.primary, color: C.ink, fontSize: 10, fontWeight: 600 }}>
                        {busyId === e.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} 解决
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 解决备注弹层 */}
      {resolving && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: "rgba(5,8,5,0.35)" }} onClick={() => setResolving(null)}>
          <div className="rounded-xl w-[420px] p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }} onClick={ev => ev.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold" style={{ fontSize: 13, color: C.text }}>标记解决</span>
              <X size={16} style={{ color: C.muted, cursor: "pointer" }} onClick={() => setResolving(null)} />
            </div>
            <div className="mb-2" style={{ fontSize: 11, color: C.muted }}>{resolving.title}</div>
            <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={3} placeholder="处理说明（可选）"
              className="w-full px-3 py-2 rounded-lg outline-none resize-none" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12 }} />
            <div className="flex gap-2 mt-3">
              <button disabled={busyId === resolving.id} onClick={() => setResolving(null)} className="flex-1 py-2 rounded-lg disabled:opacity-50" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text, fontSize: 12 }}>取消</button>
              <button disabled={busyId === resolving.id} onClick={doResolve} className="flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: C.primary, color: C.ink, fontSize: 12, fontWeight: 600 }}>
                {busyId === resolving.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} 确认解决
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
