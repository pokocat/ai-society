import { useState } from "react";
import {
  Plus, ChevronLeft, Search, Download, Bell, Calendar, MapPin,
  Users, Target, Copy, Settings, Eye, X, Check, ChevronRight,
  Megaphone, BookOpen, Coffee, Flame
} from "lucide-react";
import { useProject } from "../contexts/ProjectContext";

const L = {
  bg: "#0d1629", surface: "#131f35", border: "rgba(255,255,255,0.07)", borderLight: "rgba(255,255,255,0.04)",
  primary: "#4361ee", primaryBg: "rgba(67,97,238,0.15)", text: "#e2e8f0", textSec: "#94a3b8",
  muted: "#64748b", mutedLight: "#475569", surface2: "#1a2640",
};

const STATUS = {
  "进行中": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  "即将开始": { bg: "rgba(67,97,238,0.15)", color: "#818cf8" },
  "已结束": { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" },
};

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  "限时活动": { bg: "#eef2ff", color: "#4361ee" },
  "常规课程": { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  "线下沙龙": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  "打卡挑战": { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  "限时活动": <Megaphone size={20} />,
  "常规课程": <BookOpen size={20} />,
  "线下沙龙": <Coffee size={20} />,
  "打卡挑战": <Flame size={20} />,
};

const BANNER_COLORS: Record<string, string> = {
  "限时活动": "#eef2ff",
  "常规课程": "rgba(245,158,11,0.15)",
  "线下沙龙": "rgba(16,185,129,0.15)",
  "打卡挑战": "rgba(239,68,68,0.15)",
};

interface Activity {
  id: number;
  name: string;
  type: "限时活动" | "常规课程" | "线下沙龙" | "打卡挑战";
  status: "进行中" | "即将开始" | "已结束";
  dateRange: string;
  location: string;
  registered: number;
  capacity: number | null;
  targetUser: string;
  extra?: string;
}

const mockActivities: Activity[] = [
  {
    id: 1, name: "7月PRO会员特训营", type: "限时活动", status: "进行中",
    dateRange: "2026-07-01 ~ 2026-07-31", location: "线上",
    registered: 78, capacity: 100, targetUser: "PRO会员",
  },
  {
    id: 2, name: "北京城市分享会", type: "线下沙龙", status: "进行中",
    dateRange: "2026-07-10", location: "北京",
    registered: 45, capacity: 60, targetUser: "VIP+PRO",
  },
  {
    id: 3, name: "新手体验官7日打卡", type: "打卡挑战", status: "进行中",
    dateRange: "常规打卡", location: "线上",
    registered: 234, capacity: null, targetUser: "体验官",
    extra: "已参与234人",
  },
  {
    id: 4, name: "8月代理商培训大会", type: "常规课程", status: "即将开始",
    dateRange: "2026-08-01", location: "线上",
    registered: 12, capacity: 50, targetUser: "代理商",
  },
  {
    id: 5, name: "成都线下沙龙", type: "线下沙龙", status: "即将开始",
    dateRange: "2026-08-15", location: "成都",
    registered: 8, capacity: 30, targetUser: "VIP",
  },
  {
    id: 6, name: "6月打卡挑战", type: "打卡挑战", status: "已结束",
    dateRange: "2026-06-01 ~ 2026-06-30", location: "线上",
    registered: 189, capacity: null, targetUser: "体验官",
    extra: "完成率82% · 参与189人",
  },
  {
    id: 7, name: "5月线上特训营", type: "限时活动", status: "已结束",
    dateRange: "2026-05-01 ~ 2026-05-31", location: "线上",
    registered: 156, capacity: null, targetUser: "全部",
    extra: "转化率34% · 参与156人",
  },
];

interface Registrant {
  id: number;
  avatar: string;
  name: string;
  level: string;
  time: string;
  city: string;
  status: "已报名" | "已取消" | "已签到";
}

const mockRegistrants: Registrant[] = [
  { id: 1, avatar: "李", name: "李云天", level: "PRO", time: "2026-07-01 09:12", city: "北京", status: "已签到" },
  { id: 2, avatar: "张", name: "张晓红", level: "体验官", time: "2026-07-01 10:30", city: "上海", status: "已报名" },
  { id: 3, avatar: "王", name: "王建国", level: "VIP", time: "2026-07-02 14:23", city: "广州", status: "已报名" },
  { id: 4, avatar: "陈", name: "陈美玲", level: "PRO", time: "2026-07-02 16:45", city: "成都", status: "已取消" },
  { id: 5, avatar: "赵", name: "赵志远", level: "PRO", time: "2026-07-03 11:00", city: "深圳", status: "已签到" },
  { id: 6, avatar: "孙", name: "孙伟明", level: "VIP", time: "2026-07-03 08:20", city: "上海", status: "已报名" },
  { id: 7, avatar: "刘", name: "刘晓峰", level: "体验官", time: "2026-07-04 15:30", city: "北京", status: "已报名" },
  { id: 8, avatar: "吴", name: "吴思远", level: "PRO", time: "2026-07-04 19:00", city: "广州", status: "已签到" },
];

const REGISTRANT_STATUS = {
  "已报名": { bg: "rgba(67,97,238,0.15)", color: "#818cf8" },
  "已取消": { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  "已签到": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
};

const TABS = ["全部活动", "进行中", "即将开始", "已结束"];

// Multi-step modal
interface ModalState {
  step: number;
  name: string;
  type: string;
  dateStart: string;
  dateEnd: string;
  location: string;
  targetUser: string;
  capacity: string;
  intro: string;
  questionnaire: boolean;
  paid: boolean;
  channels: string[];
  scheduledTime: string;
}

const DEFAULT_MODAL: ModalState = {
  step: 1, name: "", type: "限时活动", dateStart: "", dateEnd: "",
  location: "", targetUser: "全部", capacity: "", intro: "",
  questionnaire: false, paid: false, channels: [], scheduledTime: "",
};

export default function Activities() {
  const { currentProject } = useProject();
  const [tab, setTab] = useState("全部活动");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modal, setModal] = useState<ModalState>(DEFAULT_MODAL);
  const [viewActivity, setViewActivity] = useState<Activity | null>(null);
  const [selectedRegistrants, setSelectedRegistrants] = useState<number[]>([]);

  const filtered = mockActivities.filter(a => {
    const matchTab = tab === "全部活动" || a.status === tab;
    const matchSearch = a.name.includes(search) || a.location.includes(search) || a.targetUser.includes(search);
    return matchTab && matchSearch;
  });

  const statCards = [
    { label: "进行中活动数", value: "3", sub: "本月新增1个", color: L.primary },
    { label: "本月参与人次", value: "557", sub: "较上月+23%", color: "#10b981" },
    { label: "平均转化率", value: "28.4%", sub: "较上月+5.2%", color: "#f59e0b" },
    { label: "活动带来新会员", value: "89", sub: "本月累计", color: "#8b5cf6" },
  ];

  function openModal() {
    setModal(DEFAULT_MODAL);
    setShowModal(true);
  }

  function toggleChannel(ch: string) {
    setModal(m => ({
      ...m,
      channels: m.channels.includes(ch) ? m.channels.filter(c => c !== ch) : [...m.channels, ch],
    }));
  }

  function toggleRegistrant(id: number) {
    setSelectedRegistrants(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  // Registrant list view
  if (viewActivity) {
    return (
      <div className="p-6 h-full flex flex-col gap-4" style={{ background: L.bg }}>
        {/* Back */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setViewActivity(null); setSelectedRegistrants([]); }}
            className="flex items-center gap-1 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: L.primary }}
          >
            <ChevronLeft size={16} /> 返回活动列表
          </button>
        </div>

        {/* Activity info strip */}
        <div className="rounded-xl px-5 py-4 flex items-center gap-4" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ background: BANNER_COLORS[viewActivity.type], color: TYPE_BADGE[viewActivity.type].color }}>
            {TYPE_ICON[viewActivity.type]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm" style={{ color: L.text }}>{viewActivity.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: STATUS[viewActivity.status].bg, color: STATUS[viewActivity.status].color }}>
                {viewActivity.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs flex items-center gap-1" style={{ color: L.muted }}>
                <Calendar size={11} /> {viewActivity.dateRange}
              </span>
              <span className="text-xs flex items-center gap-1" style={{ color: L.muted }}>
                <MapPin size={11} /> {viewActivity.location}
              </span>
              <span className="text-xs flex items-center gap-1" style={{ color: L.muted }}>
                <Target size={11} /> {viewActivity.targetUser}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold" style={{ color: L.primary }}>{viewActivity.registered}</div>
            <div className="text-xs" style={{ color: L.muted }}>已报名{viewActivity.capacity ? `/${viewActivity.capacity}` : ""}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
              <Search size={14} style={{ color: L.muted }} />
              <input placeholder="搜索报名者…" className="outline-none text-sm w-32" style={{ color: L.text, background: "transparent" }} />
            </div>
            {selectedRegistrants.length > 0 && (
              <span className="text-xs px-2 py-1 rounded" style={{ background: L.primaryBg, color: L.primary }}>
                已选 {selectedRegistrants.length} 人
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border hover:opacity-80 transition-opacity"
              style={{ color: L.textSec, borderColor: L.border, background: L.surface }}>
              <Download size={13} /> 批量导出
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border hover:opacity-80 transition-opacity"
              style={{ color: L.textSec, borderColor: L.border, background: L.surface }}>
              <Bell size={13} /> 批量发通知
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden flex-1" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${L.border}`, background: L.bg }}>
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" className="rounded"
                    onChange={e => setSelectedRegistrants(e.target.checked ? mockRegistrants.map(r => r.id) : [])}
                    checked={selectedRegistrants.length === mockRegistrants.length} />
                </th>
                {["编号", "姓名", "会员等级", "报名时间", "城市", "状态", "操作"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-xs" style={{ color: L.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockRegistrants.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < mockRegistrants.length - 1 ? `1px solid ${L.borderLight}` : "none" }}
                  className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded" checked={selectedRegistrants.includes(r.id)}
                      onChange={() => toggleRegistrant(r.id)} />
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: L.muted }}>#{String(r.id).padStart(3, "0")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: L.primary }}>{r.avatar}</div>
                      <span className="text-sm font-medium" style={{ color: L.text }}>{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: L.primaryBg, color: L.primary }}>{r.level}</span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: L.muted }}>{r.time}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: L.textSec }}>{r.city}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: REGISTRANT_STATUS[r.status].bg, color: REGISTRANT_STATUS[r.status].color }}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs hover:opacity-70" style={{ color: L.primary }}>查看详情</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col gap-4" style={{ background: L.bg }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2"><h2 className="font-semibold text-base" style={{ color: L.text }}>活动与通知</h2><span className="px-2 py-0.5 rounded-md" style={{ color: currentProject.accent, background: `${currentProject.accent}15`, fontSize: 9 }}>{currentProject.shortName}</span></div>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>管理活动、课程、通知草稿与跨项目推送渠道</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ background: L.primary }}>
          <Plus size={15} /> 新建活动
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(c => (
          <div key={c.label} className="rounded-xl p-4" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            <div className="text-xs mb-2" style={{ color: L.muted }}>{c.label}</div>
            <div className="text-2xl font-bold mb-1" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs" style={{ color: L.mutedLight }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
              style={tab === t
                ? { background: L.primary, color: "#fff" }
                : { color: L.muted, background: "transparent" }}>
              {t}
              {t !== "全部活动" && (
                <span className="ml-1.5 text-xs px-1.5 rounded-full"
                  style={tab === t ? { background: "rgba(255,255,255,0.25)", color: "#fff" } : { background: L.borderLight, color: L.muted }}>
                  {mockActivities.filter(a => a.status === t).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <Search size={14} style={{ color: L.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索活动名称、地点、对象…" className="outline-none text-sm w-44"
            style={{ color: L.text, background: "transparent" }} />
        </div>
      </div>

      {/* Activity grid */}
      <div className="grid grid-cols-2 gap-4 overflow-y-auto flex-1 pb-2">
        {filtered.map(a => {
          const pct = a.capacity ? Math.round((a.registered / a.capacity) * 100) : null;
          return (
            <div key={a.id} className="rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
              {/* Banner */}
              <div className="h-16 flex items-center px-5 gap-3" style={{ background: BANNER_COLORS[a.type] }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.7)", color: TYPE_BADGE[a.type].color }}>
                  {TYPE_ICON[a.type]}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: L.text }}>{a.name}</div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block"
                    style={{ background: "rgba(255,255,255,0.7)", color: TYPE_BADGE[a.type].color }}>
                    {a.type}
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: STATUS[a.status].bg, color: STATUS[a.status].color }}>
                  {a.status}
                </span>
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="flex flex-wrap gap-3 mb-3">
                  <span className="flex items-center gap-1 text-xs" style={{ color: L.muted }}>
                    <Calendar size={12} /> {a.dateRange}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: L.muted }}>
                    <MapPin size={12} /> {a.location}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: L.muted }}>
                    <Target size={12} /> {a.targetUser}
                  </span>
                </div>

                {/* Progress or extra */}
                {a.capacity ? (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1" style={{ color: L.muted }}>
                      <span>已报名 {a.registered}/{a.capacity}</span>
                      <span style={{ color: pct! >= 80 ? "#991b1b" : L.primary }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: L.borderLight }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct! >= 80 ? "#ef4444" : L.primary }} />
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5">
                      <Users size={12} style={{ color: L.muted }} />
                      <span className="text-xs" style={{ color: L.muted }}>{a.extra || `参与${a.registered}人`}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewActivity(a)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ background: L.primaryBg, color: L.primary }}>
                    <Eye size={12} /> 查看报名
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity border"
                    style={{ color: L.textSec, borderColor: L.border, background: L.surface }}>
                    <Settings size={12} /> 管理
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity border"
                    style={{ color: L.textSec, borderColor: L.border, background: L.surface }}>
                    <Copy size={12} /> 复制
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-2 py-16 text-center" style={{ color: L.muted }}>
            暂无匹配活动
          </div>
        )}
      </div>

      {/* New Activity Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
          <div className="w-[560px] rounded-2xl shadow-2xl overflow-hidden" style={{ background: L.surface }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: L.border }}>
              <div>
                <h3 className="font-semibold" style={{ color: L.text }}>新建活动</h3>
                <p className="text-xs mt-0.5" style={{ color: L.muted }}>步骤 {modal.step} / 3</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: L.muted }}>
                <X size={18} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="px-6 pt-4 flex items-center gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                    style={s <= modal.step ? { background: L.primary, color: "#fff" } : { background: L.borderLight, color: L.muted }}>
                    {s < modal.step ? <Check size={13} /> : s}
                  </div>
                  <span className="text-xs font-medium" style={{ color: s === modal.step ? L.text : L.mutedLight }}>
                    {["基本信息", "详情配置", "推送设置"][s - 1]}
                  </span>
                  {s < 3 && <ChevronRight size={14} style={{ color: L.mutedLight }} />}
                </div>
              ))}
            </div>

            {/* Step content */}
            <div className="px-6 py-5 flex flex-col gap-4">
              {modal.step === 1 && (
                <>
                  <FieldRow label="活动名称">
                    <input value={modal.name} onChange={e => setModal(m => ({ ...m, name: e.target.value }))}
                      placeholder="请输入活动名称" className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ border: `1px solid ${L.border}`, color: L.text }} />
                  </FieldRow>
                  <FieldRow label="活动类型">
                    <div className="flex gap-2 flex-wrap">
                      {["限时活动", "常规课程", "线下沙龙", "打卡挑战"].map(t => (
                        <button key={t} onClick={() => setModal(m => ({ ...m, type: t }))}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                          style={modal.type === t
                            ? { background: L.primary, color: "#fff", borderColor: L.primary }
                            : { background: L.surface, color: L.textSec, borderColor: L.border }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </FieldRow>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldRow label="开始日期">
                      <input type="date" value={modal.dateStart}
                        onChange={e => setModal(m => ({ ...m, dateStart: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ border: `1px solid ${L.border}`, color: L.text }} />
                    </FieldRow>
                    <FieldRow label="结束日期">
                      <input type="date" value={modal.dateEnd}
                        onChange={e => setModal(m => ({ ...m, dateEnd: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ border: `1px solid ${L.border}`, color: L.text }} />
                    </FieldRow>
                  </div>
                  <FieldRow label="地点">
                    <input value={modal.location} onChange={e => setModal(m => ({ ...m, location: e.target.value }))}
                      placeholder="线上 / 城市名称" className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ border: `1px solid ${L.border}`, color: L.text }} />
                  </FieldRow>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldRow label="目标用户">
                      <select value={modal.targetUser} onChange={e => setModal(m => ({ ...m, targetUser: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ border: `1px solid ${L.border}`, color: L.text }}>
                        {["全部", "PRO会员", "VIP", "体验官", "代理商", "VIP+PRO"].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </FieldRow>
                    <FieldRow label="容量上限">
                      <input type="number" value={modal.capacity} onChange={e => setModal(m => ({ ...m, capacity: e.target.value }))}
                        placeholder="留空表示不限" className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ border: `1px solid ${L.border}`, color: L.text }} />
                    </FieldRow>
                  </div>
                </>
              )}
              {modal.step === 2 && (
                <>
                  <FieldRow label="活动介绍">
                    <textarea value={modal.intro} onChange={e => setModal(m => ({ ...m, intro: e.target.value }))}
                      rows={4} placeholder="详细介绍活动内容、亮点、收益…"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                      style={{ border: `1px solid ${L.border}`, color: L.text }} />
                  </FieldRow>
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: L.bg }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: L.text }}>开启报名问卷</div>
                      <div className="text-xs mt-0.5" style={{ color: L.muted }}>报名时收集用户信息</div>
                    </div>
                    <Toggle value={modal.questionnaire} onChange={v => setModal(m => ({ ...m, questionnaire: v }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: L.bg }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: L.text }}>收费活动</div>
                      <div className="text-xs mt-0.5" style={{ color: L.muted }}>需要用户付费参与</div>
                    </div>
                    <Toggle value={modal.paid} onChange={v => setModal(m => ({ ...m, paid: v }))} />
                  </div>
                  <div className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 py-6"
                    style={{ borderColor: L.border }}>
                    <div className="text-sm" style={{ color: L.muted }}>点击或拖拽上传活动海报</div>
                    <div className="text-xs" style={{ color: L.mutedLight }}>支持 JPG / PNG，建议尺寸 1080×1920</div>
                    <button className="mt-1 px-4 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80"
                      style={{ color: L.primary, borderColor: L.primary }}>选择文件</button>
                  </div>
                </>
              )}
              {modal.step === 3 && (
                <>
                  <FieldRow label="推送渠道">
                    <div className="flex flex-col gap-2">
                      {["朋友圈", "群公告", "私信"].map(ch => (
                        <label key={ch} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80"
                          style={{ background: modal.channels.includes(ch) ? L.primaryBg : L.bg }}>
                          <input type="checkbox" checked={modal.channels.includes(ch)}
                            onChange={() => toggleChannel(ch)} className="rounded" />
                          <span className="text-sm font-medium" style={{ color: L.text }}>{ch}</span>
                          {modal.channels.includes(ch) && (
                            <span className="ml-auto text-xs" style={{ color: L.primary }}>已选</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </FieldRow>
                  <FieldRow label="定时发布">
                    <input type="datetime-local" value={modal.scheduledTime}
                      onChange={e => setModal(m => ({ ...m, scheduledTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ border: `1px solid ${L.border}`, color: L.text }} />
                  </FieldRow>
                  <div className="p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.15)" }}>
                    <div className="text-xs font-medium" style={{ color: "#fbbf24" }}>发布预览</div>
                    <div className="text-xs mt-1" style={{ color: "#fbbf24" }}>
                      活动「{modal.name || "（未命名）"}」将于
                      {modal.scheduledTime ? ` ${modal.scheduledTime} ` : "立即"}
                      通过 {modal.channels.length > 0 ? modal.channels.join("、") : "（未选渠道）"} 推送
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t" style={{ borderColor: L.border }}>
              <button
                onClick={() => modal.step > 1 ? setModal(m => ({ ...m, step: m.step - 1 })) : setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border hover:opacity-80 transition-opacity"
                style={{ color: L.textSec, borderColor: L.border }}>
                {modal.step > 1 ? "上一步" : "取消"}
              </button>
              <button
                onClick={() => modal.step < 3 ? setModal(m => ({ ...m, step: m.step + 1 })) : setShowModal(false)}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
                style={{ background: L.primary }}>
                {modal.step < 3 ? "下一步" : "发布活动"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: L.textSec }}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className="w-10 h-5 rounded-full transition-colors relative"
      style={{ background: value ? L.primary : L.border }}>
      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
        style={{ left: value ? "22px" : "2px" }} />
    </button>
  );
}
