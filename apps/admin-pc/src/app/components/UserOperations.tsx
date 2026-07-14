import { useState } from "react";
import {
  Search, Phone, MessageCircle, ShoppingCart, Users, FileText,
  Star, Clock, AlertTriangle, Plus, MapPin, ArrowUp, ArrowDown,
  Filter, Download, X, User, ChevronRight, Gift, CreditCard,
  Tags, CalendarDays, Send, TrendingUp,
} from "lucide-react";
import UserSegment from "./UserSegment";
import MemberBenefits from "./MemberBenefits";
import Activities from "./Activities";
import PushTasks from "./PushTasks";
import InfluenceRanking from "./InfluenceRanking";

const L = {
  bg:         "#0d1629",
  surface:    "#131f35",
  surface2:   "#1a2640",
  border:     "rgba(255,255,255,0.07)",
  borderLight:"rgba(255,255,255,0.04)",
  primary:    "#4361ee",
  primaryBg:  "rgba(67,97,238,0.15)",
  text:       "#e2e8f0",
  textSec:    "#94a3b8",
  muted:      "#64748b",
};

// ── KPI ──────────────────────────────────────────────────────────
const kpis = [
  { label: "总用户数",   value: "2,892", delta: "+186", up: true,  color: "#4361ee" },
  { label: "PRO会员",   value: "1,247", delta: "+32",  up: true,  color: "#818cf8" },
  { label: "体验官",     value: "634",   delta: "+21",  up: true,  color: "#34d399" },
  { label: "待分配用户", value: "23",    delta: "+8",   up: true,  color: "#fbbf24" },
  { label: "流失风险",   value: "67",    delta: "+5",   up: false, color: "#f87171" },
];

// ── 身份颜色（深色主题，高亮色） ───────────────────────────────
const IDENTITY: Record<string, { color: string; bg: string }> = {
  "PRO会员": { color: "#818cf8", bg: "rgba(67,97,238,0.15)"   },
  "体验官":  { color: "#34d399", bg: "rgba(16,185,129,0.15)"  },
  "游客":    { color: "#94a3b8", bg: "rgba(100,116,139,0.15)" },
  "代理":    { color: "#38bdf8", bg: "rgba(56,189,248,0.15)"  },
  "黑金":    { color: "#fbbf24", bg: "rgba(245,158,11,0.15)"  },
};

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  "已完成": { bg: "rgba(16,185,129,0.15)", color: "#34d399"  },
  "退款中": { bg: "rgba(239,68,68,0.15)",  color: "#f87171"  },
  "进行中": { bg: "rgba(67,97,238,0.15)",  color: "#818cf8"  },
  "已解决": { bg: "rgba(16,185,129,0.15)", color: "#34d399"  },
  "待确认": { bg: "rgba(245,158,11,0.15)", color: "#fbbf24"  },
};

const TIMELINE_COLOR: Record<string, string> = {
  order: "#4361ee", ticket: "#fbbf24", group: "#34d399",
  refund: "#f87171", visit: "#38bdf8", register: "#a78bfa",
};

