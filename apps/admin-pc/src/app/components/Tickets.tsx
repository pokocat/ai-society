import { useState } from "react";
import { Search, Plus, CheckCircle, AlertTriangle, X, ChevronRight, User } from "lucide-react";

const L = {
  bg: "#0d1629",
  surface: "#131f35",
  border: "rgba(255,255,255,0.07)",
  borderLight: "rgba(255,255,255,0.04)",
  primary: "#4361ee",
  primaryBg: "rgba(67,97,238,0.15)",
  text: "#e2e8f0",
  textSec: "#94a3b8",
  muted: "#64748b",
  mutedLight: "#475569",
  surface2: "#1a2640",
};

const tickets = [
  { id: 1, no: "TK2026070501", type: "入群异常", user: "刘晓峰", phone: "138-9876-5432", assignee: "吴思远", city: "北京", status: "进行中", priority: "高", slaHours: 2, slaTotal: 4, created: "2026-07-05 08:00", desc: "用户扫码入群后显示群已满，备用群链接失效", tags: ["入群", "群码"] },
  { id: 2, no: "TK2026070502", type: "退款跟进", user: "王建国", phone: "158-0123-4569", assignee: "刘刚", city: "广州", status: "待处理", priority: "高", slaHours: 6, slaTotal: 8, created: "2026-07-04 14:00", desc: "用户申请退款，声称未使用任何服务，需核实订单记录", tags: ["退款", "争议"] },
  { id: 3, no: "TK2026070503", type: "账号问题", user: "张晓红", phone: "139-0123-4568", assignee: "林小燕", city: "上海", status: "已解决", priority: "中", slaHours: 0, slaTotal: 12, created: "2026-07-03 10:00", desc: "用户无法登录小程序，已协助重置密码", tags: ["账号", "已解决"] },
  { id: 4, no: "TK2026070504", type: "服务回访", user: "陈美玲", phone: "137-0123-4570", assignee: "待分配", city: "成都", status: "待处理", priority: "低", slaHours: 12, slaTotal: 24, created: "2026-07-05 07:00", desc: "新用户入会 7 日回访，确认权益使用情况", tags: ["回访", "新用户"] },
  { id: 5, no: "TK2026070505", type: "功能咨询", user: "赵志远", phone: "186-0123-4571", assignee: "待分配", city: "深圳", status: "待处理", priority: "中", slaHours: 8, slaTotal: 12, created: "2026-07-05 09:30", desc: "城市合伙人询问分销佣金结算规则及提现时间", tags: ["分销", "佣金"] },
  { id: 6, no: "TK2026070506", type: "内容投诉", user: "孙伟明", phone: "152-0123-4572", assignee: "林小燕", city: "上海", status: "进行中", priority: "中", slaHours: 4, slaTotal: 8, created: "2026-07-04 20:00", desc: "用户反映群内有其他用户发送广告，请求处理", tags: ["社群", "投诉"] },
  { id: 7, no: "TK2026070507", type: "技术故障", user: "钱美艳", phone: "186-6543-2109", assignee: "技术支持", city: "广州", status: "已解决", priority: "高", slaHours: 0, slaTotal: 2, created: "2026-07-04 18:00", desc: "支付页面报错，已修复并退还重复扣款", tags: ["支付", "技术"] },
];

const statusConfig: Record<string, { bg: string; color: string }> = {
  "进行中": { bg: "rgba(67,97,238,0.15)", color: "#818cf8" },
  "待处理": { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  "已解决": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
};

const priorityConfig: Record<string, { color: string }> = {
  "高": { color: "#ef4444" },
  "中": { color: "#f59e0b" },
  "低": { color: L.primary },
};

function SlaBar({ hours, total }: { hours: number; total: number }) {
  const remaining = total - hours;
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  const color = pct < 30 ? "#ef4444" : pct < 60 ? "#f59e0b" : "#059669";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: L.border }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs flex-shrink-0" style={{ color }}>{remaining}h</span>
    </div>
  );
}

