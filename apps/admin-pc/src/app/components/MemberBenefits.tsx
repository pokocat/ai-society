import { useEffect, useMemo, useState } from "react";
import {
  Search, Filter, Download, MoreHorizontal, Crown, Star, Zap,
  Phone, MessageCircle, X, Loader2, AlertTriangle,
  CreditCard, Gift, Calendar, MapPin, Shield, TrendingUp,
} from "lucide-react";
import { ApiError, membersApi, membershipApi } from "../../api";
import type { MemberRow, MemberProfile } from "../../api/members";
import type { MembershipPlan, MembershipOrder } from "../../api/membership";
import { useProject } from "../contexts/ProjectContext";

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

// 身份样式（枚举对齐后端 project_identities）
const TIER_STYLE: Record<string, { color: string; bg: string; icon: any }> = {
  "黑金":      { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  icon: Crown  },
  "尊享官":    { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  icon: Crown  },
  "PRO会员":   { color: "#818cf8", bg: "rgba(67,97,238,0.15)",   icon: Star   },
  "VIP":       { color: "#a78bfa", bg: "rgba(139,92,246,0.15)",  icon: Shield },
  "体验官":    { color: "#34d399", bg: "rgba(16,185,129,0.15)",  icon: Zap    },
  "代理":      { color: "#38bdf8", bg: "rgba(56,189,248,0.15)",  icon: Shield },
  "城市合伙人": { color: "#f472b6", bg: "rgba(236,72,153,0.15)",  icon: Crown  },
  "运营商":    { color: "#c084fc", bg: "rgba(168,85,247,0.15)",  icon: Shield },
  "学员":      { color: "#38bdf8", bg: "rgba(56,189,248,0.15)",  icon: Star   },
  "游客":      { color: "#64748b", bg: "rgba(100,116,139,0.15)", icon: Star   },
};
const tierStyle = (identity: string) => TIER_STYLE[identity] ?? TIER_STYLE["游客"];

