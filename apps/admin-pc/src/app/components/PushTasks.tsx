import { useEffect, useMemo, useState } from "react";
import { Send, RefreshCw, Search, X, CheckCircle, Clock } from "lucide-react";
import { listBroadcasts, BroadcastPlan } from "../../api/content";
import { ApiError } from "../../api";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b", primary: "#4361ee", green: "#34d399", amber: "#fbbf24", red: "#f87171",
};

const STATUS_COLOR: Record<string, string> = { 草稿: L.muted, 待派发: L.amber, 派发中: L.primary, 已完成: L.green, 已取消: L.muted, 已停止: L.red };
const fmt = (s: string | null) => (s ? String(s).slice(0, 16).replace("T", " ") : "—");

/**
 * 推送任务：企微群发计划与派发进度（真实数据 GET /content/broadcasts）。
 * 群发的创建/派发/取消在「内容运营中心」操作；本页聚焦任务与进度只读视图。
 * task_done/task_total 为半自动派发的真实进度（API 建任务、群主客户端确认，见内容域说明）。
 */
export default function PushTasks() {
  const [rows, setRows] = useState<BroadcastPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("全部");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    listBroadcasts(status === "全部" ? undefined : status)
      .then(setRows)
      .catch(e => setError(e instanceof ApiError ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [status]);

  const filtered = useMemo(() => rows.filter(b => search === "" || b.title.includes(search)), [rows, search]);
  const active = rows.filter(b => b.status === "派发中" || b.status === "待派发").length;

  return (
    <div className="p-5 h-full flex flex-col gap-3 min-w-[860px]" style={{ background: L.bg }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold" style={{ color: L.text, fontSize: 18 }}>推送任务</h1>
          <p className="mt-1" style={{ color: L.muted, fontSize: 11 }}>企微群发计划与派发进度（数据来自后端内容域；创建/派发在内容运营中心）</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: L.text2, background: L.surface, border: `1px solid ${L.border}`, fontSize: 11 }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />刷新
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[["群发任务", rows.length, Send, L.primary], ["进行中", active, Clock, L.amber], ["已完成", rows.filter(b => b.status === "已完成").length, CheckCircle, L.green]].map(([label, value, Icon, color]) => {
          const I = Icon as typeof Send;
          return <div key={label as string} className="p-3 rounded-md flex items-center gap-3" style={{ background: L.surface, border: `1px solid ${L.border}` }}><div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: `${color}18` }}><I size={16} style={{ color: color as string }} /></div><div><div className="font-semibold" style={{ color: L.text, fontSize: 16 }}>{value as number}</div><div style={{ color: L.muted, fontSize: 9 }}>{label as string}</div></div></div>;
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2 rounded-md flex items-center gap-2" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <Search size={12} style={{ color: L.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none flex-1" style={{ color: L.text, fontSize: 10 }} placeholder="搜索群发标题" />
          {search && <button onClick={() => setSearch("")} title="清除搜索"><X size={11} style={{ color: L.muted }} /></button>}
        </div>
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-md outline-none" style={{ color: L.text2, background: L.surface, border: `1px solid ${L.border}`, fontSize: 9 }}>
            <option>全部</option><option>待派发</option><option>派发中</option><option>已完成</option><option>已取消</option>
          </select>
        </div>
      </div>

      <section className="flex-1 rounded-md overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="grid grid-cols-[2fr_0.8fr_1.4fr_1fr] px-3 py-2.5" style={{ color: L.muted, background: L.surface2, fontSize: 9 }}>
          <span>群发标题</span><span>状态</span><span>派发进度</span><span>派发时间</span>
        </div>
        <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
          {loading && <div className="py-16 text-center" style={{ color: L.muted, fontSize: 11 }}>加载中…</div>}
          {!loading && error && <div className="py-16 text-center" style={{ color: L.red, fontSize: 11 }}>{error}<button onClick={load} className="ml-2 underline">重试</button></div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-2">
              <Send size={26} style={{ color: L.muted, opacity: 0.5 }} />
              <div style={{ color: L.text2, fontSize: 12 }}>{rows.length === 0 ? "暂无群发任务" : "无匹配结果"}</div>
              <div style={{ color: L.muted, fontSize: 9 }}>{rows.length === 0 ? "在「内容运营中心」创建群发后在此展示进度" : "调整搜索或筛选条件"}</div>
            </div>
          )}
          {!loading && !error && filtered.map(b => {
            const pct = b.task_total > 0 ? Math.round((b.task_done / b.task_total) * 100) : 0;
            return (
              <div key={b.id} className="grid grid-cols-[2fr_0.8fr_1.4fr_1fr] px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${L.border2}` }}>
                <span className="truncate" style={{ color: L.text, fontSize: 10 }}>{b.title}</span>
                <span><span className="px-1.5 py-0.5 rounded" style={{ color: STATUS_COLOR[b.status] ?? L.text2, background: L.surface2, fontSize: 8 }}>{b.status}</span></span>
                <span className="flex items-center gap-2 pr-3">
                  <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: L.surface2 }}><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? L.green : L.primary }} /></span>
                  <span style={{ color: L.muted, fontSize: 9 }}>{b.task_done}/{b.task_total}</span>
                </span>
                <span style={{ color: L.muted, fontSize: 9 }}>{fmt(b.dispatched_at ?? b.created_at)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
