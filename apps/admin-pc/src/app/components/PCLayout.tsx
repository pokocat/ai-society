import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Database, MessageCircle, Users2, GitBranch,
  User, CreditCard, FileText, Shield, MapPin, ChevronRight,
  Bell, Search, Settings, LogOut, Zap, AlertTriangle, Headphones,
  Layers, Radio, BarChart2,
  DollarSign, CalendarDays, ClipboardCheck, ChevronDown, Sparkles,
  Plug, CheckCircle2, RefreshCw, Network, X, UserCog, Palette, ShieldCheck, SlidersHorizontal
} from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { approvalsApi, riskApi } from "../../api";
import type { AuthUser } from "../../api/auth";

const ROLE_LABELS: Record<string, string> = {
  founder: "创始人",
  admin: "系统管理员",
  operator: "运营",
  finance: "财务",
  member: "会员",
  jinfu: "金服",
};

const navGroups = [
  {
    label: "工作台",
    items: [
      { id: "workspace",    label: "跨项目工作台", icon: Network,         badge: null },
      { id: "overview",     label: "经营总览",     icon: LayoutDashboard, badge: null },
      { id: "integrations", label: "项目接入中心", icon: Plug,            badge: null },
      { id: "resourceconfig", label: "项目资源配置", icon: SlidersHorizontal, badge: null },
    ]
  },
  {
    label: "账号与人员",
    items: [
      { id: "accounts",   label: "账号资产中心",  icon: Database,        badge: null },
      { id: "wechat",     label: "微信管理",      icon: MessageCircle,   badge: null },
      { id: "staff",      label: "员工资源绑定",  icon: User,            badge: null },
      { id: "permissions", label: "权限设置",      icon: Shield,          badge: null },
    ]
  },
  {
    label: "社群与客服",
    items: [
      { id: "community",  label: "微信群管理",    icon: Users2,          badge: null },
      { id: "assignment", label: "会员入群分配",  icon: GitBranch,       badge: null },
      { id: "cs",         label: "客服与服务资源", icon: Headphones,      badge: null },
      { id: "channel",    label: "渠道流量绑定",  icon: Radio,           badge: null },
    ]
  },
  {
    label: "会员权益与内容",
    items: [
      { id: "membership", label: "会员权益中心", icon: ShieldCheck,   badge: null },
      { id: "content",    label: "内容运营中心", icon: Radio,         badge: null },
      { id: "agents",     label: "代理商总览",   icon: Network,       badge: null },
    ],
  },
  {
    label: "会员运营",
    items: [
      { id: "users",      label: "会员运营工作台", icon: User, badge: null },
    ]
  },
  {
    label: "交易与服务",
    items: [
      { id: "orders",     label: "支付订单",     icon: CreditCard,     badge: null },
      { id: "commission", label: "分销佣金",     icon: DollarSign,     badge: null },
      { id: "tickets",    label: "工单中心",     icon: FileText,       badge: null },
      { id: "approval",   label: "审批中心",     icon: ClipboardCheck, badge: null },
    ]
  },
  {
    label: "数据与配置",
    items: [
      { id: "cities",      label: "城市分站",    icon: MapPin,          badge: null },
      { id: "reports",    label: "数据报表中心", icon: BarChart2,       badge: null },
      { id: "ecosystem",  label: "生态层级管理", icon: Layers,          badge: null },
    ]
  },
  {
    label: "风险中心",
    items: [
      { id: "risk",       label: "异常与风险",  icon: AlertTriangle,   badge: null },
    ]
  },
];

const navItems = navGroups.flatMap(g => g.items);

const D = {
  sidebar:   "#050805",
  sideHover: "#11190d",
  sideText:  "#f7ffe6",
  sideMuted: "#8c967d",
  bg:        "#ffffff",
  surface:   "#ffffff",
  surface2:  "#f7ffd9",
  border:    "rgba(5,8,5,0.14)",
  primary:   "#b6ff00",
  primary2:  "#e5ff00",
  ink:       "#050805",
  text:      "#050805",
  textSec:   "#2f3a29",
  muted:     "#68705a",
  danger:    "#ff4d4f",
  warning:   "#f2b600",
  success:   "#22c55e",
};

interface PCLayoutProps {
  activeModule: string;
  onModuleChange: (id: string) => void;
  children: ReactNode;
  user?: AuthUser | null;
  onLogout?: () => void;
}

