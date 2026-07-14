import { useState } from "react";
import { Search, Filter, ChevronDown, AlertTriangle, CheckCircle, Clock, X, CreditCard, FileText } from "lucide-react";

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

const orders = [
  { id: 1, no: "ORD2026070501", user: "李云天", phone: "138-0123-4567", product: "续费PRO会员年卡", amount: 2480, status: "已完成", city: "北京", date: "2026-07-05 09:12", risk: "normal", channel: "微信支付" },
  { id: 2, no: "ORD2026070502", user: "张晓红", phone: "139-0123-4568", product: "体验营报名费", amount: 980, status: "待确认", city: "上海", date: "2026-07-05 10:30", risk: "normal", channel: "支付宝" },
  { id: 3, no: "ORD2026070503", user: "王建国", phone: "158-0123-4569", product: "代理授权费", amount: 4800, status: "退款申请", city: "广州", date: "2026-07-04 14:23", risk: "high", channel: "微信支付" },
  { id: 4, no: "ORD2026070504", user: "陈美玲", phone: "137-0123-4570", product: "基础会员月卡", amount: 298, status: "已完成", city: "成都", date: "2026-07-04 16:45", risk: "normal", channel: "微信支付" },
  { id: 5, no: "ORD2026070505", user: "赵志远", phone: "186-0123-4571", product: "城市合伙人费", amount: 9800, status: "审核中", city: "深圳", date: "2026-07-03 11:00", risk: "warning", channel: "银行转账" },
  { id: 6, no: "ORD2026070506", user: "孙伟明", phone: "152-0123-4572", product: "PRO会员季卡", amount: 880, status: "已完成", city: "上海", date: "2026-07-03 08:20", risk: "normal", channel: "微信支付" },
  { id: 7, no: "ORD2026070507", user: "刘晓峰", phone: "138-9876-5432", product: "代理授权费", amount: 4800, status: "退款完成", city: "北京", date: "2026-07-02 15:30", risk: "normal", channel: "微信支付" },
  { id: 8, no: "ORD2026070508", user: "钱美艳", phone: "186-6543-2109", product: "体验营", amount: 980, status: "待确认", city: "广州", date: "2026-07-02 19:00", risk: "normal", channel: "支付宝" },
];

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  "已完成": { bg: "rgba(16,185,129,0.15)", color: "#34d399", label: "已完成" },
  "待确认": { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", label: "待确认" },
  "退款申请": { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "退款申请" },
  "审核中": { bg: "rgba(67,97,238,0.15)", color: "#818cf8", label: "审核中" },
  "退款完成": { bg: "rgba(100,116,139,0.15)", color: "#94a3b8", label: "退款完成" },
};

const refundQueue = orders.filter(o => o.status === "退款申请" || o.status === "审核中");