// ── 数据 ─────────────────────────────────────────────────────────
const USERS = [
  {
    id: 1, name: "李云天", phone: "138-0123-4567", wechat: "liyuntian88",
    identity: "PRO会员", city: "北京", source: "公众号", referrer: "吴思远",
    group: "北京PRO会员群01", teacher: "吴思远", memberSince: "2025-03-15",
    expiry: "2027-03-01", spend: 5460, orders: 2, score: 88,
    tags: ["高价值", "活跃"],
    orderList: [
      { no: "ORD2025031501", product: "PRO会员年卡",  amount: 2980, status: "已完成", date: "2025-03-15" },
      { no: "ORD2026030101", product: "续费PRO年卡",  amount: 2480, status: "已完成", date: "2026-03-01" },
    ],
    ticketList: [{ no: "TK2026070501", type: "功能咨询", status: "已解决", date: "2026-07-01" }],
    timeline: [
      { action: "注册账号",      time: "2025-03-10", type: "register" },
      { action: "购买PRO会员年卡", time: "2025-03-15", type: "order" },
      { action: "加入北京PRO群01", time: "2025-03-16", type: "group" },
      { action: "续费PRO年卡",    time: "2026-03-01", type: "order" },
      { action: "提交工单：功能咨询", time: "2026-07-01", type: "ticket" },
      { action: "服务老师回访",   time: "2026-07-03", type: "visit" },
    ],
  },
  {
    id: 2, name: "张晓红", phone: "139-0123-4568", wechat: "zhangxiaohong_sh",
    identity: "体验官", city: "上海", source: "小红书", referrer: "—",
    group: "上海游客群01", teacher: "林小燕", memberSince: "2026-06-20",
    expiry: "—", spend: 980, orders: 1, score: 52,
    tags: ["潜力用户"],
    orderList: [{ no: "ORD2026062001", product: "体验营", amount: 980, status: "已完成", date: "2026-06-20" }],
    ticketList: [],
    timeline: [
      { action: "注册账号",     time: "2026-06-18", type: "register" },
      { action: "购买体验营",   time: "2026-06-20", type: "order" },
      { action: "加入上海游客群01", time: "2026-06-21", type: "group" },
    ],
  },
  {
    id: 3, name: "王建国", phone: "158-0123-4569", wechat: "wangjg2023",
    identity: "代理", city: "广州", source: "代理推荐", referrer: "刘刚",
    group: "广州代理群01", teacher: "刘刚", memberSince: "2025-08-10",
    expiry: "2026-08-09", spend: 4800, orders: 1, score: 41,
    tags: ["代理", "退款风险"],
    orderList: [{ no: "ORD2025081001", product: "代理授权费", amount: 4800, status: "退款中", date: "2025-08-10" }],
    ticketList: [{ no: "TK2026070502", type: "退款跟进", status: "进行中", date: "2026-07-04" }],
    timeline: [
      { action: "购买代理授权",    time: "2025-08-10", type: "order" },
      { action: "申请退款",        time: "2026-07-03", type: "refund" },
      { action: "提交工单：退款跟进", time: "2026-07-04", type: "ticket" },
    ],
  },
  {
    id: 4, name: "陈美玲", phone: "137-0123-4570", wechat: "chenmeiling_cd",
    identity: "游客", city: "成都", source: "抖音", referrer: "—",
    group: "—", teacher: "待分配", memberSince: "2026-07-01",
    expiry: "—", spend: 0, orders: 0, score: 22,
    tags: ["待分配"],
    orderList: [],
    ticketList: [],
    timeline: [{ action: "注册账号", time: "2026-07-01", type: "register" }],
  },
  {
    id: 5, name: "孙伟明", phone: "152-0123-4572", wechat: "sunwm_sh",
    identity: "PRO会员", city: "上海", source: "企业微信", referrer: "林小燕",
    group: "上海PRO会员群01", teacher: "林小燕", memberSince: "2025-06-01",
    expiry: "2026-06-01", spend: 3860, orders: 3, score: 74,
    tags: ["稳定复购"],
    orderList: [
      { no: "ORD2025060101", product: "PRO会员年卡",  amount: 2980, status: "已完成", date: "2025-06-01" },
      { no: "ORD2025120101", product: "PRO会员季卡",  amount: 880,  status: "已完成", date: "2025-12-01" },
    ],
    ticketList: [],
    timeline: [
      { action: "购买PRO年卡",     time: "2025-06-01", type: "order" },
      { action: "购买PRO季卡追加", time: "2025-12-01", type: "order" },
    ],
  },
  {
    id: 6, name: "赵志远", phone: "186-0123-4571", wechat: "zhaozhy_sz",
    identity: "黑金", city: "深圳", source: "城市合伙人", referrer: "—",
    group: "深圳合伙人群", teacher: "李梦华", memberSince: "2024-01-10",
    expiry: "2025-01-09", spend: 38400, orders: 5, score: 96,
    tags: ["高净值", "城市合伙人"],
    orderList: [
      { no: "ORD2024011001", product: "城市合伙人费",  amount: 29800, status: "已完成", date: "2024-01-10" },
      { no: "ORD2024060101", product: "黑金年卡",      amount: 8600,  status: "已完成", date: "2024-06-01" },
    ],
    ticketList: [],
    timeline: [
      { action: "加入城市合伙人", time: "2024-01-10", type: "order" },
      { action: "升级黑金会员",   time: "2024-06-01", type: "order" },
      { action: "服务老师季度回访", time: "2026-04-01", type: "visit" },
    ],
  },
];

type FilterTab = "全部" | "PRO会员" | "体验官" | "代理" | "游客" | "黑金" | "待分配";
const TABS: FilterTab[] = ["全部", "PRO会员", "体验官", "代理", "游客", "黑金", "待分配"];
const DETAIL_TABS = ["基本信息", "订单记录", "群组信息", "工单记录", "操作日志"];

