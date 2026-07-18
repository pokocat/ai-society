import { useState } from "react";
import {
  Search, Filter, Download, MoreHorizontal, Crown, Star, Zap,
  Phone, Mail, MessageCircle, ArrowUp, ArrowDown, X,
  CreditCard, FileText, Gift, Calendar, MapPin, Shield
} from "lucide-react";

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

// 无后端来源的统计口径：数值与环比暂以 "—" 占位，禁止编造数字（接线后由真实接口填充）
const kpiCards = [
  { label: "总用户数",    value: "—", delta: null, deltaDir: "up",   sub: "本月新增",  color: "#4361ee" },
  { label: "活跃微信账号", value: "—", delta: null, deltaDir: "up",   sub: "在线数量",  color: "#06b6d4" },
  { label: "活跃社群",    value: "—", delta: null, deltaDir: "down", sub: "接近满员",  color: "#8b5cf6" },
  { label: "消息到达率",  value: "—", delta: null, deltaDir: "up",   sub: "较上周",   color: "#10b981" },
  { label: "本月收益",    value: "—", delta: null, deltaDir:"up",   sub: "较上月",   color: "#f59e0b" },
];

type MemberTier = "黑金" | "PRO" | "VIP" | "体验官" | "游客";

interface Member {
  id: number;
  name: string;
  phone: string;
  email: string;
  wechat: string;
  tier: MemberTier;
  joinDate: string;
  expiry: string;
  spend: string;
  orders: number;
  tickets: number;
  points: number;
  status: "正常" | "待审核" | "已过期";
  city: string;
  score: number;
  grade: string;
  tags: string[];
  initials: string;
  color: string;
}

const MEMBERS: Member[] = [
  { id: 1, name: "Shirley·王欣",  phone: "138****2891", email: "shirley@example.com", wechat: "shirley_wx",  tier: "黑金",  joinDate: "2023-01-15", expiry: "2025-01-14", spend: "¥48,200", orders: 24, tickets: 3, points: 12480, status: "正常",  city: "北京", score: 88, grade: "A+", tags: ["核心用户","高净值","城市合伙人"], initials: "王", color: "#f59e0b" },
  { id: 2, name: "Alex·陈磊",     phone: "139****5632", email: "alex@example.com",    wechat: "alex_chen",  tier: "PRO",   joinDate: "2023-06-20", expiry: "2024-06-19", spend: "¥12,800", orders: 18, tickets: 1, points: 5280,  status: "正常",  city: "上海", score: 76, grade: "A",  tags: ["活跃用户","PRO精英"], initials: "陈", color: "#4361ee" },
  { id: 3, name: "Bella·李婷",    phone: "137****4521", email: "bella@example.com",   wechat: "bella_li",   tier: "VIP",   joinDate: "2023-03-10", expiry: "2024-03-09", spend: "¥28,600", orders: 31, tickets: 5, points: 8920,  status: "正常",  city: "广州", score: 82, grade: "A+", tags: ["重度用户","线下活跃"], initials: "李", color: "#8b5cf6" },
  { id: 4, name: "David·刘凯",    phone: "135****9871", email: "david@example.com",   wechat: "david_liu",  tier: "PRO",   joinDate: "2024-01-05", expiry: "2025-01-04", spend: "¥6,400",  orders: 9,  tickets: 0, points: 2140,  status: "正常",  city: "深圳", score: 65, grade: "B+", tags: ["新晋PRO"], initials: "刘", color: "#06b6d4" },
  { id: 5, name: "Eva·赵欣",      phone: "186****3320", email: "eva@example.com",     wechat: "eva_zhao",   tier: "体验官", joinDate: "2024-03-18", expiry: "—",         spend: "¥980",    orders: 2,  tickets: 1, points: 430,   status: "正常",  city: "成都", score: 48, grade: "C",  tags: ["体验用户"], initials: "赵", color: "#10b981" },
  { id: 6, name: "Frank·周明",    phone: "152****7840", email: "frank@example.com",   wechat: "frank_zhou", tier: "PRO",   joinDate: "2023-09-12", expiry: "2024-09-11", spend: "¥9,200",  orders: 14, tickets: 2, points: 3860,  status: "正常",  city: "杭州", score: 71, grade: "A",  tags: ["稳定复购"], initials: "周", color: "#4361ee" },
  { id: 7, name: "Grace·吴芳",    phone: "177****6612", email: "grace@example.com",   wechat: "grace_wu",   tier: "游客",  joinDate: "2024-06-01", expiry: "—",         spend: "¥0",      orders: 0,  tickets: 0, points: 80,    status: "待审核", city: "北京", score: 22, grade: "D",  tags: ["潜在用户"], initials: "吴", color: "#64748b" },
  { id: 8, name: "Helen·郑雪",    phone: "133****4490", email: "helen@example.com",   wechat: "helen_zheng",tier: "PRO",   joinDate: "2023-11-28", expiry: "2024-11-27", spend: "¥7,600",  orders: 11, tickets: 1, points: 3120,  status: "正常",  city: "上海", score: 69, grade: "B+", tags: ["稳定用户"], initials: "郑", color: "#4361ee" },
  { id: 9, name: "Ivan·孙博",     phone: "188****2230", email: "ivan@example.com",    wechat: "ivan_sun",   tier: "VIP",   joinDate: "2022-12-01", expiry: "2024-11-30", spend: "¥31,400", orders: 28, tickets: 4, points: 10640, status: "正常",  city: "北京", score: 85, grade: "A+", tags: ["长期会员","线下活跃"], initials: "孙", color: "#8b5cf6" },
  { id: 10,name: "Jenny·韩冰",   phone: "159****8876", email: "jenny@example.com",   wechat: "jenny_han",  tier: "PRO",   joinDate: "2024-02-14", expiry: "2025-02-13", spend: "¥5,200",  orders: 8,  tickets: 0, points: 1860,  status: "正常",  city: "深圳", score: 60, grade: "B",  tags: ["新晋PRO"], initials: "韩", color: "#4361ee" },
];

