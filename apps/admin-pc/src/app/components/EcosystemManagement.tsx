import { useState } from "react";
import { ChevronRight, Users, Globe, Layers, Zap, TrendingUp, Plus, Settings, ArrowRight, Building2, Package, LayoutDashboard, CheckCircle } from "lucide-react";

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

// ─── 四层架构定义 ─────────────────────────────────────────────
const tiers = [
  {
    id: "super",
    level: 1,
    label: "超级生态",
    sublabel: "Super Ecosystem",
    icon: Zap,
    color: "#f59e0b",
    colorBg: "#fef3c7",
    colorBorder: "#fde68a",
    gradientFrom: "#f59e0b",
    gradientTo: "#ef4444",
    desc: "最顶层的生态体系，统一管理所有下属生态、平台和资源。拥有全局数据视角和最高权限。",
    role: "平台创始人 / 超级管理员",
    count: 1,
    metrics: [
      { label: "下属生态数", value: "3" },
      { label: "SaaS平台数", value: "7" },
      { label: "项目总数",   value: "24" },
      { label: "全局用户数", value: "—" },
    ],
  },
  {
    id: "eco",
    level: 2,
    label: "生态",
    sublabel: "Ecosystem",
    icon: Globe,
    color: "#4361ee",
    colorBg: "rgba(67,97,238,0.12)",
    colorBorder: "#c7d2fe",
    gradientFrom: "#4361ee",
    gradientTo: "#6366f1",
    desc: "垂直领域生态体系，聚焦特定行业或场景。管理旗下多个 SaaS 平台和资源池，形成闭环生态。",
    role: "生态负责人 / 联合创始人",
    count: 3,
    metrics: [
      { label: "下属SaaS平台", value: "7" },
      { label: "活跃项目",    value: "24" },
      { label: "生态会员",    value: "—" },
      { label: "月营收",      value: "—" },
    ],
  },
  {
    id: "saas",
    level: 3,
    label: "SaaS 平台",
    sublabel: "SaaS Platform",
    icon: Package,
    color: "#0ea5e9",
    colorBg: "#e0f2fe",
    colorBorder: "#bae6fd",
    gradientFrom: "#0ea5e9",
    gradientTo: "#06b6d4",
    desc: "向下属项目提供私域社群管理工具的软件平台。包含账号资产、社群管理、用户运营、订单工单等核心能力。",
    role: "平台运营负责人 / 产品经理",
    count: 7,
    metrics: [
      { label: "服务项目数", value: "24" },
      { label: "平台用户",  value: "—" },
      { label: "活跃群组",  value: "—" },
      { label: "本月工单",  value: "—" },
    ],
  },
  {
    id: "platform",
    level: 4,
    label: "平台",
    sublabel: "Platform / Project",
    icon: LayoutDashboard,
    color: "#10b981",
    colorBg: "#d1fae5",
    colorBorder: "#a7f3d0",
    gradientFrom: "#10b981",
    gradientTo: "#059669",
    desc: "使用私域社群工具的具体项目。每个平台拥有独立的用户群体、微信群、服务老师和运营数据，通过 SaaS 层统一管理。",
    role: "项目负责人 / 区域运营 / 客服",
    count: 24,
    metrics: [
      { label: "本项目用户", value: "—" },
      { label: "活跃群组",  value: "—" },
      { label: "服务老师",  value: "—" },
      { label: "本月营收",  value: "—" },
    ],
  },
];

// ─── 生态列表数据 ─────────────────────────────────────────────
const ecosystems = [
  { id: 1, name: "主理人健康生态", desc: "以大健康为核心，整合营养、运动、身心灵多个赛道", platforms: 3, projects: 10, members: 4820, revenue: "¥42万/月", status: "主力生态", color: "#4361ee" },
  { id: 2, name: "主理人教育生态", desc: "在线教育与实体培训融合的知识生态体系",              platforms: 2, projects: 8,  members: 2310, revenue: "¥28万/月", status: "成长中",   color: "#0ea5e9" },
  { id: 3, name: "主理人商业生态", desc: "面向B端的代理、分销与城市合伙人体系",              platforms: 2, projects: 6,  members: 1190, revenue: "¥14万/月", status: "孵化中",   color: "#10b981" },
];