function UsersWorkbench() {
  const [search, setSearch]       = useState("");
  const [tab, setTab]             = useState<FilterTab>("全部");
  const [selectedId, setSelectedId] = useState<number>(1);
  const [detailTab, setDetailTab] = useState(0);

  const filtered = USERS.filter(u => {
    const matchTab =
      tab === "全部"   ? true :
      tab === "待分配" ? u.tags.includes("待分配") :
      u.identity === tab;
    const matchSearch = !search || u.name.includes(search) || u.phone.includes(search) || u.wechat.includes(search);
    return matchTab && matchSearch;
  });

  const user = USERS.find(u => u.id === selectedId) ?? USERS[0];
  const idStyle = IDENTITY[user.identity] ?? IDENTITY["游客"];

  return (
    <div className="flex flex-col h-full" style={{ background: L.bg }}>

      {/* ── KPI strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 p-4 pb-0">
        {kpis.map((k, i) => (
          <div key={i} className="rounded-xl px-4 py-3 relative overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="absolute top-0 right-0 w-12 h-12 rounded-full opacity-20 -translate-y-2 translate-x-2" style={{ background: k.color, filter: "blur(16px)" }} />
            <div style={{ color: L.muted, fontSize: "11px" }}>{k.label}</div>
            <div className="font-bold mt-0.5" style={{ color: k.color, fontSize: "20px" }}>{k.value}</div>
            <div className="flex items-center gap-1 mt-0.5">
              {k.up ? <ArrowUp size={9} style={{ color: "#34d399" }} /> : <ArrowDown size={9} style={{ color: "#f87171" }} />}
              <span style={{ color: k.up ? "#34d399" : "#f87171", fontSize: "10px" }}>{k.delta}</span>
              <span style={{ color: L.muted, fontSize: "10px" }}>本月</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div>
          <h2 className="font-bold" style={{ color: L.text, fontSize: "15px" }}>会员档案</h2>
          <p style={{ color: L.muted, fontSize: "11px" }}>查看并管理所有用户信息、服务记录与操作日志</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: L.surface2, color: L.textSec, border: `1px solid ${L.border}` }}>
            <Download size={12} />导出
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white" style={{ background: "linear-gradient(90deg, #4361ee, #7c3aed)" }}>
            <Plus size={12} />添加用户
          </button>
        </div>
      </div>

      {/* ── Main: list + detail ──────────────────────────────── */}
      <div className="flex flex-1 gap-3 px-4 pb-4 min-h-0">

        {/* Left: user list */}
        <div className="flex flex-col rounded-xl overflow-hidden flex-shrink-0" style={{ width: 260, background: L.surface, border: `1px solid ${L.border}` }}>
          {/* Search */}
          <div className="p-3" style={{ borderBottom: `1px solid ${L.border}` }}>
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: L.surface2, border: `1px solid ${L.border}` }}>
              <Search size={11} style={{ color: L.muted }} />
              <input className="bg-transparent outline-none text-xs flex-1" style={{ color: L.text }} placeholder="搜索姓名、手机号..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && <X size={11} style={{ color: L.muted, cursor: "pointer" }} onClick={() => setSearch("")} />}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1 px-3 py-2" style={{ borderBottom: `1px solid ${L.border}` }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} className="px-2 py-0.5 rounded-md text-xs transition-all"
                style={{ background: tab === t ? L.primaryBg : "transparent", color: tab === t ? "#818cf8" : L.muted, border: tab === t ? "1px solid rgba(67,97,238,0.3)" : "1px solid transparent" }}>
                {t}
              </button>
            ))}
          </div>

          {/* User count */}
          <div className="px-3 py-1.5 flex items-center justify-between">
            <span style={{ color: L.muted, fontSize: "10px" }}>共 {filtered.length} 名用户</span>
            <Filter size={11} style={{ color: L.muted }} />
          </div>

          {/* List */}
          <div className="flex-1 overflow-auto px-2 pb-2 space-y-1" style={{ scrollbarWidth: "none" }}>
            {filtered.map(u => {
              const isel = selectedId === u.id;
              const id2 = IDENTITY[u.identity] ?? IDENTITY["游客"];
              return (
                <div key={u.id} onClick={() => { setSelectedId(u.id); setDetailTab(0); }}
                  className="rounded-xl p-3 cursor-pointer transition-all"
                  style={{ background: isel ? L.primaryBg : "transparent", border: isel ? "1px solid rgba(67,97,238,0.35)" : `1px solid ${L.borderLight}`, borderLeft: isel ? "2px solid #4361ee" : "2px solid transparent" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${id2.color}, ${id2.color}88)` }}>
                      {u.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold" style={{ color: isel ? "#818cf8" : L.text }}>{u.name}</div>
                      <div className="text-xs truncate" style={{ color: L.muted }}>{u.phone} · {u.city}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded-full" style={{ background: id2.bg, color: id2.color, fontSize: "10px" }}>{u.identity}</span>
                    {u.tags.includes("退款风险") && <span className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", fontSize: "10px" }}>⚠ 退款风险</span>}
                    {u.tags.includes("待分配")   && <span className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", fontSize: "10px" }}>待分配</span>}
                    {u.tags.includes("高净值")   && <span className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", fontSize: "10px" }}>高净值</span>}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-8" style={{ color: L.muted, fontSize: "12px" }}>无匹配用户</div>
            )}
          </div>
        </div>

        {/* Right: user detail */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

          {/* User header card */}
          <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            {/* Cover */}
            <div className="relative h-16 px-5 flex items-end pb-0" style={{ background: `linear-gradient(135deg, ${idStyle.color}30, rgba(67,97,238,0.15))` }}>
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
              {/* Score badge */}
              <div className="absolute top-3 right-4 flex items-center gap-2">
                <div className="w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center" style={{ borderColor: idStyle.color, background: L.surface }}>
                  <div className="font-black leading-none" style={{ color: idStyle.color, fontSize: "13px" }}>
                    {user.score >= 90 ? "A+" : user.score >= 75 ? "A" : user.score >= 60 ? "B+" : user.score >= 45 ? "B" : "C"}
                  </div>
                </div>
                <div style={{ color: L.muted, fontSize: "10px" }}>综合评分<br /><span style={{ color: idStyle.color, fontWeight: 700 }}>{user.score}</span>/100</div>
              </div>
            </div>

            <div className="px-5 pt-3 pb-4">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0 -mt-8 border-4" style={{ background: `linear-gradient(135deg, ${idStyle.color}, ${idStyle.color}88)`, borderColor: L.surface }}>
                  {user.name[0]}
                </div>
                <div className="flex-1 mt-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold" style={{ color: L.text, fontSize: "16px" }}>{user.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: idStyle.bg, color: idStyle.color }}>{user.identity}</span>
                    {user.tags.includes("高价值") && <Star size={13} style={{ color: "#fbbf24" }} />}
                    {user.tags.includes("高净值") && <Star size={13} style={{ color: "#fbbf24" }} />}
                    {user.tags.includes("退款风险") && <AlertTriangle size={13} style={{ color: "#f87171" }} />}
                  </div>
                  <div className="flex items-center gap-4 mt-1" style={{ color: L.muted, fontSize: "11px" }}>
                    <span className="flex items-center gap-1"><Phone size={10} />{user.phone}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={10} />{user.wechat}</span>
                    <span className="flex items-center gap-1"><MapPin size={10} />{user.city}</span>
                    <span>入会 {user.memberSince}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {user.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full" style={{ background: L.primaryBg, color: "#818cf8", fontSize: "10px" }}>{t}</span>
                    ))}
                  </div>
                </div>
                {/* Action buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button className="px-3 py-1.5 rounded-lg text-xs" style={{ background: L.primaryBg, color: "#818cf8", border: `1px solid rgba(67,97,238,0.3)` }}>发提醒</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>分配群</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs text-white flex items-center gap-1" style={{ background: "linear-gradient(90deg, #4361ee, #7c3aed)" }}>
                    <Plus size={11} />建工单
                  </button>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-5 gap-2 mt-4">
                {[
                  { label: "总消费",   value: user.spend > 0 ? `¥${user.spend.toLocaleString()}` : "¥0",      icon: CreditCard,    color: "#fbbf24" },
                  { label: "订单数",   value: `${user.orders} 单`,   icon: ShoppingCart, color: "#4361ee"  },
                  { label: "工单数",   value: `${user.ticketList.length} 条`, icon: FileText, color: "#a78bfa"  },
                  { label: "所在群",   value: user.group === "—" ? "未入群" : "已入群", icon: Users, color: user.group === "—" ? "#f87171" : "#34d399" },
                  { label: "服务老师", value: user.teacher,          icon: User,         color: "#38bdf8"  },
                ].map((s, i) => (
                  <div key={i} className="px-3 py-2.5 rounded-xl flex items-center gap-2" style={{ background: L.surface2 }}>
                    <s.icon size={13} style={{ color: s.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ color: L.muted, fontSize: "10px" }}>{s.label}</div>
                      <div className="font-semibold" style={{ color: s.color, fontSize: "12px" }}>{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detail tabs */}
          <div className="flex gap-0 rounded-xl overflow-hidden flex-shrink-0" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            {DETAIL_TABS.map((t, i) => (
              <button key={i} onClick={() => setDetailTab(i)} className="flex-1 py-2.5 text-xs font-medium transition-all"
                style={{ background: detailTab === i ? L.primaryBg : "transparent", color: detailTab === i ? "#818cf8" : L.muted, borderBottom: detailTab === i ? "2px solid #4361ee" : "2px solid transparent" }}>
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 rounded-xl p-4 overflow-auto" style={{ background: L.surface, border: `1px solid ${L.border}`, minHeight: 200 }}>

            {/* 基本信息 */}
            {detailTab === 0 && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: "#818cf8" }}>
                    <User size={12} />基本资料
                  </div>
                  {[["姓名", user.name], ["手机号", user.phone], ["微信号", user.wechat], ["所在城市", user.city], ["用户身份", user.identity], ["入会时间", user.memberSince], ["到期时间", user.expiry]].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2" style={{ borderBottom: `1px solid ${L.borderLight}` }}>
                      <span style={{ color: L.muted, fontSize: "12px" }}>{k}</span>
                      <span style={{ color: L.textSec, fontSize: "12px" }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: "#818cf8" }}>
                    <ChevronRight size={12} />服务信息
                  </div>
                  {[["来源渠道", user.source], ["推荐人", user.referrer], ["所在群", user.group], ["服务老师", user.teacher]].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2" style={{ borderBottom: `1px solid ${L.borderLight}` }}>
                      <span style={{ color: L.muted, fontSize: "12px" }}>{k}</span>
                      <span style={{ color: L.textSec, fontSize: "12px" }}>{v}</span>
                    </div>
                  ))}
                  <div className="text-xs font-semibold mt-5 mb-3 flex items-center gap-1.5" style={{ color: "#818cf8" }}>
                    <Gift size={12} />用户标签
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.tags.map(t => (
                      <span key={t} className="px-2.5 py-1 rounded-full text-xs" style={{ background: L.primaryBg, color: "#818cf8", border: "1px solid rgba(67,97,238,0.2)" }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 订单记录 */}
            {detailTab === 1 && (
              <div className="space-y-2.5">
                {user.orderList.length === 0 ? (
                  <div className="text-center py-10" style={{ color: L.muted, fontSize: "12px" }}>暂无订单记录</div>
                ) : user.orderList.map(o => {
                  const b = STATUS_BADGE[o.status] ?? { bg: L.surface2, color: L.textSec };
                  return (
                    <div key={o.no} className="flex items-center gap-4 p-3.5 rounded-xl" style={{ background: L.surface2, border: `1px solid ${L.border}` }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(67,97,238,0.15)" }}>
                        <ShoppingCart size={15} style={{ color: "#4361ee" }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium" style={{ color: L.text, fontSize: "13px" }}>{o.product}</div>
                        <div style={{ color: L.muted, fontSize: "11px" }}>{o.no} · {o.date}</div>
                      </div>
                      <div className="font-bold" style={{ color: "#fbbf24", fontSize: "14px" }}>¥{o.amount.toLocaleString()}</div>
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: b.bg, color: b.color }}>{o.status}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 群组信息 */}
            {detailTab === 2 && (
              <div>
                {user.group === "—" ? (
                  <div className="text-center py-10">
                    <Users size={28} className="mx-auto mb-3" style={{ color: L.muted }} />
                    <div className="text-sm mb-3" style={{ color: L.muted }}>用户尚未分配群组</div>
                    <button className="px-5 py-2 rounded-xl text-xs text-white" style={{ background: "linear-gradient(90deg, #4361ee, #7c3aed)" }}>立即分配群组</button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl" style={{ background: L.surface2, border: `1px solid ${L.border}` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                        <Users size={16} style={{ color: "#34d399" }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium" style={{ color: L.text, fontSize: "13px" }}>{user.group}</div>
                        <div style={{ color: L.muted, fontSize: "11px" }}>服务老师：{user.teacher}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>已入群</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 工单记录 */}
            {detailTab === 3 && (
              <div className="space-y-2.5">
                {user.ticketList.length === 0 ? (
                  <div className="text-center py-10" style={{ color: L.muted, fontSize: "12px" }}>暂无工单记录</div>
                ) : user.ticketList.map(t => {
                  const b = STATUS_BADGE[t.status] ?? { bg: L.surface2, color: L.textSec };
                  return (
                    <div key={t.no} className="flex items-center gap-4 p-3.5 rounded-xl" style={{ background: L.surface2, border: `1px solid ${L.border}` }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
                        <FileText size={15} style={{ color: "#fbbf24" }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium" style={{ color: L.text, fontSize: "13px" }}>{t.type}</div>
                        <div style={{ color: L.muted, fontSize: "11px" }}>{t.no} · {t.date}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: b.bg, color: b.color }}>{t.status}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 操作日志 */}
            {detailTab === 4 && (
              <div className="relative pl-5">
                <div className="absolute left-2 top-2 bottom-2 w-px" style={{ background: L.border }} />
                {user.timeline.map((e, i) => (
                  <div key={i} className="relative flex items-start gap-3 mb-4">
                    <div className="absolute -left-4 w-3 h-3 rounded-full border-2 flex-shrink-0 mt-0.5" style={{ background: TIMELINE_COLOR[e.type], borderColor: L.surface }} />
                    <div>
                      <div className="text-xs font-medium" style={{ color: L.textSec }}>{e.action}</div>
                      <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: L.muted }}>
                        <Clock size={9} />{e.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const OPERATION_TABS = [
  { id: "influence", label: "影响力运营台", desc: "排行榜、关系链、操作台和回访记录", icon: TrendingUp },
  { id: "users", label: "会员档案", desc: "用户列表、详情、订单、群组和操作日志", icon: User },
  { id: "segment", label: "画像标签", desc: "标签体系、分层和用户筛选", icon: Tags },
  { id: "members", label: "会员权益", desc: "权益包、会员等级和到期策略", icon: Star },
  { id: "activities", label: "活动通知", desc: "活动、公告和会员触达", icon: CalendarDays },
  { id: "pushtasks", label: "推送任务", desc: "微信触达任务和效果跟踪", icon: Send },
] as const;

type OperationTab = typeof OPERATION_TABS[number]["id"];

export default function UserOperations() {
  const [operationTab, setOperationTab] = useState<OperationTab>("influence");

  const renderTab = () => {
    switch (operationTab) {
      case "segment":
        return <UserSegment />;
      case "members":
        return <MemberBenefits />;
      case "activities":
        return <Activities />;
      case "pushtasks":
        return <PushTasks />;
      case "influence":
        return <InfluenceRanking />;
      default:
        return <UsersWorkbench />;
    }
  };

  return (
    <div className="h-full flex flex-col min-w-[1080px]" style={{ background: L.bg }}>
      <div className="px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${L.border}` }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold" style={{ color: L.text, fontSize: 18 }}>会员运营工作台</h1>
              <span className="px-2 py-0.5 rounded-md" style={{ background: L.primaryBg, color: "#818cf8", fontSize: 9 }}>已合并</span>
            </div>
            <p className="mt-1" style={{ color: L.muted, fontSize: 11 }}>影响力运营台承接排行榜、关系链、操作台和回访记录；会员档案用于查用户基础资料。</p>
          </div>
          <div className="rounded-xl px-3 py-2" style={{ background: L.surface, border: `1px solid ${L.border}`, color: L.textSec, fontSize: 11 }}>
            当前入口：会员运营 / {OPERATION_TABS.find(tab => tab.id === operationTab)?.label}
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2 mt-3">
          {OPERATION_TABS.map(tab => {
            const Icon = tab.icon;
            const active = operationTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setOperationTab(tab.id)}
                className="rounded-xl px-3 py-2.5 text-left transition-all"
                style={{ background: active ? L.primaryBg : L.surface, border: `1px solid ${active ? "rgba(67,97,238,0.35)" : L.border}` }}
              >
                <div className="flex items-center gap-2">
                  <Icon size={13} style={{ color: active ? "#818cf8" : L.muted }} />
                  <span className="font-medium" style={{ color: active ? "#818cf8" : L.textSec, fontSize: 11 }}>{tab.label}</span>
                </div>
                <div className="mt-1 leading-snug" style={{ color: L.muted, fontSize: 9 }}>{tab.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {renderTab()}
      </div>
    </div>
  );
}
