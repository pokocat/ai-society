import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Cell } from "recharts";
import {
  TrendingUp, Database, Users2, UserPlus, AlertTriangle, Zap,
  CheckCircle, Clock, ArrowUp, ArrowDown, MessageCircle, Bot,
  Activity, DollarSign, Star, Bell, ArrowRight, Sparkles, Shield, RefreshCw
} from "lucide-react";
import { useState } from "react";

const D = {
  bg:       "#0d1629",
  surface:  "#131f35",
  surface2: "#1a2640",
  surface3: "#1e2d47",
  border:   "rgba(255,255,255,0.07)",
  primary:  "#4361ee",
  text:     "#e2e8f0",
  textSec:  "#94a3b8",
  muted:    "#64748b",
};

const userGrowth = [
  { date: "6/29", users: 1240, orders: 42 },
  { date: "6/30", users: 1310, orders: 58 },
  { date: "7/1",  users: 1380, orders: 67 },
  { date: "7/2",  users: 1425, orders: 45 },
  { date: "7/3",  users: 1490, orders: 73 },
  { date: "7/4",  users: 1560, orders: 89 },
  { date: "7/5",  users: 1623, orders: 94 },
];

const cityData = [
  { city: "北京", members: 420 },
  { city: "上海", members: 380 },
  { city: "广州", members: 290 },
  { city: "深圳", members: 310 },
  { city: "成都", members: 180 },
  { city: "杭州", members: 140 },
];

const revenueData = [
  { month: "1月", revenue: 32000 }, { month: "2月", revenue: 28000 },
  { month: "3月", revenue: 41000 }, { month: "4月", revenue: 38000 },
  { month: "5月", revenue: 52000 }, { month: "6月", revenue: 61000 },
  { month: "7月", revenue: 48200 },
];

const aiSuggestions = [
  { icon: "🚨", title: "北京PRO会员群01 接近满员", desc: "当前 487/500，建议立即建立备用群", level: "high" },
  { icon: "💡", title: "上海有 12 名用户待分配群组", desc: "建议优先分配至上海体验官群02", level: "medium" },
  { icon: "⚡", title: "fengle_gz_01 微信已30天未登录", desc: "存在账号封禁风险，请尽快处理", level: "high" },
  { icon: "📊", title: "本周订单量较上周提升 28%", desc: "成都新增用户增长明显，建议增加资源", level: "info" },
];

const todos = [
  { text: "审核退款申请 3 条", urgent: true, time: "09:30" },
  { text: "更新广州代理群群码", urgent: false, time: "11:00" },
  { text: "完成新用户分群 8 人", urgent: true, time: "12:00" },
  { text: "工单回访：陈美玲", urgent: false, time: "14:00" },
  { text: "城市分站月报审核", urgent: false, time: "16:00" },
];

const teamMembers = [
  { name: "张明", role: "上海运营", color: "#4361ee" },
  { name: "李婷", role: "北京BD", color: "#8b5cf6" },
  { name: "王磊", role: "广州客服", color: "#06b6d4" },
  { name: "陈雪", role: "深圳运营", color: "#10b981" },
  { name: "刘凯", role: "成都BD", color: "#f59e0b" },
  { name: "赵欣", role: "杭州运营", color: "#ef4444" },
];

const kpiCards = [
  { label: "总用户数", value: "2,892", delta: "+186", deltaDir: "up", sub: "本月新增", color: "#4361ee", glow: "rgba(67,97,238,0.2)" },
  { label: "活跃微信账号", value: "1,827", delta: "+32", deltaDir: "up", sub: "在线数量", color: "#06b6d4", glow: "rgba(6,182,212,0.2)" },
  { label: "活跃社群", value: "326", delta: "-3", deltaDir: "down", sub: "接近满员", color: "#8b5cf6", glow: "rgba(139,92,246,0.2)" },
  { label: "消息到达率", value: "68.6%", delta: "+2.4%", deltaDir: "up", sub: "较上周", color: "#10b981", glow: "rgba(16,185,129,0.2)" },
  { label: "本月收益", value: "¥482,920", delta: "+12.8%", deltaDir: "up", sub: "较上月", color: "#f59e0b", glow: "rgba(245,158,11,0.2)" },
];