// ─── SaaS 平台列表 ───────────────────────────────────────────
const saasPlatforms = [
  { id: 1, name: "主理人私域工具",    eco: "主理人健康生态", desc: "私域账号资产 + 微信社群 + 用户服务 + 订单工单一体化系统", projects: 4, users: 1623, groups: 34,  status: "生产中", isCurrent: true  },
  { id: 2, name: "主理人课程平台",    eco: "主理人健康生态", desc: "在线课程管理、学员互动与结业认证",                         projects: 3, users: 2100, groups: 18,  status: "生产中", isCurrent: false },
  { id: 3, name: "主理人代理系统",    eco: "主理人健康生态", desc: "代理商招募、培训、分销与佣金结算",                         projects: 3, users: 890,  groups: 12,  status: "生产中", isCurrent: false },
  { id: 4, name: "主理人学习平台",    eco: "主理人教育生态", desc: "自主学习路径、积分激励与学习报告",                         projects: 4, users: 1560, groups: 22,  status: "测试中", isCurrent: false },
  { id: 5, name: "主理人直播工具",    eco: "主理人教育生态", desc: "在线直播、回放管理与观看数据分析",                         projects: 4, users: 750,  groups: 8,   status: "开发中", isCurrent: false },
  { id: 6, name: "主理人城市合伙人",  eco: "主理人商业生态", desc: "城市站长招募、资源分配与业绩追踪",                         projects: 3, users: 430,  groups: 15,  status: "测试中", isCurrent: false },
  { id: 7, name: "主理人分销系统",    eco: "主理人商业生态", desc: "多级分销、佣金计算与实时结算",                             projects: 3, users: 760,  groups: 10,  status: "生产中", isCurrent: false },
];

// ─── 项目/平台列表 ───────────────────────────────────────────
const projects = [
  { id: 1, name: "主理人PRO会员",   saas: "主理人私域工具", eco: "健康生态", users: 1023, groups: 12, teacher: "吴思远/林小燕", cities: ["北京","上海","深圳"], revenue: "¥28万/月", status: "主力项目" },
  { id: 2, name: "主理人体验官",   saas: "主理人私域工具", eco: "健康生态", users: 387,  groups: 8,  teacher: "刘刚/李梦华",    cities: ["广州","成都","杭州"], revenue: "¥12万/月", status: "增长中" },
  { id: 3, name: "主理人代理商",   saas: "主理人私域工具", eco: "健康生态", users: 134,  groups: 6,  teacher: "赵志远",          cities: ["全国"],               revenue: "¥7万/月",  status: "稳定运营" },
  { id: 4, name: "主理人城市分站", saas: "主理人私域工具", eco: "健康生态", users: 79,   groups: 8,  teacher: "陈明/王芳",       cities: ["武汉","南京","西安"],  revenue: "¥4.6万/月",status: "孵化中" },
  { id: 5, name: "主理人7日训练营",saas: "主理人课程平台", eco: "健康生态", users: 450,  groups: 5,  teacher: "课程组",          cities: ["线上"],               revenue: "¥6万/月",  status: "季节性" },
  { id: 6, name: "主理人健康学院", saas: "主理人学习平台", eco: "教育生态", users: 820,  groups: 10, teacher: "教研团队",        cities: ["线上"],               revenue: "¥15万/月", status: "主力项目" },
];

const statusCfg: Record<string, { bg: string; color: string }> = {
  "主力项目": { bg: "rgba(67,97,238,0.12)",  color: "#4361ee" },
  "主力生态": { bg: "rgba(67,97,238,0.12)",  color: "#4361ee" },
  "增长中":   { bg: "rgba(16,185,129,0.15)",  color: "#34d399" },
  "成长中":   { bg: "rgba(16,185,129,0.15)",  color: "#34d399" },
  "稳定运营": { bg: "rgba(67,97,238,0.15)",  color: "#818cf8" },
  "孵化中":   { bg: "rgba(245,158,11,0.15)",  color: "#fbbf24" },
  "季节性":   { bg: "#f3e8ff",  color: "#6d28d9" },
  "生产中":   { bg: "rgba(16,185,129,0.15)",  color: "#34d399" },
  "测试中":   { bg: "rgba(245,158,11,0.15)",  color: "#fbbf24" },
  "开发中":   { bg: "rgba(100,116,139,0.15)",  color: "#94a3b8" },
};