export default function PCLayout({ activeModule, onModuleChange, children, user, onLogout }: PCLayoutProps) {
  const activeItem = navItems.find(i => i.id === activeModule);
  const displayName = user?.displayName ?? "未登录";
  const roleLabel = ROLE_LABELS[user?.roleCode ?? ""] ?? user?.roleCode ?? "—";
  const avatarChar = displayName.trim().charAt(0) || "主";
  const { projects, currentProject, currentProjectId, setCurrentProjectId, syncProject } = useProject();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [topSearch, setTopSearch] = useState("");
  const [openPanel, setOpenPanel] = useState<"notifications" | "settings" | "profile" | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(
    navGroups.map((group, index) => [group.label, index < 4])
  ));

  // 顶栏/侧边栏的实时计数：待审批单数、未解决高风险数（真实接口，加载失败则不显示角标）
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null);
  const [openHighRisks, setOpenHighRisks] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await approvalsApi.listApprovals({ status: "待审批" });
        if (!cancelled) setPendingApprovals(rows.length);
      } catch { /* 未授权或接口异常时不显示角标 */ }
      try {
        const risks = await riskApi.listRiskEvents({ level: "高" });
        if (!cancelled) setOpenHighRisks(risks.filter(r => r.status === "待处理" || r.status === "处理中").length);
      } catch { /* 同上 */ }
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const liveBadges: Record<string, number> = {};
  if (pendingApprovals) liveBadges.approval = pendingApprovals;
  if (openHighRisks) liveBadges.risk = openHighRisks;
  const bellCount = (pendingApprovals ?? 0) + (openHighRisks ?? 0);

  const today = useMemo(() => {
    const now = new Date();
    const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.getDay()];
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${week}`;
  }, []);

  const searchResults = useMemo(() => {
    const keyword = topSearch.trim();
    if (!keyword) return [];
    return navItems.filter(item => item.label.includes(keyword) || item.id.includes(keyword)).slice(0, 5);
  }, [topSearch]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const pushToast = (message: string, kind: "success" | "error" = "success") => setToast({ text: message, kind });

  const runSync = async () => {
    if (syncing || !currentProject.id) return;
    setSyncing(true);
    try {
      await syncProject(currentProject.id); // 真正 await 同步结果
      pushToast(`${currentProject.shortName} 已完成同步`);
    } catch {
      pushToast(`${currentProject.shortName} 同步失败，请重试`, "error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex h-full" style={{ background: D.bg, fontFamily: "'Inter', sans-serif" }}>
      {toast && (
        <div className="fixed top-16 left-1/2 z-[80] -translate-x-1/2 px-4 py-2.5 rounded-md shadow-2xl flex items-center gap-2"
          style={{ color: toast.kind === "error" ? "#ffffff" : D.ink, background: toast.kind === "error" ? D.danger : D.primary, border: `1px solid ${D.border}`, fontSize: "10px" }}>
          {toast.kind === "error" ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}{toast.text}
        </div>
      )}
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <div className="w-[210px] flex-shrink-0 flex flex-col" style={{ background: D.sidebar, borderRight: `1px solid ${D.border}` }}>

        {/* Logo */}
        <div className="h-14 flex items-center px-4 gap-3 flex-shrink-0" style={{ borderBottom: `1px solid ${D.border}` }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: D.primary }}>
            <Zap size={14} style={{ color: D.ink }} />
          </div>
          <div className="min-w-0">
            <div className="font-bold leading-tight" style={{ fontSize: "13px", color: D.sideText }}>主理人</div>
            <div className="truncate" style={{ color: D.sideMuted, fontSize: "10px" }}>私域社群运营中台</div>
          </div>
          <div className="ml-auto">
            <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: D.primary2, color: D.ink, fontSize: "9px" }}>PRO</span>
          </div>
        </div>

        {/* Risk alert —— 有未解决高风险事件时才显示，点击跳转风险中心 */}
        {(openHighRisks ?? 0) > 0 && (
          <div onClick={() => onModuleChange("risk")} className="mx-3 mt-3 px-2.5 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]" style={{ background: "rgba(255,77,79,0.12)", border: "1px solid rgba(255,77,79,0.32)" }}>
            <AlertTriangle size={11} style={{ color: D.danger, flexShrink: 0 }} />
            <span style={{ color: "#ffb4b5", fontSize: "11px" }}>{openHighRisks} 个高风险事项待处理</span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {navGroups.map(group => (
            <div key={group.label}>
              <button
                onClick={() => setOpenGroups(current => ({ ...current, [group.label]: !current[group.label] }))}
                className="w-full flex items-center justify-between"
                style={{ color: D.sideMuted, fontSize: "9px", padding: "10px 16px 4px" }}
              >
                <span>{group.label}</span>
                <ChevronDown size={10} style={{ transform: openGroups[group.label] ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }} />
              </button>
              {openGroups[group.label] && group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onModuleChange(item.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 mx-1.5 text-left transition-all"
                    style={{
                      width: "calc(100% - 12px)",
                      background: isActive ? D.primary : "transparent",
                      borderLeft: isActive ? `2px solid ${D.primary2}` : "2px solid transparent",
                      borderRadius: "6px",
                      color: isActive ? D.ink : D.sideMuted,
                      fontSize: "12px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = D.sideHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <Icon size={14} style={{ flexShrink: 0, color: isActive ? D.ink : D.sideMuted }} />
                    <span className="flex-1">{item.label}</span>
                    {liveBadges[item.id] != null && (
                      <span className="px-1.5 py-0.5 rounded-full" style={{ background: isActive ? D.ink : "rgba(182,255,0,0.16)", color: isActive ? D.primary : D.sideMuted, fontSize: "9px" }}>
                        {liveBadges[item.id]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User profile */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${D.border}` }}>
          <div className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: D.primary, color: D.ink }}>
              {avatarChar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate" style={{ fontSize: "12px", color: D.sideText }}>{displayName}</div>
              <div style={{ color: D.sideMuted, fontSize: "10px" }}>{roleLabel}</div>
            </div>
            <button aria-label="退出登录" title="退出登录" onClick={onLogout} className="opacity-60 group-hover:opacity-100 transition-opacity" style={{ flexShrink: 0 }}>
              <LogOut size={13} style={{ color: D.sideMuted, cursor: "pointer" }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-14 flex items-center px-5 gap-4 flex-shrink-0" style={{ background: D.surface, borderBottom: `1px solid ${D.border}` }}>
          {/* Project context */}
          <div className="relative flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setProjectMenuOpen(open => !open)} className="h-8 px-2.5 rounded-md flex items-center gap-2 text-left"
              style={{ background: D.surface, border: `1px solid ${projectMenuOpen ? D.ink : D.border}` }}>
              <span className="w-2 h-2 rounded-full" style={{ background: D.primary }} />
              <span>
                <span className="block leading-none" style={{ color: D.muted, fontSize: "8px" }}>当前项目</span>
                <span className="block mt-1 font-medium" style={{ color: D.text, fontSize: "10px" }}>{currentProject.shortName}</span>
              </span>
              <ChevronDown size={11} style={{ color: D.muted, transform: projectMenuOpen ? "rotate(180deg)" : "none" }} />
            </button>
            {projectMenuOpen && (
              <div className="absolute left-0 top-10 z-50 w-[280px] p-2 rounded-md shadow-2xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                <div className="px-2 py-1 flex items-center justify-between"><span style={{ color: D.muted, fontSize: "9px" }}>切换项目上下文</span><span style={{ color: D.muted, fontSize: "8px" }}>{projects.length} 个项目</span></div>
                <div className="mt-1 space-y-1">
                  {projects.map(project => (
                    <button key={project.id} onClick={() => { setCurrentProjectId(project.id); setProjectMenuOpen(false); }} className="w-full px-2 py-2 rounded-md flex items-center gap-2 text-left"
                      style={{ background: project.id === currentProjectId ? D.surface2 : D.bg, border: `1px solid ${project.id === currentProjectId ? D.ink : D.border}` }}>
                      <span className="w-7 h-7 rounded-md flex items-center justify-center font-semibold" style={{ color: D.ink, background: project.id === currentProjectId ? D.primary : D.surface2, fontSize: "8px" }}>{project.code.split("-").pop()}</span>
                      <span className="min-w-0 flex-1"><span className="block font-medium truncate" style={{ color: D.text, fontSize: "10px" }}>{project.name}</span><span className="block mt-0.5" style={{ color: D.muted, fontSize: "8px" }}>{project.users.toLocaleString()} 成员 · {project.groups} 个群</span></span>
                      {project.id === currentProjectId ? <CheckCircle2 size={13} style={{ color: D.ink }} /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: project.status === "connected" ? D.success : project.status === "warning" ? D.warning : D.muted }} />}
                    </button>
                  ))}
                </div>
                <button onClick={() => { onModuleChange("integrations"); setProjectMenuOpen(false); }} className="w-full mt-2 px-2 py-2 rounded-md flex items-center justify-center gap-1.5" style={{ color: D.ink, background: D.primary, fontSize: "9px" }}><Plug size={11} />管理项目接入</button>
              </div>
            )}
            <ChevronRight size={10} style={{ color: D.muted }} />
            <span className="px-2 py-0.5 rounded-md font-medium flex items-center gap-1" style={{ background: D.primary, color: D.ink, fontSize: "11px" }}>
              <Sparkles size={10} />
              {activeItem?.label}
            </span>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs ml-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all" style={{ background: D.surface2, border: `1px solid ${topSearch ? D.primary : D.border}` }}>
              <Search size={12} style={{ color: D.muted }} />
              <input
                value={topSearch}
                onChange={event => setTopSearch(event.target.value)}
                className="bg-transparent outline-none flex-1"
                style={{ color: D.text, fontSize: "12px" }}
                placeholder="搜索用户、微信号、群组..."
              />
              {topSearch && (
                <button aria-label="清除搜索" title="清除搜索" onClick={() => setTopSearch("")} className="w-5 h-5 rounded flex items-center justify-center">
                  <X size={11} style={{ color: D.muted }} />
                </button>
              )}
            </div>
            {topSearch && (
              <div className="absolute left-0 top-10 z-50 w-full rounded-md shadow-2xl overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                {searchResults.length > 0 ? searchResults.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => { onModuleChange(item.id); setTopSearch(""); }}
                      className="w-full px-3 py-2.5 flex items-center gap-2 text-left"
                      style={{ color: D.textSec, borderBottom: `1px solid ${D.border}`, fontSize: "10px" }}>
                      <Icon size={13} style={{ color: D.primary }} />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight size={11} style={{ color: D.muted }} />
                    </button>
                  );
                }) : (
                  <div className="px-3 py-3" style={{ color: D.muted, fontSize: "10px" }}>没有匹配模块，可继续在当前页面筛选数据</div>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-4">
            <button onClick={runSync} disabled={syncing} title="同步当前项目" className="flex items-center gap-1.5 px-2 py-1 rounded-md disabled:opacity-60" style={{ color: D.textSec, background: D.surface2, border: `1px solid ${D.border}`, fontSize: "9px" }}>
              <RefreshCw size={11} className={syncing ? "animate-spin" : ""} /> {syncing ? "同步中" : currentProject.lastSync}
            </button>
            <div className="relative">
              <button aria-label="打开通知中心" title="通知中心" onClick={() => setOpenPanel(panel => panel === "notifications" ? null : "notifications")} className="relative w-8 h-8 rounded-md flex items-center justify-center" style={{ background: openPanel === "notifications" ? D.surface2 : "transparent", border: `1px solid ${openPanel === "notifications" ? D.border : "transparent"}` }}>
                <Bell size={15} style={{ color: D.textSec }} />
                {bellCount > 0 && (
                  <div className="absolute top-0.5 right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-red-500 text-white flex items-center justify-center" style={{ fontSize: "9px" }}>{bellCount > 99 ? "99+" : bellCount}</div>
                )}
              </button>
              {openPanel === "notifications" && (
                <div className="absolute right-0 top-10 z-50 w-[300px] rounded-md shadow-2xl overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                  <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${D.border}` }}>
                    <span style={{ color: D.text, fontSize: "11px", fontWeight: 600 }}>通知中心</span>
                  </div>
                  {/* 通知项由实时接口计数生成，点击跳转对应模块 */}
                  {([
                    (openHighRisks ?? 0) > 0 ? ["高风险", `${openHighRisks} 个高风险事项待处理`, D.danger, "risk"] as const : null,
                    (pendingApprovals ?? 0) > 0 ? ["待审批", `${pendingApprovals} 个审批单等待处理`, D.warning, "approval"] as const : null,
                  ].filter(Boolean) as ReadonlyArray<readonly [string, string, string, string]>).map(([tag, text, color, moduleId]) => (
                    <button key={tag} onClick={() => { onModuleChange(moduleId); setOpenPanel(null); }} className="w-full px-3 py-2.5 text-left" style={{ borderBottom: `1px solid ${D.border}` }}>
                      <span className="px-1.5 py-0.5 rounded" style={{ color, background: `${color}18`, fontSize: "8px" }}>{tag}</span>
                      <span className="block mt-1.5" style={{ color: D.textSec, fontSize: "10px" }}>{text}</span>
                    </button>
                  ))}
                  {bellCount === 0 && (
                    <div className="px-3 py-4" style={{ color: D.muted, fontSize: "10px" }}>暂无待办通知</div>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <button aria-label="打开系统设置" title="系统设置" onClick={() => setOpenPanel(panel => panel === "settings" ? null : "settings")} className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: openPanel === "settings" ? D.surface2 : "transparent", border: `1px solid ${openPanel === "settings" ? D.border : "transparent"}` }}>
                <Settings size={15} style={{ color: D.textSec }} />
              </button>
              {openPanel === "settings" && (
                <div className="absolute right-0 top-10 z-50 w-[280px] rounded-md shadow-2xl overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                  <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${D.border}`, color: D.text, fontSize: "11px", fontWeight: 600 }}>系统设置</div>
                  {[
                    ["界面偏好", "主题、密度、表格显示字段", Palette],
                    ["权限与安全", "角色、数据范围、操作审计", ShieldCheck],
                    ["项目同步", "接口状态、字段映射、回写策略", RefreshCw],
                  ].map(([title, desc, Icon]) => {
                    const ItemIcon = Icon as typeof Palette;
                    return (
                      <button key={title as string} disabled title="M2 接线" className="w-full px-3 py-2.5 flex items-center gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed" style={{ borderBottom: `1px solid ${D.border}` }}>
                        <ItemIcon size={14} style={{ color: D.ink }} />
                        <span className="min-w-0 flex-1"><span className="block" style={{ color: D.textSec, fontSize: "10px" }}>{title as string}</span><span className="block mt-0.5" style={{ color: D.muted, fontSize: "8px" }}>{desc as string}</span></span>
                        <ChevronRight size={11} style={{ color: D.muted }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-2.5 py-1 rounded-md" style={{ background: D.surface2, color: D.muted, fontSize: "11px", border: `1px solid ${D.border}` }}>
              {today}
            </div>
            <div className="relative">
              <button aria-label="打开账号菜单" title="账号菜单" onClick={() => setOpenPanel(panel => panel === "profile" ? null : "profile")} className="flex items-center gap-2 rounded-md px-1 py-0.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: D.primary, color: D.ink }}>{avatarChar}</div>
                <ChevronDown size={12} style={{ color: D.muted }} className="transition-transform" />
              </button>
              {openPanel === "profile" && (
                <div className="absolute right-0 top-10 z-50 w-[240px] rounded-md shadow-2xl overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                  <div className="p-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${D.border}` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: D.primary, color: D.ink }}>{avatarChar}</div>
                    <div><div style={{ color: D.text, fontSize: "11px", fontWeight: 600 }}>{displayName}</div><div style={{ color: D.muted, fontSize: "9px" }}>{roleLabel} · 在线</div></div>
                  </div>
                  {([
                    ["账号资料", UserCog, false],
                    ["操作审计", FileText, false],
                    ["退出登录", LogOut, true],
                  ] as [string, typeof UserCog, boolean][]).map(([title, Icon, wired]) => {
                    const ItemIcon = Icon;
                    const isLogout = title === "退出登录";
                    return (
                      <button
                        key={title}
                        disabled={!wired}
                        title={wired ? undefined : "M2 接线"}
                        onClick={isLogout ? () => { setOpenPanel(null); onLogout?.(); } : undefined}
                        className="w-full px-3 py-2.5 flex items-center gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ color: isLogout ? D.danger : D.textSec, borderBottom: `1px solid ${D.border}`, fontSize: "10px" }}
                      >
                        <ItemIcon size={13} />
                        <span>{title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto" style={{ background: D.bg }}>
          {children}
        </div>
      </div>
    </div>
  );
}