const DarkTip = ({ active, payload, label }: any) => active && payload?.length ? (
  <div className="px-3 py-2 rounded-lg text-xs shadow-xl" style={{ background: "#1e2d47", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
    <div className="font-medium mb-1 text-slate-300">{label}</div>
    {payload.map((p: any) => (
      <div key={p.name} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" && p.value > 1000 ? `¥${p.value.toLocaleString()}` : p.value}</div>
    ))}
  </div>
) : null;

export default function Overview() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <div className="p-5 space-y-4" style={{ background: D.bg }}>

      {/* Refresh button */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: D.text }}>数据总览</h1>
          <p style={{ color: D.muted, fontSize: "12px" }}>实时监控私域运营核心指标</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: D.surface,
            color: D.textSec,
            border: `1px solid ${D.border}`,
          }}
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "刷新中..." : "刷新数据"}
        </button>
      </div>

      {/* Hidden SVG — gradient defs used by Recharts charts */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
        <defs>
          <linearGradient id="ovRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4361ee" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4361ee" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Top KPI strip ────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {kpiCards.map((k, i) => (
          <div 
            key={i} 
            className="rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-all cursor-pointer group"
            style={{ background: D.surface, border: `1px solid ${D.border}` }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = `0 8px 24px ${k.glow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-20 -translate-y-4 translate-x-4 group-hover:opacity-30 transition-opacity" style={{ background: k.glow, filter: "blur(20px)" }} />
            <div className="text-xs" style={{ color: D.muted }}>{k.label}</div>
            <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium" style={{ color: k.deltaDir === "up" ? "#10b981" : "#ef4444" }}>
                {k.deltaDir === "up" ? <ArrowUp size={10} className="inline" /> : <ArrowDown size={10} className="inline" />}
                {k.delta}
              </span>
              <span style={{ color: D.muted, fontSize: "10px" }}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Hero + Relations row ─────────────────────────────── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 280px" }}>

        {/* AI Hero Banner */}
        <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0f1f45 0%, #1a1040 50%, #0d1629 100%)", border: "1px solid rgba(67,97,238,0.3)", minHeight: "180px" }}>
          {/* background glow orbs */}
          <div className="absolute top-4 right-24 w-40 h-40 rounded-full opacity-30" style={{ background: "radial-gradient(circle, #4361ee, transparent)", filter: "blur(40px)" }} />
          <div className="absolute bottom-0 right-8 w-32 h-32 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)", filter: "blur(30px)" }} />

          {/* Grid lines overlay */}
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "linear-gradient(rgba(67,97,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(67,97,238,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="relative z-10 flex items-center justify-between h-full">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4361ee, #7c3aed)" }}>
                  <Bot size={13} className="text-white" />
                </div>
                <span style={{ color: "#818cf8", fontSize: "12px", fontWeight: 500 }}>蜂乐玛 AI 智能运营</span>
                <span className="px-1.5 py-0.5 rounded text-white" style={{ background: "linear-gradient(90deg, #4361ee, #7c3aed)", fontSize: "9px" }}>BETA</span>
              </div>
              <h2 className="font-bold mb-2" style={{ color: "#ffffff", fontSize: "26px", lineHeight: 1.2 }}>内容驱动增长</h2>
              <p style={{ color: "#94a3b8", fontSize: "12px", lineHeight: 1.6, maxWidth: "360px" }}>
                AI 助手已分析您的私域生态，发现 4 项优化机会。通过智能分群、精准触达和自动化运营，帮助提升用户留存与转化效率。
              </p>
              <div className="flex gap-2 mt-4">
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-medium" style={{ background: "linear-gradient(90deg, #4361ee, #7c3aed)" }}>
                  <Sparkles size={12} />查看 AI 建议
                </button>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium" style={{ background: "rgba(255,255,255,0.08)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
                  运营报告 <ArrowRight size={11} />
                </button>
              </div>
            </div>

            {/* Floating AI robot illustration (SVG) */}
            <div className="flex-shrink-0 w-44 flex items-center justify-center relative" style={{ height: "160px" }}>
              <div className="absolute inset-0 rounded-2xl" style={{ background: "radial-gradient(circle at center, rgba(67,97,238,0.15), transparent)", filter: "blur(10px)" }} />
              <svg width="120" height="140" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Platform */}
                <ellipse cx="60" cy="128" rx="35" ry="6" fill="rgba(67,97,238,0.2)" />
                {/* Body */}
                <rect x="30" y="60" width="60" height="64" rx="12" fill="url(#ovBodyGrad)" />
                {/* Chest panel */}
                <rect x="38" y="74" width="44" height="28" rx="6" fill="rgba(255,255,255,0.05)" stroke="rgba(67,97,238,0.4)" strokeWidth="1" />
                {/* Chart on chest */}
                <polyline points="42,96 50,88 58,92 66,82 74,86" stroke="#4361ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {/* Head */}
                <rect x="35" y="24" width="50" height="40" rx="12" fill="url(#ovHeadGrad)" />
                {/* Eyes */}
                <rect x="44" y="36" width="10" height="8" rx="4" fill="#4361ee" />
                <rect x="66" y="36" width="10" height="8" rx="4" fill="#4361ee" />
                {/* Eye glow */}
                <rect x="46" y="38" width="4" height="3" rx="2" fill="#818cf8" />
                <rect x="68" y="38" width="4" height="3" rx="2" fill="#818cf8" />
                {/* Antenna */}
                <line x1="60" y1="24" x2="60" y2="10" stroke="#4361ee" strokeWidth="2" strokeLinecap="round" />
                <circle cx="60" cy="8" r="4" fill="#818cf8" />
                <circle cx="60" cy="8" r="2" fill="white" />
                {/* Arms */}
                <rect x="14" y="64" width="16" height="36" rx="8" fill="url(#ovBodyGrad)" />
                <rect x="90" y="64" width="16" height="36" rx="8" fill="url(#ovBodyGrad)" />
                {/* Hands */}
                <circle cx="22" cy="106" r="7" fill="url(#ovHeadGrad)" />
                <circle cx="98" cy="106" r="7" fill="url(#ovHeadGrad)" />
                {/* Legs */}
                <rect x="38" y="120" width="16" height="12" rx="4" fill="url(#ovHeadGrad)" />
                <rect x="66" y="120" width="16" height="12" rx="4" fill="url(#ovHeadGrad)" />
                {/* Floating data particles */}
                <circle cx="18" cy="40" r="3" fill="#4361ee" opacity="0.6" />
                <circle cx="105" cy="50" r="2" fill="#8b5cf6" opacity="0.7" />
                <circle cx="12" cy="90" r="2" fill="#06b6d4" opacity="0.5" />
                <circle cx="108" cy="80" r="3" fill="#4361ee" opacity="0.4" />
                <defs>
                  <linearGradient id="ovBodyGrad" x1="30" y1="60" x2="90" y2="124" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1e2d6b" />
                    <stop offset="1" stopColor="#0f1a40" />
                  </linearGradient>
                  <linearGradient id="ovHeadGrad" x1="35" y1="24" x2="85" y2="64" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#243075" />
                    <stop offset="1" stopColor="#131f4a" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Bottom mini stats */}
          <div className="relative z-10 flex gap-4 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { label: "AI识别风险", value: "4项", color: "#ef4444" },
              { label: "待处理建议", value: "11条", color: "#f59e0b" },
              { label: "自动执行任务", value: "23个", color: "#10b981" },
              { label: "本月节省时长", value: "86h", color: "#818cf8" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span style={{ color: D.textSec, fontSize: "11px" }}>{s.label}</span>
                <span className="font-semibold" style={{ color: s.color, fontSize: "12px" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Relations panel */}
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: D.text }}>关系链接</span>
            <span style={{ color: D.muted, fontSize: "11px" }}>运营团队</span>
          </div>

          {/* Avatar grid */}
          <div className="grid grid-cols-3 gap-2">
            {teamMembers.map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-all" style={{ background: D.surface2 }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs text-white font-bold" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}88)` }}>
                  {m.name[0]}
                </div>
                <div style={{ color: D.text, fontSize: "11px", fontWeight: 500 }}>{m.name}</div>
                <div style={{ color: D.muted, fontSize: "9px" }}>{m.role}</div>
              </div>
            ))}
          </div>

          {/* Risk banner */}
          <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={11} style={{ color: "#ef4444" }} />
              <span style={{ color: "#fca5a5", fontSize: "11px", fontWeight: 600 }}>高风险提醒</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-1.5">
                <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#ef4444" }} />
                <span style={{ color: "#fca5a5", fontSize: "10px" }}>王建国退款申请超时 2h</span>
              </div>
              <div className="flex items-start gap-1.5">
                <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#ef4444" }} />
                <span style={{ color: "#fca5a5", fontSize: "10px" }}>fengle_gz_01 微信30天未登录</span>
              </div>
              <div className="flex items-start gap-1.5">
                <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#f59e0b" }} />
                <span style={{ color: "#fde68a", fontSize: "10px" }}>深圳代理群接近满员 (290/300)</span>
              </div>
            </div>
          </div>

          {/* Account summary */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "账号总数", value: "1,247", color: "#4361ee" },
              { label: "在用微信", value: "68", color: "#06b6d4" },
            ].map((s, i) => (
              <div key={i} className="rounded-xl p-3 text-center" style={{ background: D.surface2 }}>
                <div className="font-bold" style={{ color: s.color, fontSize: "16px" }}>{s.value}</div>
                <div style={{ color: D.muted, fontSize: "10px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts + AI + Todos row ──────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Growth chart */}
        <div className="rounded-xl p-4" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold" style={{ color: D.text }}>用户增长趋势</div>
              <div style={{ color: D.muted, fontSize: "11px" }}>近 7 日新增用户 & 订单</div>
            </div>
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "#4361ee" }} /><span style={{ color: D.muted }}>用户</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "#06b6d4" }} /><span style={{ color: D.muted }}>订单</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart id="ov-line" data={userGrowth} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTip />} />
              <Line type="monotone" dataKey="users" name="用户" stroke="#4361ee" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="orders" name="订单" stroke="#06b6d4" strokeWidth={2} dot={false} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue chart */}
        <div className="rounded-xl p-4" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold" style={{ color: D.text }}>月度收益趋势</div>
              <div style={{ color: D.muted, fontSize: "11px" }}>本年度各月收益汇总</div>
            </div>
            <div className="px-2 py-0.5 rounded-md" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", fontSize: "10px" }}>↑12.8%</div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart id="ov-area" data={revenueData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTip />} />
              <Area type="monotone" dataKey="revenue" name="收益" stroke="#4361ee" strokeWidth={2} fill="url(#ovRevGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* City distribution */}
        <div className="rounded-xl p-4" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <div className="mb-3">
            <div className="text-sm font-semibold" style={{ color: D.text }}>城市会员分布</div>
            <div style={{ color: D.muted, fontSize: "11px" }}>各城市 PRO 会员数量</div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart id="ov-bar" data={cityData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="city" tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTip />} />
              <Bar dataKey="members" name="会员" radius={[4, 4, 0, 0]}>
                {cityData.map((_, i) => (
                  <Cell key={`bar-${i}`} fill={`hsl(${230 + i * 15}, 70%, ${55 + i * 3}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── AI suggestions + Todos row ───────────────────────── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 280px" }}>

        {/* AI Suggestions */}
        <div className="rounded-xl p-4" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4361ee, #7c3aed)" }}>
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: D.text }}>AI 运营建议</span>
            <span className="ml-auto px-2 py-0.5 rounded-full" style={{ background: "rgba(67,97,238,0.2)", color: "#818cf8", fontSize: "10px" }}>今日更新 · 4条</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {aiSuggestions.map((s, i) => {
              const colors = {
                high:   { bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",   text: "#fca5a5", badge: "#ef4444" },
                medium: { bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  text: "#fde68a", badge: "#f59e0b" },
                info:   { bg: "rgba(67,97,238,0.08)",   border: "rgba(67,97,238,0.2)",   text: "#c7d2fe", badge: "#4361ee" },
              };
              const c = colors[s.level as keyof typeof colors];
              return (
                <div key={i} className="flex flex-col gap-2 px-3 py-3 rounded-xl" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "14px" }}>{s.icon}</span>
                    <span className="text-xs font-semibold flex-1" style={{ color: c.text }}>{s.title}</span>
                  </div>
                  <div style={{ color: D.muted, fontSize: "11px" }}>{s.desc}</div>
                  <button className="self-start text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: D.textSec, border: "1px solid rgba(255,255,255,0.08)" }}>立即处理</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Todos */}
        <div className="rounded-xl p-4" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={14} style={{ color: "#10b981" }} />
            <span className="text-sm font-semibold" style={{ color: D.text }}>今日待办</span>
            <span className="ml-auto" style={{ color: D.muted, fontSize: "11px" }}>5 项</span>
          </div>
          <div className="space-y-1">
            {todos.map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2" style={{ borderBottom: `1px solid ${D.border}` }}>
                <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: t.urgent ? "#ef4444" : "#334155" }} />
                <span className="flex-1 text-xs" style={{ color: D.textSec }}>{t.text}</span>
                <div className="flex items-center gap-1 flex-shrink-0" style={{ color: D.muted, fontSize: "10px" }}>
                  <Clock size={9} />{t.time}
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5" style={{ background: D.surface2, color: D.muted, border: `1px solid ${D.border}` }}>
            <Activity size={11} />查看完整日历
          </button>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: "待办", value: "5", icon: Bell, color: "#f59e0b" },
              { label: "进行", value: "3", icon: Activity, color: "#4361ee" },
              { label: "完成", value: "12", icon: CheckCircle, color: "#10b981" },
            ].map((s, i) => (
              <div key={i} className="rounded-lg p-2 text-center" style={{ background: D.surface2 }}>
                <s.icon size={12} style={{ color: s.color, margin: "0 auto 2px" }} />
                <div className="font-bold" style={{ color: s.color, fontSize: "14px" }}>{s.value}</div>
                <div style={{ color: D.muted, fontSize: "9px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom mini metrics ──────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "账号资产总数", value: "1,247", sub: "12 本月新增", icon: Database, color: "#4361ee", bg: "rgba(67,97,238,0.12)" },
          { label: "待分配用户",   value: "23",    sub: "8 今日新增",  icon: UserPlus, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
          { label: "本周新增订单", value: "127",   sub: "↑28% 较上周", icon: TrendingUp, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
          { label: "未处理工单",   value: "38",    sub: "12 高优先级", icon: Shield, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
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