export default function Tickets() {
  // 工单模块尚未接线后端（无 tickets API）：仅保留展示与筛选，
  // 写操作（新建/指派/完成/升级/跟进）一律禁用，禁止假成功反馈。
  const ticketList = tickets;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [selected, setSelected] = useState<number | null>(null);

  const stats = [
    { label: "全部", count: ticketList.length },
    { label: "待处理", count: ticketList.filter(t => t.status === "待处理").length },
    { label: "进行中", count: ticketList.filter(t => t.status === "进行中").length },
    { label: "已解决", count: ticketList.filter(t => t.status === "已解决").length },
    { label: "高优先", count: ticketList.filter(t => t.priority === "高" && t.status !== "已解决").length },
  ];

  const filtered = ticketList.filter(t =>
    (statusFilter === "全部" || t.status === statusFilter || (statusFilter === "高优先" && t.priority === "高" && t.status !== "已解决")) &&
    (t.no.includes(search) || t.user.includes(search) || t.type.includes(search) || t.assignee.includes(search))
  );

  const detail = ticketList.find(t => t.id === selected);

  return (
    <div className="p-6 h-full flex flex-col gap-4" style={{ background: L.bg }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold" style={{ color: L.text }}>工单中心</h2>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>管理咨询、售后、入群异常、退款跟进等工单</p>
        </div>
        {/* 未接线：禁用，防止假成功 */}
        <button disabled title="接线中" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>
          <Plus size={13} /> 新建工单
        </button>
      </div>

      {/* Stat tabs */}
      <div className="flex gap-2">
        {stats.map(s => (
          <button
            key={s.label}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all"
            style={{ background: statusFilter === s.label ? L.primaryBg : L.surface, border: statusFilter === s.label ? `1px solid ${L.primary}` : `1px solid ${L.border}`, color: statusFilter === s.label ? L.primary : L.muted }}
            onClick={() => setStatusFilter(s.label)}
          >
            <span>{s.label}</span>
            <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: statusFilter === s.label ? L.primaryBg : L.bg, color: statusFilter === s.label ? L.primary : L.muted, border: `1px solid ${L.border}` }}>
              {s.count}
            </span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#1a2640", border: `1px solid ${L.border}` }}>
          <Search size={13} style={{ color: L.muted }} />
          <input className="bg-transparent outline-none text-xs w-40" style={{ color: L.textSec }} placeholder="搜索工单..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Table */}
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="grid text-xs px-4 py-2.5 flex-shrink-0" style={{ gridTemplateColumns: "130px 90px 80px 100px 80px 90px 80px 1fr", background: "#1a2640", borderBottom: `1px solid ${L.border}`, color: L.muted }}>
            <div>工单号</div>
            <div>类型</div>
            <div>用户</div>
            <div>处理人</div>
            <div>优先级</div>
            <div>状态</div>
            <div>SLA剩余</div>
            <div>操作</div>
          </div>
          <div className="overflow-auto flex-1">
            {filtered.map((t, idx) => {
              const st = statusConfig[t.status];
              const pr = priorityConfig[t.priority];
              const isSelected = selected === t.id;
              return (
                <div
                  key={t.id}
                  className="grid items-center px-4 py-3 cursor-pointer transition-all"
                  style={{ gridTemplateColumns: "130px 90px 80px 100px 80px 90px 80px 1fr", background: isSelected ? L.primaryBg : idx % 2 === 1 ? "#1a2640" : L.surface, borderBottom: `1px solid ${L.border}`, borderLeft: isSelected ? `2px solid ${L.primary}` : "2px solid transparent" }}
                  onClick={() => setSelected(isSelected ? null : t.id)}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = L.surface2; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = idx % 2 === 1 ? "#1a2640" : L.surface; }}
                >
                  <span className="text-xs font-mono" style={{ color: isSelected ? L.primary : L.muted }}>{t.no}</span>
                  <span className="text-xs" style={{ color: L.text }}>{t.type}</span>
                  <span className="text-xs" style={{ color: L.muted }}>{t.user}</span>
                  <div className="flex items-center gap-1">
                    <User size={10} style={{ color: t.assignee === "待分配" ? "#ef4444" : L.muted }} />
                    <span className="text-xs" style={{ color: t.assignee === "待分配" ? "#f87171" : L.muted }}>{t.assignee}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: pr.color }} />
                    <span className="text-xs" style={{ color: pr.color }}>{t.priority}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs w-fit" style={{ background: st.bg, color: st.color }}>{t.status}</span>
                  {t.status !== "已解决" ? (
                    <SlaBar hours={t.slaHours} total={t.slaTotal} />
                  ) : (
                    <span className="text-xs" style={{ color: L.muted }}>—</span>
                  )}
                  <div className="flex gap-1">
                    {/* 未接线：禁用写操作 */}
                    {t.status === "待处理" && (
                      <button disabled title="接线中" className="px-2 py-1 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: L.primaryBg, color: L.primary }} onClick={e => e.stopPropagation()}>指派</button>
                    )}
                    {t.status === "进行中" && (
                      <button disabled title="接线中" className="px-2 py-1 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }} onClick={e => e.stopPropagation()}>完成</button>
                    )}
                    <button className="px-2 py-1 rounded text-xs flex items-center gap-0.5" style={{ background: L.bg, color: L.muted, border: `1px solid ${L.border}` }} onClick={() => setSelected(t.id)}>
                      <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {detail && (
          <div className="w-[280px] flex-shrink-0 rounded-xl p-4 flex flex-col gap-4" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="flex items-center justify-between" style={{ paddingBottom: "12px", borderBottom: `1px solid ${L.borderLight}` }}>
              <div className="text-sm font-medium" style={{ color: L.text }}>工单详情</div>
              <button onClick={() => setSelected(null)}><X size={14} style={{ color: L.muted }} /></button>
            </div>

            <div className="py-3 rounded-xl px-3" style={{ background: L.bg }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono" style={{ color: L.primary }}>{detail.no}</span>
                <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: statusConfig[detail.status].bg, color: statusConfig[detail.status].color }}>{detail.status}</span>
              </div>
              <div className="text-sm font-medium" style={{ color: L.text }}>{detail.type}</div>
              <div className="text-xs mt-1.5" style={{ color: L.muted }}>{detail.desc}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {detail.tags.map(t => (
                  <span key={t} className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: L.primaryBg, color: L.primary }}>{t}</span>
                ))}
              </div>
            </div>

            {detail.status !== "已解决" && (
              <div>
                <div className="text-xs mb-1.5" style={{ color: L.muted }}>SLA 剩余</div>
                <SlaBar hours={detail.slaHours} total={detail.slaTotal} />
              </div>
            )}

            {[["用户", detail.user], ["联系方式", detail.phone], ["所在城市", detail.city], ["处理人", detail.assignee], ["优先级", detail.priority], ["创建时间", detail.created]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${L.borderLight}` }}>
                <span className="text-xs" style={{ color: L.muted }}>{k}</span>
                <span className="text-xs" style={{ color: k === "处理人" && v === "待分配" ? "#f87171" : L.textSec }}>{v}</span>
              </div>
            ))}

            <div className="flex flex-col gap-2 mt-auto">
              {/* 未接线：写操作一律禁用，防止假成功 */}
              {detail.assignee === "待分配" && (
                <button disabled title="接线中" className="w-full py-2 rounded-lg text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "linear-gradient(135deg, #4361ee, #3451d1)" }}>指派处理人</button>
              )}
              {detail.status === "进行中" && (
                <button disabled title="接线中" className="w-full py-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                  <CheckCircle size={12} className="inline mr-1" />标记已解决
                </button>
              )}
              <button disabled title="接线中" className="w-full py-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.textSec }}>添加跟进记录</button>
              <button disabled title="接线中" className="w-full py-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
                <AlertTriangle size={12} className="inline mr-1" />升级处理
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
