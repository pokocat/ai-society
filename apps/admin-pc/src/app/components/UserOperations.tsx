import { useState, useEffect } from "react";
import {
  Search, Phone, MessageCircle, ShoppingCart, Users, FileText,
  Star, Clock, AlertTriangle, Plus, MapPin,
  Filter, Download, X, User, ChevronRight, Gift, CreditCard,
  Tags, CalendarDays, Send, TrendingUp, Loader2,
} from "lucide-react";
import UserSegment from "./UserSegment";
import MemberBenefits from "./MemberBenefits";
import Activities from "./Activities";
import PushTasks from "./PushTasks";
import InfluenceRanking from "./InfluenceRanking";
import { useProject } from "../contexts/ProjectContext";
import { membersApi, ApiError } from "../../api";
import type { MemberRow, MemberProfile, TimelineEvent } from "../../api/members";

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

// ── 身份颜色（深色主题，高亮色；枚举与后端 project_identities 对齐） ─────────
const IDENTITY: Record<string, { color: string; bg: string }> = {
  "PRO会员":   { color: "#818cf8", bg: "rgba(67,97,238,0.15)"   },
  "体验官":    { color: "#34d399", bg: "rgba(16,185,129,0.15)"  },
  "游客":      { color: "#94a3b8", bg: "rgba(100,116,139,0.15)" },
  "代理":      { color: "#38bdf8", bg: "rgba(56,189,248,0.15)"  },
  "黑金":      { color: "#fbbf24", bg: "rgba(245,158,11,0.15)"  },
  "尊享官":    { color: "#fbbf24", bg: "rgba(245,158,11,0.15)"  },
  "城市合伙人": { color: "#f472b6", bg: "rgba(236,72,153,0.15)"  },
  "学员":      { color: "#38bdf8", bg: "rgba(56,189,248,0.15)"  },
  "VIP":       { color: "#fbbf24", bg: "rgba(245,158,11,0.15)"  },
  "运营商":    { color: "#c084fc", bg: "rgba(168,85,247,0.15)"  },
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

// ── 身份筛选页签（与后端身份枚举对齐） ─────────────────────────────
const TABS: string[] = ["全部", "PRO会员", "体验官", "尊享官", "代理", "城市合伙人", "学员", "黑金", "VIP", "游客"];
const DETAIL_TABS = ["基本信息", "订单记录", "群组信息", "工单记录", "操作日志"];

/** 时间线事件类型 → 颜色键（对齐 TIMELINE_COLOR） */
function timelineType(eventType: string): string {
  if (eventType.includes("订单") || eventType.includes("购买")) return "order";
  if (eventType.includes("入群") || eventType.includes("邀请")) return "group";
  if (eventType.includes("退款")) return "refund";
  if (eventType.includes("回访")) return "visit";
  if (eventType.includes("身份") || eventType.includes("注册") || eventType.includes("升级")) return "register";
  return "ticket";
}
const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("zh-CN") : "—");