// ─── 架构流程图 ───────────────────────────────────────────────
function ArchitectureDiagram({ activeTier, onSelect }: { activeTier: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden" style={{ border: `1px solid ${L.border}` }}>
      {tiers.map((t, idx) => {
        const Icon = t.icon;
        const isActive = activeTier === t.id;
        return (
          <button
            key={t.id}
            className="flex-1 flex flex-col items-start gap-3 p-5 transition-all relative"
            style={{
              background: isActive ? t.colorBg : L.surface,
              borderRight: idx < 3 ? `1px solid ${L.border}` : "none",
            }}
            onClick={() => onSelect(t.id)}
          >
            {/* 层级指示 */}
            <div className="flex items-center gap-2 w-full">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${t.gradientFrom}, ${t.gradientTo})` }}>
                {t.level}
              </div>
              <span className="text-xs" style={{ color: L.muted }}>{t.sublabel}</span>
              {idx < 3 && <ArrowRight size={14} className="ml-auto" style={{ color: L.mutedLight }} />}
            </div>

            {/* 图标 + 名称 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={18} style={{ color: t.color }} />
                <span className="text-sm font-semibold" style={{ color: L.text }}>{t.label}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: L.muted }}>{t.desc.slice(0, 48)}...</p>
            </div>

            {/* 数量徽标 */}
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `linear-gradient(135deg, ${t.gradientFrom}, ${t.gradientTo})`, color: "white" }}>
                {t.count} 个
              </span>
              <span className="text-xs" style={{ color: L.muted }}>当前</span>
            </div>

            {/* 活跃底部指示条 */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${t.gradientFrom}, ${t.gradientTo})` }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── 超级生态视图 ─────────────────────────────────────────────
function SuperView() {
  // 结构数量取自演示数据集；用户/营收/群组等运营口径无后端来源，显示"—"
  const total = { ecosystems: ecosystems.length, saas: saasPlatforms.length, projects: projects.length, users: null, revenue: null, groups: null };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "下属生态", value: total.ecosystems, color: "#4361ee" },
          { label: "SaaS平台", value: total.saas, color: "#0ea5e9" },
          { label: "运营项目", value: total.projects, color: "#10b981" },
          { label: "全局用户", value: total.users ?? "—", color: "#6366f1" },
          { label: "全局群组", value: total.groups ?? "—", color: "#f59e0b" },
          { label: "总月营收", value: total.revenue ?? "—", color: "#ef4444" },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-3 py-3" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="text-xs" style={{ color: L.muted }}>{s.label}</div>
            <div className="text-xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} style={{ color: "#f59e0b" }} />
          <span className="text-sm font-semibold" style={{ color: L.text }}>超级生态 · 主理人</span>
          <span className="px-2 py-0.5 rounded-full text-xs ml-2" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>最高层级</span>
        </div>
        <p className="text-xs leading-relaxed mb-4" style={{ color: L.textSec }}>
          主理人超级生态是整个体系的最顶层。统一管理旗下所有生态、SaaS 平台和具体项目。拥有全局数据视角、最高级权限、多租户管控和生态资源调配能力。
          每个下属生态都是一个独立的业务闭环，通过 SaaS 平台层共享私域社群管理工具。
        </p>
        <div className="flex gap-2 flex-wrap">
          {["全局数据看板", "跨生态权限管理", "多租户隔离", "统一账号资产", "生态营收汇总"].map(t => (
            <span key={t} className="px-2.5 py-1 rounded-full text-xs" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 生态视图 ─────────────────────────────────────────────────
function EcoView() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: L.text }}>旗下生态 ({ecosystems.length})</span>
        <button disabled title="接线中" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: L.primary }}>
          <Plus size={12} /> 创建生态
        </button>
      </div>
      {ecosystems.map(e => (
        <div
          key={e.id}
          className="rounded-xl p-4 cursor-pointer transition-all"
          style={{
            background: selected === e.id ? L.primaryBg : L.surface,
            border: selected === e.id ? `1px solid ${L.primary}` : `1px solid ${L.border}`,
          }}
          onClick={() => setSelected(selected === e.id ? null : e.id)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{ background: e.color }}>
              {e.name[3]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: L.text }}>{e.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: statusCfg[e.status]?.bg, color: statusCfg[e.status]?.color }}>{e.status}</span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: L.muted }}>{e.desc}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center flex-shrink-0">
              {[["SaaS平台", e.platforms], ["运营项目", e.projects], ["生态会员", e.members.toLocaleString()], ["月营收", e.revenue]].map(([l, v]) => (
                <div key={l as string} className="px-3 py-1.5 rounded-lg" style={{ background: L.primaryBg }}>
                  <div className="text-xs font-semibold" style={{ color: l === "月营收" ? "#10b981" : L.primary }}>{v}</div>
                  <div style={{ color: L.muted, fontSize: "10px" }}>{l}</div>
                </div>
              ))}
            </div>
            <ChevronRight size={16} style={{ color: L.muted, transform: selected === e.id ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
          </div>

          {selected === e.id && (
            <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: `1px solid ${L.border}` }}>
              {/* 未接线：生态详情/子模块跳转无后端能力，禁用假交互 */}
              {["查看详情", "SaaS平台", "项目列表", "权限设置", "数据报表"].map(a => (
                <button key={a} disabled title="接线中" className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: L.primaryBg, color: L.primary }}>{a}</button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── SaaS 平台视图 ────────────────────────────────────────────
function SaasView() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: L.text }}>SaaS 平台 ({saasPlatforms.length})</span>
        <button disabled title="接线中" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "#0ea5e9" }}>
          <Plus size={12} /> 新建平台
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {saasPlatforms.map(p => (
          <div
            key={p.id}
            className="rounded-xl p-4 relative"
            style={{
              background: p.isCurrent ? "#e0f2fe" : L.surface,
              border: p.isCurrent ? "1px solid #bae6fd" : `1px solid ${L.border}`,
            }}
          >
            {p.isCurrent && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(67,97,238,0.15)" }}>
                <CheckCircle size={10} style={{ color: "#818cf8" }} />
                <span style={{ color: "#818cf8", fontSize: "10px" }}>当前系统</span>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Package size={16} style={{ color: p.isCurrent ? "#0ea5e9" : L.muted }} />
              <span className="text-sm font-semibold" style={{ color: L.text }}>{p.name}</span>
            </div>
            <div className="text-xs mb-3" style={{ color: L.muted }}>{p.desc}</div>
            <div className="text-xs mb-3" style={{ color: L.primary }}>所属：{p.eco}</div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[["项目数", p.projects, L.primary], ["用户数", p.users.toLocaleString(), "#10b981"], ["群组数", p.groups, "#f59e0b"]].map(([l, v, c]) => (
                <div key={l as string} className="rounded-lg px-2 py-1.5 text-center" style={{ background: L.primaryBg }}>
                  <div className="text-xs font-semibold" style={{ color: c as string }}>{v}</div>
                  <div style={{ color: L.muted, fontSize: "10px" }}>{l}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: statusCfg[p.status]?.bg, color: statusCfg[p.status]?.color }}>{p.status}</span>
              {/* 未接线：平台跳转无后端能力，禁用假交互 */}
              <button disabled title="接线中" className="flex items-center gap-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed" style={{ color: L.primary }}>
                进入管理 <ChevronRight size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 平台/项目视图 ────────────────────────────────────────────
function ProjectView() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: L.text }}>使用私域社群工具的项目 ({projects.length})</span>
        <div className="flex gap-2">
          {/* 未接线：禁用假交互 */}
          <button disabled title="接线中" className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: L.surface, border: `1px solid ${L.border}`, color: L.muted }}>全部生态</button>
          <button disabled title="接线中" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "#10b981" }}>
            <Plus size={12} /> 接入新项目
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="flex items-center px-4 py-2.5 text-xs" style={{ background: "#1a2640", borderBottom: `1px solid ${L.border}`, color: L.muted }}>
          {([["项目名称",200],["SaaS平台",130],["所属生态",90],["用户数",70],["群组数",70],["服务老师",120],["覆盖城市",160],["月营收",90],["状态",90],["操作",80]] as [string,number][]).map(([l,w]) => (
            <div key={l} className="flex-shrink-0" style={{ width: w }}>{l}</div>
          ))}
        </div>
        {projects.map((p, idx) => (
          <div
            key={p.id}
            className="flex items-center px-4 py-3 cursor-pointer transition-all text-xs"
            style={{
              background: selected === p.id ? "rgba(16,185,129,0.15)" : idx % 2 === 0 ? "#131f35" : "#1a2640",
              borderBottom: `1px solid ${L.borderLight}`,
              borderLeft: selected === p.id ? "2px solid #10b981" : "2px solid transparent",
            }}
            onClick={() => setSelected(selected === p.id ? null : p.id)}
          >
            <div className="flex-shrink-0 flex items-center gap-2" style={{ width: 200 }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "#10b981" }}>
                {p.name[3]}
              </div>
              <span className="font-medium" style={{ color: selected === p.id ? "#34d399" : L.text }}>{p.name}</span>
            </div>
            <div className="flex-shrink-0" style={{ width: 130, color: "#0ea5e9" }}>{p.saas}</div>
            <div className="flex-shrink-0" style={{ width: 90, color: L.muted }}>{p.eco}</div>
            <div className="flex-shrink-0 font-medium" style={{ width: 70, color: L.primary }}>{p.users.toLocaleString()}</div>
            <div className="flex-shrink-0" style={{ width: 70, color: L.muted }}>{p.groups} 个</div>
            <div className="flex-shrink-0" style={{ width: 120, color: L.muted }}>{p.teacher}</div>
            <div className="flex-shrink-0" style={{ width: 160 }}>
              <div className="flex flex-wrap gap-1">
                {p.cities.map(c => (
                  <span key={c} className="px-1.5 py-0.5 rounded" style={{ background: L.primaryBg, color: L.primary, fontSize: "10px" }}>{c}</span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 font-semibold" style={{ width: 90, color: "#10b981" }}>{p.revenue}</div>
            <div className="flex-shrink-0" style={{ width: 90 }}>
              <span className="px-1.5 py-0.5 rounded-full" style={{ background: statusCfg[p.status]?.bg, color: statusCfg[p.status]?.color }}>{p.status}</span>
            </div>
            <div className="flex-shrink-0 flex gap-1" style={{ width: 80 }}>
              {/* 未接线：平台跳转/设置无后端能力，禁用假交互 */}
              <button disabled title="接线中" className="px-2 py-1 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }} onClick={e => e.stopPropagation()}>进入</button>
              <button disabled title="接线中" className="px-1.5 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: L.borderLight, color: L.muted }} onClick={e => e.stopPropagation()}>
                <Settings size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 说明卡 */}
      <div className="rounded-xl p-4 flex items-start gap-4" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
        <LayoutDashboard size={18} style={{ color: "#10b981", marginTop: 1, flexShrink: 0 }} />
        <div>
          <div className="text-sm font-medium mb-1" style={{ color: "#34d399" }}>什么是「平台」？</div>
          <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
            平台（Project）是使用本私域社群管理工具的最小运营单元。每个平台拥有独立的用户群体、微信群组、服务老师配置和运营数据。
            上方系统的「账号资产」「微信管理」「社群管理」「用户操作台」等全部模块，均面向平台级别的日常运营工作。
            平台通过 SaaS 层接入工具能力，数据在生态层汇总，最终归属于超级生态统一管理。
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────
export default function EcosystemManagement() {
  const [activeTier, setActiveTier] = useState("super");
  const tier = tiers.find(t => t.id === activeTier)!;

  return (
    <div className="p-6 h-full flex flex-col gap-5 overflow-auto" style={{ background: L.bg }}>
      {/* 页头 */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div>
          <h2 className="font-semibold" style={{ color: L.text }}>生态架构管理</h2>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>
            四层生态架构：超级生态 → 生态 → SaaS 平台 → 平台（项目），当前系统属于 SaaS 平台层，为各平台项目提供私域社群管理能力
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} />
          <span className="text-xs" style={{ color: L.muted }}>当前：</span>
          <span className="text-xs font-medium" style={{ color: L.text }}>SaaS 平台 · 主理人私域工具</span>
        </div>
      </div>

      {/* 四层架构图 */}
      <ArchitectureDiagram activeTier={activeTier} onSelect={setActiveTier} />

      {/* 当前层级说明条 */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-xl flex-shrink-0" style={{ background: tier.colorBg, border: `1px solid ${tier.colorBorder}` }}>
        <tier.icon size={16} style={{ color: tier.color, flexShrink: 0 }} />
        <div className="flex-1">
          <span className="text-sm font-semibold" style={{ color: tier.color }}>第 {tier.level} 层：{tier.label}</span>
          <span className="text-xs ml-3" style={{ color: L.muted }}>{tier.desc}</span>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {tier.metrics.map(m => (
            <div key={m.label} className="text-center">
              <div className="text-sm font-bold" style={{ color: tier.color }}>{m.value}</div>
              <div style={{ color: L.muted, fontSize: "10px" }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#131f35", color: tier.color, border: `1px solid ${tier.colorBorder}` }}>
          {tier.role}
        </div>
      </div>

      {/* 层级内容 */}
      <div className="flex-1">
        {activeTier === "super"    && <SuperView />}
        {activeTier === "eco"      && <EcoView />}
        {activeTier === "saas"     && <SaasView />}
        {activeTier === "platform" && <ProjectView />}
      </div>
    </div>
  );
}