const TIER_STYLE: Record<MemberTier, { color: string; bg: string; icon: any }> = {
  "黑金":  { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",   icon: Crown   },
  "PRO":   { color: "#818cf8", bg: "rgba(67,97,238,0.15)",    icon: Star    },
  "VIP":   { color: "#a78bfa", bg: "rgba(139,92,246,0.15)",   icon: Shield  },
  "体验官": { color: "#34d399", bg: "rgba(16,185,129,0.15)",  icon: Zap     },
  "游客":  { color: "#64748b", bg: "rgba(100,116,139,0.15)",  icon: Star    },
};

const STATUS_STYLE = {
  "正常":  { color: "#34d399", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
  "待审核": { color: "#fbbf24", bg: "rgba(245,158,11,0.12)", dot: "#f59e0b" },
  "已过期": { color: "#f87171", bg: "rgba(239,68,68,0.12)",  dot: "#ef4444" },
};

type FilterTab = "全部" | "PRO会员" | "VIP" | "黑金" | "待审核";

export default function MemberBenefits() {
  const [activeTab, setActiveTab] = useState<FilterTab>("全部");
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member>(MEMBERS[0]);

  const tabs: FilterTab[] = ["全部", "PRO会员", "VIP", "黑金", "待审核"];

  const filtered = MEMBERS.filter(m => {
    const matchTab =
      activeTab === "全部"   ? true :
      activeTab === "PRO会员" ? m.tier === "PRO" :
      activeTab === "VIP"   ? m.tier === "VIP" :
      activeTab === "黑金"   ? m.tier === "黑金" :
      activeTab === "待审核" ? m.status === "待审核" : true;
    const matchSearch = !search || m.name.includes(search) || m.phone.includes(search) || m.wechat.includes(search);
    return matchTab && matchSearch;
  });

  const sm = selectedMember;
  const tierS = TIER_STYLE[sm.tier];

  return (
    <div className="flex flex-col h-full" style={{ background: D.bg }}>

      {/* ── KPI Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 p-4 pb-0">
        {kpiCards.map((k, i) => (
          <div key={i} className="rounded-xl px-4 py-3 relative overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
            <div className="absolute top-0 right-0 w-12 h-12 rounded-full opacity-20 -translate-y-2 translate-x-2" style={{ background: k.color, filter: "blur(16px)" }} />
            <div style={{ color: D.muted, fontSize: "11px" }}>{k.label}</div>
            <div className="font-bold mt-0.5" style={{ color: k.color, fontSize: "18px" }}>{k.value}</div>
            <div className="flex items-center gap-1 mt-0.5">
              {k.delta && (
                <span style={{ color: k.deltaDir === "up" ? "#10b981" : "#ef4444", fontSize: "10px" }}>
                  {k.deltaDir === "up" ? <ArrowUp size={9} className="inline" /> : <ArrowDown size={9} className="inline" />}
                  {k.delta}
                </span>
              )}
              <span style={{ color: D.muted, fontSize: "10px" }}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div>
          <h2 className="font-bold" style={{ color: D.text, fontSize: "16px" }}>会员管理</h2>
          <p style={{ color: D.muted, fontSize: "11px" }}>管理所有会员信息，配置权益和积分规则，查看用户详情</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button disabled title="接线中" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs opacity-50 cursor-not-allowed" style={{ background: D.surface2, color: D.textSec, border: `1px solid ${D.border}` }}>
            <Download size={12} />导出
          </button>
          <button disabled title="接线中" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white opacity-50 cursor-not-allowed" style={{ background: "linear-gradient(90deg, #4361ee, #7c3aed)" }}>
            + 添加会员
          </button>
        </div>
      </div>

      {/* ── Main content (table + detail) ─────────────────────── */}
      <div className="flex flex-1 gap-3 px-4 pb-4 min-h-0">

        {/* Left: table panel */}
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden min-w-0" style={{ background: D.surface, border: `1px solid ${D.border}` }}>

          {/* Filters bar */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${D.border}` }}>
            {/* Tabs */}
            <div className="flex gap-1">
              {tabs.map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: activeTab === t ? "rgba(67,97,238,0.2)" : "transparent", color: activeTab === t ? "#818cf8" : D.muted, border: activeTab === t ? "1px solid rgba(67,97,238,0.3)" : "1px solid transparent" }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Count badge */}
            <div className="flex items-center gap-2 ml-2">
              <span style={{ color: D.muted, fontSize: "11px" }}>共</span>
              <span className="font-bold" style={{ color: D.text, fontSize: "13px" }}>{filtered.length}</span>
              <span style={{ color: D.muted, fontSize: "11px" }}>条记录</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: D.surface2, border: `1px solid ${D.border}`, width: 200 }}>
                <Search size={11} style={{ color: D.muted }} />
                <input className="bg-transparent outline-none flex-1" style={{ color: D.text, fontSize: "11px" }}
                  placeholder="搜索姓名、手机号..." value={search} onChange={e => setSearch(e.target.value)} />
                {search && <X size={11} style={{ color: D.muted, cursor: "pointer" }} onClick={() => setSearch("")} />}
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: D.surface2, color: D.textSec, border: `1px solid ${D.border}` }}>
                <Filter size={11} />筛选
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${D.surface3} transparent` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: D.surface2 }}>
                  {["用户 / 城市", "联系方式", "会员类型", "加入日期", "到期日", "消费金额", "订单", "状态", "操作"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: D.muted, fontWeight: 500, whiteSpace: "nowrap", borderBottom: `1px solid ${D.border}`, fontSize: "11px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const ts = TIER_STYLE[m.tier];
                  const ss = STATUS_STYLE[m.status];
                  const isSelected = selectedMember.id === m.id;
                  return (
                    <tr key={m.id} onClick={() => setSelectedMember(m)} style={{ background: isSelected ? "rgba(67,97,238,0.08)" : "transparent", borderLeft: isSelected ? "2px solid #4361ee" : "2px solid transparent", cursor: "pointer" }}
                      className="transition-all">
                      {/* User */}
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}` }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}88)` }}>{m.initials}</div>
                          <div>
                            <div className="font-medium" style={{ color: D.text, fontSize: "12px" }}>{m.name}</div>
                            <div className="flex items-center gap-1" style={{ color: D.muted, fontSize: "10px" }}>
                              <MapPin size={9} />{m.city}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Contact */}
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}` }}>
                        <div style={{ color: D.textSec, fontSize: "11px" }}>{m.phone}</div>
                        <div style={{ color: D.muted, fontSize: "10px" }}>{m.wechat}</div>
                      </td>
                      {/* Tier */}
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}` }}>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full w-fit" style={{ background: ts.bg, color: ts.color, fontSize: "11px", fontWeight: 600 }}>
                          <ts.icon size={10} />{m.tier}
                        </span>
                      </td>
                      {/* Join */}
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}`, color: D.textSec, fontSize: "11px" }}>{m.joinDate}</td>
                      {/* Expiry */}
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}`, color: D.textSec, fontSize: "11px" }}>{m.expiry}</td>
                      {/* Spend */}
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}` }}>
                        <span className="font-semibold" style={{ color: "#f59e0b", fontSize: "12px" }}>{m.spend}</span>
                      </td>
                      {/* Orders */}
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}`, color: D.textSec, fontSize: "12px" }}>{m.orders}</td>
                      {/* Status */}
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}` }}>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full w-fit" style={{ background: ss.bg, color: ss.color, fontSize: "10px" }}>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ss.dot }} />
                          {m.status}
                        </span>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}` }}>
                        <div className="flex items-center gap-1">
                          <button disabled title="接线中" className="px-2 py-1 rounded text-xs opacity-50 cursor-not-allowed" style={{ background: "rgba(67,97,238,0.15)", color: "#818cf8" }}>详情</button>
                          <button disabled title="接线中" className="p-1 rounded opacity-50 cursor-not-allowed" style={{ background: D.surface2, color: D.muted }}>
                            <MoreHorizontal size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: `1px solid ${D.border}` }}>
            <span style={{ color: D.muted, fontSize: "11px" }}>共 {filtered.length} 条 · 第 1 页</span>
            <div className="flex gap-1">
              {[1, 2, 3].map(p => (
                <button key={p} className="w-7 h-7 rounded text-xs" style={{ background: p === 1 ? "rgba(67,97,238,0.2)" : D.surface2, color: p === 1 ? "#818cf8" : D.muted, border: p === 1 ? "1px solid rgba(67,97,238,0.3)" : `1px solid ${D.border}` }}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: member detail panel */}
        <div className="flex-shrink-0 flex flex-col gap-3 overflow-y-auto" style={{ width: 280, scrollbarWidth: "none" }}>

          {/* Avatar card */}
          <div className="rounded-xl overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
            {/* Cover gradient */}
            <div className="relative h-20" style={{ background: `linear-gradient(135deg, ${sm.color}40, rgba(67,97,238,0.3))` }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              {/* Avatar */}
              <div className="absolute -bottom-6 left-4 w-14 h-14 rounded-full border-4 flex items-center justify-center text-lg text-white font-bold" style={{ background: `linear-gradient(135deg, ${sm.color}, ${sm.color}88)`, borderColor: D.surface }}>
                {sm.initials}
              </div>
              {/* Tier badge top right */}
              <div className="absolute top-3 right-3">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: tierS.bg, color: tierS.color }}>
                  <tierS.icon size={10} />{sm.tier} 会员
                </span>
              </div>
            </div>

            <div className="pt-8 px-4 pb-4">
              <div className="font-bold" style={{ color: D.text, fontSize: "15px" }}>{sm.name}</div>
              <div style={{ color: D.muted, fontSize: "11px" }}>{sm.city} · {sm.email}</div>

              {/* Grade circle */}
              <div className="flex items-center gap-3 mt-3">
                <div className="w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center" style={{ borderColor: sm.color }}>
                  <div className="font-black leading-none" style={{ color: sm.color, fontSize: "14px" }}>{sm.grade}</div>
                </div>
                <div>
                  <div style={{ color: D.muted, fontSize: "10px" }}>综合评分</div>
                  <div className="font-bold" style={{ color: D.text, fontSize: "18px" }}>{sm.score}</div>
                  <div style={{ color: D.muted, fontSize: "10px" }}>满分 100</div>
                </div>
                {/* Score bar */}
                <div className="flex-1">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: D.surface2 }}>
                    <div className="h-full rounded-full" style={{ width: `${sm.score}%`, background: `linear-gradient(90deg, ${sm.color}, ${sm.color}88)` }} />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-3">
                {sm.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full" style={{ background: "rgba(67,97,238,0.15)", color: "#818cf8", fontSize: "10px" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="rounded-xl p-4" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
            <div className="font-semibold mb-3" style={{ color: D.text, fontSize: "13px" }}>联系信息</div>
            {[
              { icon: Phone,          label: "手机号", value: sm.phone },
              { icon: Mail,           label: "邮箱",   value: sm.email },
              { icon: MessageCircle,  label: "微信",   value: sm.wechat },
              { icon: MapPin,         label: "城市",   value: sm.city },
              { icon: Calendar,       label: "加入日期", value: sm.joinDate },
              { icon: Calendar,       label: "到期日",  value: sm.expiry },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2" style={{ borderBottom: i < 5 ? `1px solid ${D.border}` : "none" }}>
                <row.icon size={12} style={{ color: D.muted, flexShrink: 0 }} />
                <span style={{ color: D.muted, fontSize: "11px", width: 56 }}>{row.label}</span>
                <span style={{ color: D.textSec, fontSize: "11px" }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="rounded-xl p-4" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
            <div className="font-semibold mb-3" style={{ color: D.text, fontSize: "13px" }}>数据概览</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: CreditCard, label: "消费总额", value: sm.spend,            color: "#f59e0b" },
                { icon: CreditCard, label: "订单数",   value: `${sm.orders} 单`,   color: "#4361ee" },
                { icon: FileText,   label: "工单数",   value: `${sm.tickets} 条`,  color: "#8b5cf6" },
                { icon: Gift,       label: "积分",     value: sm.points.toLocaleString(), color: "#10b981" },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-3" style={{ background: D.surface2 }}>
                  <s.icon size={12} style={{ color: s.color }} />
                  <div className="font-bold mt-1" style={{ color: s.color, fontSize: "14px" }}>{s.value}</div>
                  <div style={{ color: D.muted, fontSize: "10px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button disabled title="接线中" className="w-full py-2.5 rounded-xl text-xs font-medium text-white opacity-50 cursor-not-allowed" style={{ background: "linear-gradient(90deg, #4361ee, #7c3aed)" }}>
              发送消息
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button disabled title="接线中" className="py-2 rounded-xl text-xs opacity-50 cursor-not-allowed" style={{ background: D.surface2, color: D.textSec, border: `1px solid ${D.border}` }}>升级会员</button>
              <button disabled title="接线中" className="py-2 rounded-xl text-xs opacity-50 cursor-not-allowed" style={{ background: D.surface2, color: D.textSec, border: `1px solid ${D.border}` }}>创建工单</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