function UsersWorkbench() {
  const { currentProject } = useProject();
  const [search, setSearch]       = useState("");
  const [tab, setTab]             = useState<string>("全部");
  const [selectedNo, setSelectedNo] = useState<string>("");
  const [detailTab, setDetailTab] = useState(0);

  const [list, setList] = useState<MemberRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const projectId = currentProject.id;
  const identityOf = (r: MemberRow): string =>
    r.project_identities.find(pi => pi.projectId === projectId)?.identity
    ?? r.project_identities[0]?.identity ?? "游客";

  // 会员列表：按当前项目拉取；页签/搜索在前端过滤（数据量小、体验更顺）
  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    setListLoading(true); setListError("");
    membersApi.listMembers({ projectId })
      .then(rows => {
        if (!alive) return;
        setList(rows);
        setSelectedNo(prev => (prev && rows.some(r => r.member_no === prev) ? prev : rows[0]?.member_no ?? ""));
      })
      .catch(e => { if (alive) setListError(e instanceof ApiError ? e.message : "加载会员列表失败"); })
      .finally(() => { if (alive) setListLoading(false); });
    return () => { alive = false; };
  }, [projectId]);

  // 选中会员：拉档案 + 操作时间线
  useEffect(() => {
    if (!selectedNo) { setProfile(null); setTimeline([]); return; }
    let alive = true;
    setProfileLoading(true); setProfileError("");
    Promise.all([membersApi.getMemberProfile(selectedNo), membersApi.getMemberTimeline(selectedNo)])
      .then(([pf, tl]) => { if (alive) { setProfile(pf); setTimeline(tl); } })
      .catch(e => { if (alive) setProfileError(e instanceof ApiError ? e.message : "加载会员档案失败"); })
      .finally(() => { if (alive) setProfileLoading(false); });
    return () => { alive = false; };
  }, [selectedNo]);

  const filtered = list.filter(r => {
    const matchTab = tab === "全部" ? true : identityOf(r) === tab;
    const matchSearch = !search || r.name.includes(search) || (r.phone ?? "").includes(search) || r.member_no.includes(search) || (r.city ?? "").includes(search);
    return matchTab && matchSearch;
  });

  // KPI 由列表实时统计
  const idCount = (id: string) => list.filter(r => identityOf(r) === id).length;
  const kpiData = [
    { label: "总会员数", value: list.length,       color: "#4361ee" },
    { label: "PRO会员",  value: idCount("PRO会员"), color: "#818cf8" },
    { label: "体验官",   value: idCount("体验官"),  color: "#34d399" },
    { label: "尊享官",   value: idCount("尊享官"),  color: "#fbbf24" },
    { label: "代理",     value: idCount("代理"),    color: "#38bdf8" },
  ];

  // 档案 → 详情视图模型（缺省字段如实占位 "—"，不臆造数值）
  const p = profile as any;
  const curIdentity = p?.projectIdentities?.find((x: any) => x.project_id === projectId);
  const identity = curIdentity?.identity ?? p?.projectIdentities?.[0]?.identity ?? "游客";
  const orderList = (p?.orders ?? []) as any[];
  const spend = orderList.filter(o => o.status === "已完成").reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const groupsArr = (p?.groups ?? []) as any[];
  const followUps = (p?.followUps ?? []) as any[];
  const identifiers = (p?.identifiers ?? []) as any[];
  const referral = p?.referral;
  const growth = Number(p?.growth ?? 0);
  const points = Number(p?.points ?? 0);
  const wechatId = identifiers.find(i => i.id_type === "个微号")?.id_value ?? "—";
  const hasRefund = orderList.some(o => String(o.status).includes("退款"));
  const highValue = ["尊享官", "黑金", "城市合伙人", "VIP", "运营商"].includes(identity);
  const tags: string[] = [];
  if (highValue) tags.push("高价值");
  if (hasRefund) tags.push("退款风险");
  if (groupsArr.length === 0) tags.push("未入群");
  if (referral) tags.push("有推荐人");

  const user = {
    name: p?.name ?? "—",
    phone: p?.phone ?? "—",
    wechat: wechatId,
    identity,
    city: p?.city ?? "—",
    source: p?.source_channel ?? "—",
    referrer: referral?.lv1_name ?? "—",
    group: groupsArr[0]?.group_name ?? "—",
    teacher: groupsArr[0]?.personal_wechat_id ?? "—",
    memberSince: fmtDate(p?.created_at),
    expiry: curIdentity?.valid_until ? fmtDate(curIdentity.valid_until) : "长期有效",
    spend,
    orders: orderList.length,
    growth,
    points,
    tags,
    orderList: orderList.map(o => ({
      no: o.external_order_no ?? String(o.id),
      product: o.product_name ?? "—",
      amount: Number(o.amount) || 0,
      status: o.status ?? "—",
      date: fmtDate(o.external_time),
    })),
    followUps,
  };
  const idStyle = IDENTITY[user.identity] ?? IDENTITY["游客"];
  const grade = growth >= 5000 ? "S" : growth >= 2000 ? "A" : growth >= 500 ? "B" : "C";

  return (
    <div className="flex flex-col h-full" style={{ background: L.bg }}>

      {/* ── KPI strip（按当前项目会员列表实时统计） ─────────────── */}
      <div className="grid grid-cols-5 gap-3 p-4 pb-0">
        {kpiData.map((k, i) => (
          <div key={i} className="rounded-xl px-4 py-3 relative overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="absolute top-0 right-0 w-12 h-12 rounded-full opacity-20 -translate-y-2 translate-x-2" style={{ background: k.color, filter: "blur(16px)" }} />
            <div style={{ color: L.muted, fontSize: "11px" }}>{k.label}</div>
            <div className="font-bold mt-0.5" style={{ color: k.color, fontSize: "20px" }}>{listLoading ? "—" : k.value}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span style={{ color: L.muted, fontSize: "10px" }}>{currentProject.shortName}</span>
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
          <button disabled title="M2 接线" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs opacity-50 cursor-not-allowed" style={{ background: L.surface2, color: L.textSec, border: `1px solid ${L.border}` }}>
            <Download size={12} />导出
          </button>
          <button disabled title="M2 接线" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white opacity-50 cursor-not-allowed" style={{ background: "linear-gradient(90deg, #4361ee, #7c3aed)" }}>
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
            <span style={{ color: L.muted, fontSize: "10px" }}>共 {filtered.length} 名会员</span>
            <Filter size={11} style={{ color: L.muted }} />
          </div>

          {/* List */}
          <div className="flex-1 overflow-auto px-2 pb-2 space-y-1" style={{ scrollbarWidth: "none" }}>
            {listLoading && (
              <div className="flex items-center justify-center py-8" style={{ color: L.muted, fontSize: "12px" }}><Loader2 size={13} className="animate-spin mr-1.5" />加载中…</div>
            )}
            {!listLoading && listError && (
              <div className="text-center py-8 px-2" style={{ color: "#f87171", fontSize: "12px" }}>{listError}</div>
            )}
            {!listLoading && !listError && filtered.map(u => {
              const isel = selectedNo === u.member_no;
              const uident = identityOf(u);
              const id2 = IDENTITY[uident] ?? IDENTITY["游客"];
              const isHigh = ["尊享官", "黑金", "城市合伙人", "VIP", "运营商"].includes(uident);
              return (
                <div key={u.member_no} onClick={() => { setSelectedNo(u.member_no); setDetailTab(0); }}
                  className="rounded-xl p-3 cursor-pointer transition-all"
                  style={{ background: isel ? L.primaryBg : "transparent", border: isel ? "1px solid rgba(67,97,238,0.35)" : `1px solid ${L.borderLight}`, borderLeft: isel ? "2px solid #4361ee" : "2px solid transparent" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${id2.color}, ${id2.color}88)` }}>
                      {(u.name || u.member_no)[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold" style={{ color: isel ? "#818cf8" : L.text }}>{u.name}</div>
                      <div className="text-xs truncate" style={{ color: L.muted }}>{u.phone ?? "—"} · {u.city ?? "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded-full" style={{ background: id2.bg, color: id2.color, fontSize: "10px" }}>{uident}</span>
                    {u.project_identities.length > 1 && <span className="px-1.5 py-0.5 rounded-full" style={{ background: L.surface2, color: L.textSec, fontSize: "10px" }}>多项目身份 {u.project_identities.length}</span>}
                    {isHigh && <span className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", fontSize: "10px" }}>高价值</span>}
                  </div>
                </div>
              );
            })}
            {!listLoading && !listError && filtered.length === 0 && (
              <div className="text-center py-8" style={{ color: L.muted, fontSize: "12px" }}>无匹配会员</div>
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
              {/* 成长等级徽标（由成长值分档，均为后端真实字段） */}
              <div className="absolute top-3 right-4 flex items-center gap-2">
                <div className="w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center" style={{ borderColor: idStyle.color, background: L.surface }}>
                  <div className="font-black leading-none" style={{ color: idStyle.color, fontSize: "13px" }}>{grade}</div>
                </div>
                <div style={{ color: L.muted, fontSize: "10px" }}>成长值<br /><span style={{ color: idStyle.color, fontWeight: 700 }}>{user.growth}</span></div>
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
                {/* Action buttons（写操作待 M2 接线） */}
                <div className="flex gap-2 flex-shrink-0">
                  <button disabled title="M2 接线" className="px-3 py-1.5 rounded-lg text-xs opacity-50 cursor-not-allowed" style={{ background: L.primaryBg, color: "#818cf8", border: `1px solid rgba(67,97,238,0.3)` }}>发提醒</button>
                  <button disabled title="M2 接线" className="px-3 py-1.5 rounded-lg text-xs opacity-50 cursor-not-allowed" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>分配群</button>
                  <button disabled title="M2 接线" className="px-3 py-1.5 rounded-lg text-xs text-white flex items-center gap-1 opacity-50 cursor-not-allowed" style={{ background: "linear-gradient(90deg, #4361ee, #7c3aed)" }}>
                    <Plus size={11} />建工单
                  </button>
                </div>
              </div>

              {/* Quick stats（均取自会员档案真实字段） */}
              <div className="grid grid-cols-5 gap-2 mt-4">
                {[
                  { label: "总消费",   value: user.spend > 0 ? `¥${user.spend.toLocaleString()}` : "¥0",      icon: CreditCard,    color: "#fbbf24" },
                  { label: "订单数",   value: `${user.orders} 单`,   icon: ShoppingCart, color: "#4361ee"  },
                  { label: "成长值",   value: `${user.growth}`, icon: TrendingUp, color: "#a78bfa"  },
                  { label: "所在群",   value: user.group === "—" ? "未入群" : "已入群", icon: Users, color: user.group === "—" ? "#f87171" : "#34d399" },
                  { label: "积分",     value: `${user.points}`,          icon: Gift,         color: "#38bdf8"  },
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

            {profileLoading && (
              <div className="flex items-center justify-center py-16" style={{ color: L.muted, fontSize: "12px" }}><Loader2 size={14} className="animate-spin mr-2" />加载会员档案…</div>
            )}
            {!profileLoading && profileError && (
              <div className="flex items-center justify-center py-16" style={{ color: "#f87171", fontSize: "12px" }}><AlertTriangle size={14} className="mr-2" />{profileError}</div>
            )}

            {/* 基本信息 */}
            {!profileLoading && !profileError && detailTab === 0 && (
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
                  {[["来源渠道", user.source], ["推荐人", user.referrer], ["所在群", user.group], ["承接个微", user.teacher], ["回访记录", `${user.followUps.length} 次`]].map(([k, v]) => (
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
            {!profileLoading && !profileError && detailTab === 1 && (
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
            {!profileLoading && !profileError && detailTab === 2 && (
              <div>
                {groupsArr.length === 0 ? (
                  <div className="text-center py-10">
                    <Users size={28} className="mx-auto mb-3" style={{ color: L.muted }} />
                    <div className="text-sm mb-3" style={{ color: L.muted }}>会员尚未分配群组</div>
                    <button disabled title="M2 接线" className="px-5 py-2 rounded-xl text-xs text-white opacity-50 cursor-not-allowed" style={{ background: "linear-gradient(90deg, #4361ee, #7c3aed)" }}>立即分配群组</button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {groupsArr.map((g: any, i: number) => (
                      <div key={i} className="p-4 rounded-xl" style={{ background: L.surface2, border: `1px solid ${L.border}` }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                            <Users size={16} style={{ color: "#34d399" }} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium" style={{ color: L.text, fontSize: "13px" }}>{g.group_name ?? g.group_id}</div>
                            <div style={{ color: L.muted, fontSize: "11px" }}>承接个微：{g.personal_wechat_id ?? "—"}{g.joined_at ? ` · 入群 ${fmtDate(g.joined_at)}` : ""}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>{g.status ?? "已入群"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 工单记录（中台无工单域，此处呈现档案回访记录 followUps） */}
            {!profileLoading && !profileError && detailTab === 3 && (
              <div className="space-y-2.5">
                <div className="text-xs mb-1" style={{ color: L.muted }}>中台无独立工单域，展示会员回访记录</div>
                {user.followUps.length === 0 ? (
                  <div className="text-center py-10" style={{ color: L.muted, fontSize: "12px" }}>暂无回访记录</div>
                ) : user.followUps.map((t: any, i: number) => {
                  const title = t.content ?? t.summary ?? t.category ?? t.note ?? "回访记录";
                  const when = fmtDate(t.remind_at ?? t.created_at ?? t.follow_at);
                  const who = t.assignee ?? t.created_by ?? t.operator ?? "—";
                  return (
                    <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl" style={{ background: L.surface2, border: `1px solid ${L.border}` }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
                        <FileText size={15} style={{ color: "#fbbf24" }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium" style={{ color: L.text, fontSize: "13px" }}>{title}</div>
                        <div style={{ color: L.muted, fontSize: "11px" }}>{who} · {when}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 操作日志（会员时间线，GET /members/{no}/timeline） */}
            {!profileLoading && !profileError && detailTab === 4 && (
              timeline.length === 0 ? (
                <div className="text-center py-10" style={{ color: L.muted, fontSize: "12px" }}>暂无操作日志</div>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-2 top-2 bottom-2 w-px" style={{ background: L.border }} />
                  {timeline.map((e: any, i) => (
                    <div key={e.id ?? i} className="relative flex items-start gap-3 mb-4">
                      <div className="absolute -left-4 w-3 h-3 rounded-full border-2 flex-shrink-0 mt-0.5" style={{ background: TIMELINE_COLOR[timelineType(String(e.event_type ?? ""))] ?? "#4361ee", borderColor: L.surface }} />
                      <div>
                        <div className="text-xs font-medium" style={{ color: L.textSec }}>{e.title ?? e.event_type}</div>
                        {e.detail && <div className="text-xs mt-0.5" style={{ color: L.muted }}>{e.detail}</div>}
                        <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: L.muted }}>
                          <Clock size={9} />{fmtDate(e.occurred_at)}{e.operator ? ` · ${e.operator}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
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
