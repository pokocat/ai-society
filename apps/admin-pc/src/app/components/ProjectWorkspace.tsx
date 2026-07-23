import { useCallback, useEffect, useState } from "react";
import { LayoutDashboard, RefreshCw, UserPlus, FileCheck2, Ticket, ArrowRight, AlertTriangle } from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { assignmentApi, approvalsApi, ApiError } from "../../api";
import type { PendingMember } from "../../api/assignment";
import type { ApprovalRow } from "../../api/approvals";
import { listTickets, TicketRow } from "../../api/tickets";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.075)", border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0", text2: "#94a3b8", muted: "#64748b", primary: "#4361ee", green: "#34d399", amber: "#fbbf24", red: "#f87171", purple: "#7c3aed",
};

const fmt = (s: string) => String(s).slice(5, 16).replace("T", " ");

/**
 * 工作台：跨模块待办聚合（真实数据）。
 * 由三个已有后端接口组合：待分配 assignmentApi.listPending / 待审批 approvalsApi.listApprovals（未决）/
 * 待处理工单 tickets.listTickets（未解决）。均按当前项目过滤，只读概览 + 跳转到对应模块处理。
 */
export default function ProjectWorkspace() {
  const { currentProject } = useProject();
  const pid = currentProject.id;

  const [pending, setPending] = useState<PendingMember[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!pid) return;
    setLoading(true);
    setError(null);
    try {
      const [p, a, t] = await Promise.all([
        assignmentApi.listPending(pid).catch(() => [] as PendingMember[]),
        approvalsApi.listApprovals({}).catch(() => [] as ApprovalRow[]),
        listTickets({}).catch(() => [] as TicketRow[]),
      ]);
      setPending(p);
      // 未决审批：尚未做出决定（decided_at 为空），按当前项目过滤
      setApprovals(a.filter(x => !x.decided_at && (x.project_id === pid || x.project_id === null)));
      // 未解决工单
      setTickets(t.filter(x => x.status !== "已解决" && x.status !== "已关闭" && (x.project_id === pid || x.project_id === null)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => { load(); }, [load]);

  // 真实导航：App 监听 window 的 flm:navigate 事件切换模块（见 App.tsx）
  const go = (key: string) => window.dispatchEvent(new CustomEvent("flm:navigate", { detail: key }));

  const cards = [
    { key: "assignment", label: "待分配入群", value: pending.length, icon: UserPlus, color: L.primary, sub: "会员待安置进群" },
    { key: "approval", label: "待审批事项", value: approvals.length, icon: FileCheck2, color: L.amber, sub: "超容量/交接/发布等" },
    { key: "tickets", label: "待处理工单", value: tickets.length, icon: Ticket, color: L.red, sub: "客服工单未解决" },
  ];

  return (
    <div className="p-5 h-full flex flex-col gap-3 min-w-[900px]" style={{ background: L.bg }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold" style={{ color: L.text, fontSize: 18 }}>工作台</h1>
          <p className="mt-1" style={{ color: L.muted, fontSize: 11 }}>{currentProject.name} · 跨模块待办聚合（数据实时汇总自各业务域）</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: L.text2, background: L.surface, border: `1px solid ${L.border}`, fontSize: 11 }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />刷新
        </button>
      </div>

      {error && <div className="px-3 py-2 rounded-md" style={{ color: L.red, background: "rgba(239,68,68,0.08)", border: `1px solid rgba(239,68,68,0.2)`, fontSize: 11 }}>{error}<button onClick={load} className="ml-2 underline">重试</button></div>}

      <div className="grid grid-cols-3 gap-3">
        {cards.map(c => (
          <button key={c.key} onClick={() => go(c.key)} className="p-4 rounded-lg flex items-center gap-3 text-left transition-all hover:brightness-110" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${c.color}18` }}><c.icon size={20} style={{ color: c.color }} /></div>
            <div className="flex-1">
              <div className="font-bold" style={{ color: c.color, fontSize: 22 }}>{loading ? "—" : c.value}</div>
              <div style={{ color: L.text2, fontSize: 11 }}>{c.label}</div>
              <div style={{ color: L.muted, fontSize: 9 }}>{c.sub}</div>
            </div>
            <ArrowRight size={14} style={{ color: L.muted }} />
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
        <Panel title="待分配入群" icon={<UserPlus size={13} style={{ color: L.primary }} />} onMore={() => go("assignment")} empty={!loading && pending.length === 0} emptyText="暂无待分配会员">
          {pending.slice(0, 12).map(m => (
            <Row key={m.id} main={m.name} sub={`${m.identity ?? "游客"}${m.city ? " · " + m.city : ""}`} tag={m.referrer_name ? `荐:${m.referrer_name}` : ""} />
          ))}
        </Panel>
        <Panel title="待审批事项" icon={<FileCheck2 size={13} style={{ color: L.amber }} />} onMore={() => go("approval")} empty={!loading && approvals.length === 0} emptyText="暂无待审批">
          {approvals.slice(0, 12).map(a => (
            <Row key={a.id} main={a.title} sub={`${a.approval_type} · ${a.submitter}`} tag={a.urgent ? "紧急" : ""} tagColor={L.red} />
          ))}
        </Panel>
        <Panel title="待处理工单" icon={<Ticket size={13} style={{ color: L.red }} />} onMore={() => go("tickets")} empty={!loading && tickets.length === 0} emptyText="暂无待处理工单">
          {tickets.slice(0, 12).map(t => {
            const overdue = t.sla_remaining_hours <= 0;
            return <Row key={t.id} main={t.ticket_type} sub={`${t.member_name ?? "—"} · ${t.priority}`} tag={overdue ? "超时" : `${t.sla_remaining_hours}h`} tagColor={overdue ? L.red : L.muted} icon={overdue ? <AlertTriangle size={9} style={{ color: L.red }} /> : undefined} />;
          })}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, icon, onMore, empty, emptyText, children }: { title: string; icon: React.ReactNode; onMore: () => void; empty: boolean; emptyText: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md overflow-hidden flex flex-col" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ background: L.surface2 }}>
        <span className="flex items-center gap-1.5" style={{ color: L.text, fontSize: 11, fontWeight: 600 }}>{icon}{title}</span>
        <button onClick={onMore} className="flex items-center gap-0.5" style={{ color: L.muted, fontSize: 9 }}>处理<ArrowRight size={9} /></button>
      </div>
      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
        {empty && <div className="py-14 text-center" style={{ color: L.muted, fontSize: 10 }}>{emptyText}</div>}
        {children}
      </div>
    </section>
  );
}

function Row({ main, sub, tag, tagColor, icon }: { main: string; sub: string; tag?: string; tagColor?: string; icon?: React.ReactNode }) {
  return (
    <div className="px-3 py-2 flex items-center gap-2" style={{ borderTop: `1px solid ${L.border2}` }}>
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ color: L.text, fontSize: 10 }}>{main}</div>
        <div className="truncate mt-0.5" style={{ color: L.muted, fontSize: 8 }}>{sub}</div>
      </div>
      {tag && <span className="flex items-center gap-0.5 flex-shrink-0" style={{ color: tagColor ?? L.muted, fontSize: 8 }}>{icon}{tag}</span>}
    </div>
  );
}