const IDENTITY_STATUS_STYLE: Record<string, { color: string; bg: string; dot: string }> = {
  "有效":   { color: "#34d399", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
  "待分配": { color: "#fbbf24", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  "已过期": { color: "#f87171", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
};

const HIGH_VALUE = ["尊享官", "黑金", "城市合伙人", "VIP", "运营商"];
const PAID_STATUS = ["已支付", "已发放"];

const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("zh-CN") : "—");
const fmtYuan = (cents: number) => `¥${(cents / 100).toLocaleString("zh-CN")}`;

export default function MemberBenefits() {
  const { currentProject } = useProject();
  const projectId = currentProject.id;

  const [activeTab, setActiveTab] = useState("全部");
  const [search, setSearch] = useState("");

  const [list, setList] = useState<MemberRow[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [orders, setOrders] = useState<MembershipOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedNo, setSelectedNo] = useState("");
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [memberOrders, setMemberOrders] = useState<MembershipOrder[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const identityOf = (r: MemberRow): string =>
    r.project_identities.find(pi => pi.projectId === projectId)?.identity
    ?? r.project_identities[0]?.identity ?? "游客";
  const identityStatusOf = (r: MemberRow): string =>
    r.project_identities.find(pi => pi.projectId === projectId)?.status
    ?? r.project_identities[0]?.status ?? "—";

  // 列表 + 套餐 + 会员费订单：并行拉取（均为真实接口）
  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    setLoading(true); setError("");
    Promise.all([
      membersApi.listMembers({ projectId }),
      membershipApi.listPlans(),
      membershipApi.listOrders(),
    ])
      .then(([rows, planRows, orderRows]) => {
        if (!alive) return;
        setList(rows);
        setPlans(planRows);
        setOrders(orderRows);
        setSelectedNo(prev => (prev && rows.some(r => r.member_no === prev) ? prev : rows[0]?.member_no ?? ""));
      })
      .catch(e => { if (alive) setError(e instanceof ApiError ? e.message : "加载会员权益数据失败"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId]);

  // 选中会员：档案 + 会员费订单
  useEffect(() => {
    if (!selectedNo) { setProfile(null); setMemberOrders([]); return; }
    let alive = true;
    setDetailLoading(true); setDetailError("");
    Promise.all([
      membersApi.getMemberProfile(selectedNo),
      membershipApi.listOrders({ memberNo: selectedNo }),
    ])
      .then(([pf, mo]) => { if (alive) { setProfile(pf); setMemberOrders(mo); } })
      .catch(e => { if (alive) setDetailError(e instanceof ApiError ? e.message : "加载会员档案失败"); })
      .finally(() => { if (alive) setDetailLoading(false); });
    return () => { alive = false; };
  }, [selectedNo]);

  // 身份页签：全部 + 数据里实际出现的身份
  const tabs = useMemo(() => {
    const found = new Set<string>();
    list.forEach(r => found.add(identityOf(r)));
    return ["全部", ...Array.from(found).sort()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, projectId]);

  const filtered = list.filter(m => {
    const matchTab = activeTab === "全部" || identityOf(m) === activeTab;
    const matchSearch = !search || m.name.includes(search) || (m.phone ?? "").includes(search) || m.member_no.includes(search);
    return matchTab && matchSearch;
  });

  // KPI 全部由真实接口实时统计
  const paidOrders = orders.filter(o => PAID_STATUS.includes(o.status));
  const paidCents = paidOrders.reduce((s, o) => s + (Number(o.amount_cents) || 0), 0);
  const kpiCards = [
    { label: "总会员数",     value: loading ? "—" : String(list.length),                                              sub: currentProject.shortName, color: "#4361ee" },
    { label: "付费身份会员", value: loading ? "—" : String(list.filter(r => identityOf(r) !== "游客").length),         sub: "身份≠游客",             color: "#8b5cf6" },
    { label: "在售套餐",     value: loading ? "—" : String(plans.filter(p => p.status === "上架").length),             sub: `共 ${plans.length} 个`,  color: "#06b6d4" },
    { label: "会员费订单",   value: loading ? "—" : String(orders.length),                                            sub: `已支付 ${paidOrders.length}`, color: "#10b981" },
    { label: "已收会费",     value: loading ? "—" : fmtYuan(paidCents),                                               sub: "一方交易累计",           color: "#f59e0b" },
  ];

  // 选中会员视图模型（缺省字段如实占位 "—"，不臆造数值）
  const p = profile as any;
  const curIdentity = p?.projectIdentities?.find((x: any) => x.project_id === projectId);
  const smIdentity = curIdentity?.identity ?? p?.projectIdentities?.[0]?.identity ?? "游客";
  const orderList = (p?.orders ?? []) as any[];
  const spend = orderList.filter(o => o.status === "已完成").reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const identifiers = (p?.identifiers ?? []) as any[];
  const wechatId = identifiers.find(i => i.id_type === "个微号")?.id_value ?? "—";
  const growth = Number(p?.growth ?? 0);
  const points = Number(p?.points ?? 0);
  const grade = growth >= 5000 ? "S" : growth >= 2000 ? "A" : growth >= 500 ? "B" : "C";
  const smTags: string[] = [];
  if (HIGH_VALUE.includes(smIdentity)) smTags.push("高价值");
  if (orderList.some(o => String(o.status).includes("退款"))) smTags.push("退款风险");
  if (((p?.groups ?? []) as any[]).length === 0) smTags.push("未入群");
  if (p?.referral) smTags.push("有推荐人");

  const smRow = list.find(r => r.member_no === selectedNo);
  const tierS = tierStyle(smIdentity);

  return (
    <div className="flex flex-col h-full" style={{ background: D.bg }}>

      {/* ── KPI Strip（真实接口实时统计） ─────────────────────── */}
      <div className="grid grid-cols-5 gap-3 p-4 pb-0">
        {kpiCards.map((k, i) => (
          <div key={i} className="rounded-xl px-4 py-3 relative overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
            <div className="absolute top-0 right-0 w-12 h-12 rounded-full opacity-20 -translate-y-2 translate-x-2" style={{ background: k.color, filter: "blur(16px)" }} />
            <div style={{ color: D.muted, fontSize: "11px" }}>{k.label}</div>
            <div className="font-bold mt-0.5" style={{ color: k.color, fontSize: "18px" }}>{k.value}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span style={{ color: D.muted, fontSize: "10px" }}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div>
          <h2 className="font-bold" style={{ color: D.text, fontSize: "16px" }}>会员权益</h2>
          <p style={{ color: D.muted, fontSize: "11px" }}>按项目查看会员身份与到期情况，追踪会员费订单（一方交易）</p>
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
            <div className="flex gap-1 flex-wrap">
              {tabs.map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: activeTab === t ? "rgba(67,97,238,0.2)" : "transparent", color: activeTab === t ? "#818cf8" : D.muted, border: activeTab === t ? "1px solid rgba(67,97,238,0.3)" : "1px solid transparent" }}>
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-2">
              <span style={{ color: D.muted, fontSize: "11px" }}>共</span>
              <span className="font-bold" style={{ color: D.text, fontSize: "13px" }}>{filtered.length}</span>
              <span style={{ color: D.muted, fontSize: "11px" }}>条记录</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: D.surface2, border: `1px solid ${D.border}`, width: 200 }}>
                <Search size={11} style={{ color: D.muted }} />
                <input className="bg-transparent outline-none flex-1" style={{ color: D.text, fontSize: "11px" }}
                  placeholder="搜索姓名、手机号..." value={search} onChange={e => setSearch(e.target.value)} />
                {search && <X size={11} style={{ color: D.muted, cursor: "pointer" }} onClick={() => setSearch("")} />}
              </div>
              <button disabled title="接线中" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs opacity-50 cursor-not-allowed" style={{ background: D.surface2, color: D.textSec, border: `1px solid ${D.border}` }}>
                <Filter size={11} />筛选
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${D.surface3} transparent` }}>
            {loading && (
              <div className="flex items-center justify-center py-16" style={{ color: D.muted, fontSize: "12px" }}><Loader2 size={14} className="animate-spin mr-2" />加载中…</div>
            )}
            {!loading && error && (
              <div className="flex items-center justify-center py-16" style={{ color: "#f87171", fontSize: "12px" }}><AlertTriangle size={14} className="mr-2" />{error}</div>
            )}
            {!loading && !error && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: D.surface2 }}>
                  {["用户 / 城市", "联系方式", "会员身份", "身份状态", "加入日期", "推荐人", "会费订单", "操作"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: D.muted, fontWeight: 500, whiteSpace: "nowrap", borderBottom: `1px solid ${D.border}`, fontSize: "11px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const identity = identityOf(m);
                  const ts = tierStyle(identity);
                  const status = identityStatusOf(m);
                  const ss = IDENTITY_STATUS_STYLE[status] ?? { color: D.textSec, bg: D.surface2, dot: D.muted };
                  const isSelected = selectedNo === m.member_no;
                  const feeOrders = orders.filter(o => o.member_no === m.member_no);
                  return (
                    <tr key={m.member_no} onClick={() => setSelectedNo(m.member_no)} style={{ background: isSelected ? "rgba(67,97,238,0.08)" : "transparent", borderLeft: isSelected ? "2px solid #4361ee" : "2px solid transparent", cursor: "pointer" }}
                      className="transition-all">
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}` }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg, ${ts.color}, ${ts.color}88)` }}>{(m.name || m.member_no)[0]}</div>
                          <div>
                            <div className="font-medium" style={{ color: D.text, fontSize: "12px" }}>{m.name}</div>
                            <div className="flex items-center gap-1" style={{ color: D.muted, fontSize: "10px" }}>
                              <MapPin size={9} />{m.city ?? "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}` }}>
                        <div style={{ color: D.textSec, fontSize: "11px" }}>{m.phone ?? "—"}</div>
                        <div style={{ color: D.muted, fontSize: "10px" }}>{m.member_no}</div>
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}` }}>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full w-fit" style={{ background: ts.bg, color: ts.color, fontSize: "11px", fontWeight: 600 }}>
                          <ts.icon size={10} />{identity}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}` }}>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full w-fit" style={{ background: ss.bg, color: ss.color, fontSize: "10px" }}>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ss.dot }} />
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}`, color: D.textSec, fontSize: "11px" }}>{fmtDate(m.created_at)}</td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}`, color: D.textSec, fontSize: "11px" }}>{m.referrer_name ?? "—"}</td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}`, color: feeOrders.length > 0 ? "#f59e0b" : D.muted, fontSize: "12px" }}>{feeOrders.length > 0 ? `${feeOrders.length} 单` : "—"}</td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${D.border}` }}>
                        <div className="flex items-center gap-1">
                          <button onClick={e => { e.stopPropagation(); setSelectedNo(m.member_no); }} className="px-2 py-1 rounded text-xs" style={{ background: "rgba(67,97,238,0.15)", color: "#818cf8" }}>详情</button>
                          <button disabled title="接线中" className="p-1 rounded opacity-50 cursor-not-allowed" style={{ background: D.surface2, color: D.muted }}>
                            <MoreHorizontal size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: "40px 12px", textAlign: "center", color: D.muted, fontSize: "12px" }}>无匹配会员</td>
                  </tr>
                )}
              </tbody>
            </table>
            )}
          </div>

          {/* Table footer */}
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: `1px solid ${D.border}` }}>
            <span style={{ color: D.muted, fontSize: "11px" }}>共 {filtered.length} 条</span>
          </div>
        </div>

        {/* Right: member detail panel */}
        <div className="flex-shrink-0 flex flex-col gap-3 overflow-y-auto" style={{ width: 280, scrollbarWidth: "none" }}>

          {detailLoading && (
            <div className="rounded-xl p-8 flex items-center justify-center" style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.muted, fontSize: "12px" }}>
              <Loader2 size={14} className="animate-spin mr-2" />加载档案…
            </div>
          )}
          {!detailLoading && detailError && (
            <div className="rounded-xl p-8 text-center" style={{ background: D.surface, border: `1px solid ${D.border}`, color: "#f87171", fontSize: "12px" }}>{detailError}</div>
          )}
          {!detailLoading && !detailError && !smRow && !loading && (
            <div className="rounded-xl p-8 text-center" style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.muted, fontSize: "12px" }}>选择左侧会员查看权益详情</div>
          )}
          {!detailLoading && !detailError && smRow && (
            <>
              {/* Avatar card */}
              <div className="rounded-xl overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                <div className="relative h-20" style={{ background: `linear-gradient(135deg, ${tierS.color}40, rgba(67,97,238,0.3))` }}>
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                  <div className="absolute -bottom-6 left-4 w-14 h-14 rounded-full border-4 flex items-center justify-center text-lg text-white font-bold" style={{ background: `linear-gradient(135deg, ${tierS.color}, ${tierS.color}88)`, borderColor: D.surface }}>
                    {(smRow.name || smRow.member_no)[0]}
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: tierS.bg, color: tierS.color }}>
                      <tierS.icon size={10} />{smIdentity}
                    </span>
                  </div>
                </div>

                <div className="pt-8 px-4 pb-4">
                  <div className="font-bold" style={{ color: D.text, fontSize: "15px" }}>{smRow.name}</div>
                  <div style={{ color: D.muted, fontSize: "11px" }}>{smRow.city ?? "—"} · {smRow.member_no}</div>

                  {/* 成长等级（由成长值分档，均为后端真实字段） */}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center" style={{ borderColor: tierS.color }}>
                      <div className="font-black leading-none" style={{ color: tierS.color, fontSize: "14px" }}>{grade}</div>
                    </div>
                    <div>
                      <div style={{ color: D.muted, fontSize: "10px" }}>成长值</div>
                      <div className="font-bold" style={{ color: D.text, fontSize: "18px" }}>{growth}</div>
                    </div>
                    <TrendingUp size={16} className="ml-auto" style={{ color: tierS.color, opacity: 0.6 }} />
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {smTags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full" style={{ background: "rgba(67,97,238,0.15)", color: "#818cf8", fontSize: "10px" }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="rounded-xl p-4" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                <div className="font-semibold mb-3" style={{ color: D.text, fontSize: "13px" }}>联系信息</div>
                {[
                  { icon: Phone,          label: "手机号",  value: smRow.phone ?? "—" },
                  { icon: MessageCircle,  label: "微信",    value: wechatId },
                  { icon: MapPin,         label: "城市",    value: smRow.city ?? "—" },
                  { icon: Calendar,       label: "加入日期", value: fmtDate(smRow.created_at) },
                  { icon: Calendar,       label: "到期日",  value: curIdentity?.valid_until ? fmtDate(curIdentity.valid_until) : "长期有效" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2" style={{ borderBottom: i < 4 ? `1px solid ${D.border}` : "none" }}>
                    <row.icon size={12} style={{ color: D.muted, flexShrink: 0 }} />
                    <span style={{ color: D.muted, fontSize: "11px", width: 56 }}>{row.label}</span>
                    <span style={{ color: D.textSec, fontSize: "11px" }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Stats（取自会员档案真实字段） */}
              <div className="rounded-xl p-4" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                <div className="font-semibold mb-3" style={{ color: D.text, fontSize: "13px" }}>数据概览</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: CreditCard, label: "消费总额", value: `¥${spend.toLocaleString()}`,  color: "#f59e0b" },
                    { icon: CreditCard, label: "订单数",   value: `${orderList.length} 单`,      color: "#4361ee" },
                    { icon: TrendingUp, label: "成长值",   value: String(growth),                color: "#8b5cf6" },
                    { icon: Gift,       label: "积分",     value: points.toLocaleString(),       color: "#10b981" },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: D.surface2 }}>
                      <s.icon size={12} style={{ color: s.color }} />
                      <div className="font-bold mt-1" style={{ color: s.color, fontSize: "14px" }}>{s.value}</div>
                      <div style={{ color: D.muted, fontSize: "10px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 会员费订单（一方交易，中台事实源） */}
              <div className="rounded-xl p-4" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                <div className="font-semibold mb-3" style={{ color: D.text, fontSize: "13px" }}>会员费订单</div>
                {memberOrders.length === 0 ? (
                  <div className="text-center py-4" style={{ color: D.muted, fontSize: "11px" }}>暂无会员费订单</div>
                ) : memberOrders.map(o => (
                  <div key={o.order_no} className="flex items-center gap-2 py-2" style={{ borderBottom: `1px solid ${D.border}` }}>
                    <div className="flex-1 min-w-0">
                      <div className="truncate" style={{ color: D.textSec, fontSize: "11px" }}>{o.plan_name}</div>
                      <div style={{ color: D.muted, fontSize: "10px" }}>{fmtDate(o.created_at)} · {o.channel}</div>
                    </div>
                    <span className="font-semibold" style={{ color: "#f59e0b", fontSize: "11px" }}>{fmtYuan(o.amount_cents)}</span>
                    <span className="px-1.5 py-0.5 rounded-full" style={{ background: PAID_STATUS.includes(o.status) ? "rgba(16,185,129,0.12)" : D.surface2, color: PAID_STATUS.includes(o.status) ? "#34d399" : D.textSec, fontSize: "10px" }}>{o.status}</span>
                  </div>
                ))}
              </div>

              {/* Action buttons（写操作待接线） */}
              <div className="flex flex-col gap-2">
                <button disabled title="接线中" className="w-full py-2.5 rounded-xl text-xs font-medium text-white opacity-50 cursor-not-allowed" style={{ background: "linear-gradient(90deg, #4361ee, #7c3aed)" }}>
                  发送消息
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button disabled title="接线中" className="py-2 rounded-xl text-xs opacity-50 cursor-not-allowed" style={{ background: D.surface2, color: D.textSec, border: `1px solid ${D.border}` }}>升级会员</button>
                  <button disabled title="接线中" className="py-2 rounded-xl text-xs opacity-50 cursor-not-allowed" style={{ background: D.surface2, color: D.textSec, border: `1px solid ${D.border}` }}>创建工单</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