export default function Orders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<"list" | "refund">("list");

  const filtered = orders.filter(o =>
    (statusFilter === "全部状态" || o.status === statusFilter) &&
    (o.user.includes(search) || o.no.includes(search) || o.product.includes(search) || o.city.includes(search))
  );

  const detail = orders.find(o => o.id === selected);
  const totalRevenue = orders.filter(o => o.status === "已完成").reduce((s, o) => s + o.amount, 0);

  return (
    <div className="p-6 h-full flex flex-col gap-4" style={{ background: L.bg }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold" style={{ color: L.text }}>支付订单 / 退款审核</h2>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>管理订单、退款、发票及异常支付</p>
        </div>
        <div className="flex gap-2">
          {[{ id: "list", label: "全部订单" }, { id: "refund", label: `退款队列 (${refundQueue.length})` }].map(t => (
            <button key={t.id} className="px-3 py-2 rounded-lg text-xs" style={{ background: view === t.id ? "linear-gradient(135deg, #4361ee, #3451d1)" : L.surface, color: view === t.id ? "white" : L.muted, border: view === t.id ? "none" : `1px solid ${L.border}` }} onClick={() => setView(t.id as any)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "今日营收", value: `¥${totalRevenue.toLocaleString()}`, color: "#059669" },
          { label: "订单总数", value: orders.length, color: L.primary },
          { label: "待确认", value: orders.filter(o => o.status === "待确认").length, color: "#fbbf24" },
          { label: "退款申请", value: orders.filter(o => o.status === "退款申请").length, color: "#f87171" },
          { label: "审核中", value: orders.filter(o => o.status === "审核中").length, color: "#818cf8" },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-3 py-2.5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="text-xs" style={{ color: L.muted }}>{s.label}</div>
            <div className="font-semibold mt-0.5" style={{ color: s.color, fontSize: "18px" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {view === "list" && (
            <>
              {/* Filters */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#1a2640", border: `1px solid ${L.border}` }}>
                  <Search size={13} style={{ color: L.muted }} />
                  <input className="bg-transparent outline-none text-xs flex-1" style={{ color: L.textSec }} placeholder="搜索订单号、用户、产品..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="relative">
                  <select className="appearance-none px-3 py-2 pr-7 rounded-lg text-xs outline-none cursor-pointer" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.textSec }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    {["全部状态", "已完成", "待确认", "退款申请", "审核中", "退款完成"].map(o => <option key={o} value={o} style={{ background: "#131f35" }}>{o}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: L.muted }} />
                </div>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.textSec }}>
                  <Filter size={13} /> 筛选
                </button>
              </div>

              {/* Table */}
              <div className="rounded-xl overflow-hidden flex-1" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
                <div className="grid text-xs px-4 py-2.5" style={{ gridTemplateColumns: "160px 80px 200px 90px 70px 80px 100px 90px", background: "#1a2640", borderBottom: `1px solid ${L.border}`, color: L.muted }}>
                  <div>订单号</div>
                  <div>用户</div>
                  <div>产品</div>
                  <div>金额</div>
                  <div>城市</div>
                  <div>渠道</div>
                  <div>状态</div>
                  <div>时间</div>
                </div>
                <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 420px)" }}>
                  {filtered.map((o, idx) => {
                    const st = statusConfig[o.status];
                    const isSelected = selected === o.id;
                    return (
                      <div
                        key={o.id}
                        className="grid items-center px-4 py-2.5 cursor-pointer transition-all"
                        style={{ gridTemplateColumns: "160px 80px 200px 90px 70px 80px 100px 90px", background: isSelected ? L.primaryBg : idx % 2 === 1 ? "#1a2640" : L.surface, borderBottom: `1px solid ${L.border}`, borderLeft: isSelected ? `2px solid ${L.primary}` : "2px solid transparent" }}
                        onClick={() => setSelected(isSelected ? null : o.id)}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#f8f9ff"; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = idx % 2 === 1 ? "#1a2640" : L.surface; }}
                      >
                        <div className="flex items-center gap-1.5">
                          {o.risk !== "normal" && <AlertTriangle size={11} style={{ color: o.risk === "high" ? "#ef4444" : "#f59e0b" }} />}
                          <span className="text-xs" style={{ color: isSelected ? L.primary : L.muted, fontFamily: "monospace" }}>{o.no}</span>
                        </div>
                        <div className="text-xs" style={{ color: L.text }}>{o.user}</div>
                        <div className="text-xs truncate" style={{ color: L.muted }}>{o.product}</div>
                        <div className="text-xs font-semibold" style={{ color: "#059669" }}>¥{o.amount.toLocaleString()}</div>
                        <div className="text-xs" style={{ color: L.muted }}>{o.city}</div>
                        <div className="text-xs" style={{ color: L.muted }}>{o.channel}</div>
                        <span className="px-2 py-0.5 rounded-full text-xs w-fit" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        <div className="text-xs" style={{ color: L.muted }}>{o.date.split(" ")[1]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {view === "refund" && (
            <div className="flex-1 rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${L.border}`, background: "#fff5f5" }}>
                <AlertTriangle size={14} style={{ color: "#ef4444" }} />
                <span className="text-sm font-medium" style={{ color: "#f87171" }}>退款审核队列</span>
                <span className="ml-auto text-xs" style={{ color: L.muted }}>按申请时间排序</span>
              </div>
              <div className="space-y-3 p-4">
                {refundQueue.map(o => (
                  <div key={o.id} className="rounded-xl p-4" style={{ background: L.bg, border: `1px solid ${L.border}` }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: L.text }}>{o.user}</span>
                          <span className="text-xs font-mono" style={{ color: L.muted }}>{o.no}</span>
                          {o.risk !== "normal" && <AlertTriangle size={12} style={{ color: "#ef4444" }} />}
                        </div>
                        <div className="text-xs mt-1" style={{ color: L.muted }}>{o.product} · ¥{o.amount.toLocaleString()} · {o.date}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: statusConfig[o.status].bg, color: statusConfig[o.status].color }}>{o.status}</span>
                    </div>
                    {o.risk === "high" && (
                      <div className="mt-2 flex items-center gap-2 p-2 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.15)" }}>
                        <AlertTriangle size={11} style={{ color: "#ef4444" }} />
                        <span style={{ color: "#f87171" }}>用户已进群 · 已使用服务 · 退款风险高</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}><CheckCircle size={11} className="inline mr-1" />批准退款</button>
                      <button className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}><X size={11} className="inline mr-1" />拒绝</button>
                      <button className="px-3 py-1.5 rounded-lg text-xs" style={{ background: L.primaryBg, color: L.primary }}><FileText size={11} className="inline mr-1" />查看详情</button>
                      <button className="px-3 py-1.5 rounded-lg text-xs" style={{ background: L.primaryBg, color: L.primary }}><Clock size={11} className="inline mr-1" />转人工复核</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {detail && view === "list" && (
          <div className="w-72 flex-shrink-0 rounded-xl p-4 flex flex-col gap-4" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="flex items-center justify-between" style={{ paddingBottom: "12px", borderBottom: `1px solid ${L.borderLight}` }}>
              <div className="text-sm font-medium" style={{ color: L.text }}>订单详情</div>
              <button onClick={() => setSelected(null)}><X size={14} style={{ color: L.muted }} /></button>
            </div>
            <div className="py-4 rounded-xl text-center" style={{ background: L.bg }}>
              <CreditCard size={24} className="mx-auto mb-2" style={{ color: L.primary }} />
              <div className="text-sm font-semibold" style={{ color: L.text }}>¥{detail.amount.toLocaleString()}</div>
              <div className="text-xs mt-0.5" style={{ color: L.muted }}>{detail.product}</div>
              <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-xs" style={{ background: statusConfig[detail.status].bg, color: statusConfig[detail.status].color }}>{detail.status}</span>
            </div>
            {[["订单号", detail.no], ["用户", detail.user], ["手机", detail.phone], ["城市", detail.city], ["支付渠道", detail.channel], ["下单时间", detail.date]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${L.borderLight}` }}>
                <span className="text-xs" style={{ color: L.muted }}>{k}</span>
                <span className="text-xs" style={{ color: L.textSec }}>{v}</span>
              </div>
            ))}
            <div className="flex flex-col gap-2 mt-auto">
              {detail.status === "待确认" && <button className="w-full py-2 rounded-lg text-xs text-white" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>确认收款</button>}
              {detail.status === "退款申请" && <button className="w-full py-2 rounded-lg text-xs text-white" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>处理退款</button>}
              <button className="w-full py-2 rounded-lg text-xs" style={{ background: "#1a2640", border: `1px solid ${L.border}`, color: L.textSec }}>建立工单</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
