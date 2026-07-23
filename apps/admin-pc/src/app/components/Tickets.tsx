import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Search, Ticket, X } from "lucide-react";
import { listTickets, TicketRow } from "../../api/tickets";
import { ApiError } from "../../api";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b", primary: "#4361ee", green: "#34d399", amber: "#fbbf24", red: "#f87171",
};

const STATUS_COLOR: Record<string, string> = { 待处理: L.amber, 处理中: L.primary, 已解决: L.green, 已关闭: L.muted };
const PRIORITY_COLOR: Record<string, string> = { 高: L.red, 中: L.amber, 低: L.muted };
const fmt = (s: string) => String(s).slice(0, 16).replace("T", " ");

/**
 * 工单：只读列表（GET /tickets），含 SLA 剩余时长（后端实时计算）。
 * 全部字段来自后端工单域，无数据时空态，不再渲染演示工单。
 */
export default function Tickets() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("全部");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    listTickets(status === "全部" ? {} : { status })
      .then(setRows)
      .catch(e => setError(e instanceof ApiError ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  const filtered = useMemo(() => rows.filter(t =>
    search === "" || t.ticket_no.includes(search) || t.ticket_type.includes(search) ||
    (t.member_name ?? "").includes(search) || (t.assignee_name ?? "").includes(search)),
  [rows, search]);

  const open = rows.filter(t => t.status !== "已解决" && t.status !== "已关闭");
  const breach = open.filter(t => t.sla_remaining_hours <= 0).length;

  return (
    <div className="p-5 h-full flex flex-col gap-3 min-w-[940px]" style={{ background: L.bg }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold" style={{ color: L.text, fontSize: 18 }}>工单</h1>
          <p className="mt-1" style={{ color: L.muted, fontSize: 11 }}>客服工单与 SLA 跟踪（剩余时长由后端按工单类型实时计算）</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: L.text2, background: L.surface, border: `1px solid ${L.border}`, fontSize: 11 }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />刷新
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[["工单总数", rows.length, Ticket, L.primary], ["处理中", open.length, Clock, L.amber], ["已解决", rows.filter(t => t.status === "已解决").length, CheckCircle, L.green], ["SLA 超时", breach, AlertTriangle, L.red]].map(([label, value, Icon, color]) => {
          const I = Icon as typeof Ticket;
          return <div key={label as string} className="p-3 rounded-md flex items-center gap-3" style={{ background: L.surface, border: `1px solid ${L.border}` }}><div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: `${color}18` }}><I size={16} style={{ color: color as string }} /></div><div><div className="font-semibold" style={{ color: L.text, fontSize: 16 }}>{value as number}</div><div style={{ color: L.muted, fontSize: 9 }}>{label as string}</div></div></div>;
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2 rounded-md flex items-center gap-2" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <Search size={12} style={{ color: L.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none flex-1" style={{ color: L.text, fontSize: 10 }} placeholder="搜索工单号、类型、会员或处理人" />
          {search && <button onClick={() => setSearch("")} title="清除搜索"><X size={11} style={{ color: L.muted }} /></button>}
        </div>
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-md outline-none" style={{ color: L.text2, background: L.surface, border: `1px solid ${L.border}`, fontSize: 9 }}>
            <option>全部</option><option>待处理</option><option>处理中</option><option>已解决</option><option>已关闭</option>
          </select>
        </div>
      </div>

      <section className="flex-1 rounded-md overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="grid grid-cols-[1.1fr_0.9fr_1fr_1fr_0.6fr_0.9fr_0.8fr] px-3 py-2.5" style={{ color: L.muted, background: L.surface2, fontSize: 9 }}>
          <span>工单号</span><span>类型</span><span>会员</span><span>处理人</span><span>优先级</span><span>SLA 剩余</span><span>状态</span>
        </div>
        <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
          {loading && <div className="py-16 text-center" style={{ color: L.muted, fontSize: 11 }}>加载中…</div>}
          {!loading && error && <div className="py-16 text-center" style={{ color: L.red, fontSize: 11 }}>{error}<button onClick={load} className="ml-2 underline">重试</button></div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-2">
              <Ticket size={26} style={{ color: L.muted, opacity: 0.5 }} />
              <div style={{ color: L.text2, fontSize: 12 }}>{rows.length === 0 ? "暂无工单" : "无匹配结果"}</div>
              <div style={{ color: L.muted, fontSize: 9 }}>{rows.length === 0 ? "运营创建工单或系统派生工单后在此展示" : "调整搜索或筛选条件"}</div>
            </div>
          )}
          {!loading && !error && filtered.map(t => {
            const done = t.status === "已解决" || t.status === "已关闭";
            const overdue = !done && t.sla_remaining_hours <= 0;
            return (
              <div key={t.id} className="grid grid-cols-[1.1fr_0.9fr_1fr_1fr_0.6fr_0.9fr_0.8fr] px-3 py-2.5 items-center" style={{ borderTop: `1px solid ${L.border2}` }}>
                <span className="font-mono truncate" style={{ color: L.text2, fontSize: 9 }}>{t.ticket_no}</span>
                <span style={{ color: L.text2, fontSize: 9 }}>{t.ticket_type}</span>
                <span className="truncate" style={{ color: L.text, fontSize: 9 }}>{t.member_name ?? "—"}</span>
                <span className="truncate" style={{ color: L.text2, fontSize: 9 }}>{t.assignee_name ?? "未指派"}</span>
                <span><span className="px-1.5 py-0.5 rounded" style={{ color: PRIORITY_COLOR[t.priority] ?? L.text2, background: L.surface2, fontSize: 8 }}>{t.priority}</span></span>
                <span style={{ color: done ? L.muted : overdue ? L.red : L.text2, fontSize: 9 }}>{done ? "—" : overdue ? "已超时" : `${t.sla_remaining_hours}h`}</span>
                <span><span className="px-1.5 py-0.5 rounded" style={{ color: STATUS_COLOR[t.status] ?? L.text2, background: L.surface2, fontSize: 8 }}>{t.status}</span></span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
