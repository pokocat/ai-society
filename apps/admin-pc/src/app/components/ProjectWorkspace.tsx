import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowRight, Check, CheckCircle2, ChevronDown, Clock3,
  FileText, History, Link2, MessageSquareText, Paperclip, PhoneCall,
  Search, Send, ShoppingBag, Sparkles, UserRound, Users2, X, Layers3,
} from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import {
  CommunicationSheet, NewFollowUpDialog, NewFollowUpValue,
  WorkspaceMemberOption,
} from "./WorkspaceDialogs";

const C = {
  bg: "#0d1629",
  panel: "#131f35",
  panel2: "#1a2640",
  border: "rgba(255,255,255,0.075)",
  border2: "rgba(255,255,255,0.045)",
  text: "#e2e8f0",
  text2: "#94a3b8",
  muted: "#64748b",
  purple: "#7c3aed",
  indigo: "#6366f1",
  green: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
  cyan: "#22d3ee",
};

type QueueType = "待处理" | "我发布的" | "我回访的";
type MemberKey = "lin" | "qiu" | "zhao" | "chen";

interface QueueItem {
  id: number;
  member: MemberKey;
  type: QueueType;
  title: string;
  category: string;
  priority: "非常重要" | "重要" | "一般";
  due: string;
  projectId: string;
  project: string;
  assignee?: string;
  writeBack?: boolean;
  done?: boolean;
}

const members = {
  lin: {
    name: "林小满", wechat: "xiaoman_flm", phone: "138 0013 8892", city: "杭州",
    avatar: "/reference-assets/member-lin.png", identity: "尊享官", score: 86,
    tags: ["高活跃", "美妆偏好", "复购潜力"], joined: "2025-09-18",
    projects: [
      { id: "flm-membership", name: "主理人会员项目", role: "尊享官", status: "有效", color: "#7c3aed" },
      { id: "experience-camp", name: "百日体验营", role: "体验官", status: "第 36 天", color: "#06b6d4" },
    ],
  },
  qiu: {
    name: "邱水婷", wechat: "qiushuiting", phone: "139 1188 4201", city: "宁波",
    avatar: "/reference-assets/member-qiu.png", identity: "体验官", score: 74,
    tags: ["敏感肌", "内容活跃", "待升级"], joined: "2026-02-11",
    projects: [
      { id: "flm-membership", name: "主理人会员项目", role: "体验官", status: "有效", color: "#7c3aed" },
      { id: "brand-live", name: "品牌直播项目", role: "社群用户", status: "已授权", color: "#ec4899" },
    ],
  },
  zhao: {
    name: "赵一川", wechat: "zhaoyichuan88", phone: "186 0021 7586", city: "上海",
    avatar: "/reference-assets/member-zhao.png", identity: "城市合伙人", score: 92,
    tags: ["高净值", "渠道负责人", "季度回访"], joined: "2024-06-20",
    projects: [
      { id: "city-partner", name: "城市合伙人项目", role: "合伙人", status: "有效", color: "#f59e0b" },
      { id: "flm-membership", name: "主理人会员项目", role: "黑金会员", status: "有效", color: "#7c3aed" },
    ],
  },
  chen: {
    name: "陈思雨", wechat: "chensiyu_06", phone: "137 9901 4832", city: "成都",
    avatar: "/reference-assets/member-qiu.png", identity: "游客", score: 48,
    tags: ["新用户", "待分群", "首次回访"], joined: "2026-07-08",
    projects: [
      { id: "experience-camp", name: "百日体验营", role: "新学员", status: "第 3 天", color: "#06b6d4" },
    ],
  },
} as const;

const initialTasks: QueueItem[] = [
  { id: 1, member: "lin", type: "待处理", title: "使用后出现轻微敏感，需要跟进反馈", category: "售后问题", priority: "非常重要", due: "今天 12:30", projectId: "flm-membership", project: "主理人会员项目" },
  { id: 2, member: "qiu", type: "待处理", title: "体验营第 36 天，确认使用感受", category: "阶段回访", priority: "重要", due: "今天 15:00", projectId: "experience-camp", project: "百日体验营" },
  { id: 3, member: "zhao", type: "我发布的", title: "城市合伙人季度经营复盘", category: "经营回访", priority: "重要", due: "明天 10:00", projectId: "city-partner", project: "城市合伙人项目" },
  { id: 4, member: "chen", type: "我发布的", title: "新学员入营信息补全", category: "资料完善", priority: "一般", due: "7 月 13 日", projectId: "experience-camp", project: "百日体验营" },
  { id: 5, member: "lin", type: "我回访的", title: "订单到货后的产品使用回访", category: "订单回访", priority: "重要", due: "已回访 1 次", projectId: "flm-membership", project: "主理人会员项目", done: true },
  { id: 6, member: "zhao", type: "我回访的", title: "合伙人权益续费提醒", category: "续费提醒", priority: "一般", due: "已回访 2 次", projectId: "city-partner", project: "城市合伙人项目", done: true },
];

const ranking = [
  { member: "zhao" as MemberKey, influence: 926, activity: 93, referrals: 48, spend: "¥38,400" },
  { member: "lin" as MemberKey, influence: 868, activity: 88, referrals: 21, spend: "¥12,680" },
  { member: "qiu" as MemberKey, influence: 742, activity: 79, referrals: 13, spend: "¥6,420" },
  { member: "chen" as MemberKey, influence: 516, activity: 62, referrals: 4, spend: "¥980" },
];

function Badge({ children, color = C.purple }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md whitespace-nowrap"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30`, fontSize: 10 }}>
      {children}
    </span>
  );
}

export default function ProjectWorkspace() {
  const { currentProject, projects } = useProject();
  const [scope, setScope] = useState<"all" | "current">("all");
  const [queueType, setQueueType] = useState<QueueType>("待处理");
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState(1);
  const [profileTab, setProfileTab] = useState<"回访记录" | "订单记录" | "用户资料">("回访记录");
  const [period, setPeriod] = useState("本周");
  const [category, setCategory] = useState("售后问题");
  const [priority, setPriority] = useState("非常重要");
  const [assignee, setAssignee] = useState("运营部 · 小七");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [attachmentAdded, setAttachmentAdded] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [newFollowUpOpen, setNewFollowUpOpen] = useState(false);
  const [communicationOpen, setCommunicationOpen] = useState(false);
  const [createdNotice, setCreatedNotice] = useState("");

  const tasksInScope = useMemo(() => tasks.filter(task => scope === "all" || task.projectId === currentProject.id), [tasks, scope, currentProject.id]);
  const visibleTasks = useMemo(() => tasksInScope.filter(task =>
    task.type === queueType &&
    (task.title.includes(search) || members[task.member].name.includes(search))), [tasksInScope, queueType, search]);
  const selectedTask = tasks.find(task => task.id === selectedTaskId) ?? tasks[0];
  const member = members[selectedTask.member];
  const filteredRanking = useMemo(() => ranking.filter(row => scope === "all" || members[row.member].projects.some(project => project.id === currentProject.id)), [scope, currentProject.id]);
  const memberMetric = ranking.find(row => row.member === selectedTask.member) ?? ranking[0];
  const connectedProjects = projects.filter(project => project.status !== "configuring");
  const memberOptions: WorkspaceMemberOption[] = Object.entries(members).map(([id, item]) => ({
    id,
    name: item.name,
    avatar: item.avatar,
    wechat: item.wechat,
    identity: item.identity,
    projectIds: item.projects.map(project => project.id),
  }));
  const projectOptions = projects.map(project => ({ id: project.id, name: project.name, shortName: project.shortName, accent: project.accent }));
  const scopeStats = {
    pending: tasksInScope.filter(task => !task.done).length,
    completed: tasksInScope.filter(task => task.done).length,
    members: scope === "all" ? 4186 : currentProject.users,
    anomalies: scope === "all" ? projects.filter(project => project.status === "warning").length : Number(currentProject.status === "warning"),
  };

  useEffect(() => {
    const selectedStillVisible = visibleTasks.some(task => task.id === selectedTaskId);
    if (!selectedStillVisible && visibleTasks[0]) setSelectedTaskId(visibleTasks[0].id);
  }, [visibleTasks, selectedTaskId]);

  useEffect(() => {
    setCategory(selectedTask.category);
    setPriority(selectedTask.priority);
    setAssignee(selectedTask.assignee ?? "运营部 · 小七");
    setAttachmentAdded(false);
  }, [selectedTask.id]);

  const submitVisit = () => {
    if (!note.trim()) return;
    setTasks(items => items.map(task => task.id === selectedTask.id ? { ...task, done: true, type: "我回访的", due: "刚刚完成" } : task));
    setSaved(true);
    setAttachmentAdded(false);
    setNote("");
    window.setTimeout(() => setSaved(false), 2200);
  };

  const createFollowUp = (value: NewFollowUpValue) => {
    const project = projects.find(item => item.id === value.projectId) ?? currentProject;
    const nextId = Math.max(...tasks.map(task => task.id)) + 1;
    const dueDate = new Date(value.due);
    const due = Number.isNaN(dueDate.getTime())
      ? value.due
      : dueDate.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
    const task: QueueItem = {
      id: nextId,
      member: value.memberId as MemberKey,
      type: value.queueType,
      title: value.title,
      category: value.category,
      priority: value.priority,
      due,
      projectId: value.projectId,
      project: project.name,
      assignee: value.assignee,
      writeBack: value.writeBack,
    };
    setTasks(items => [...items, task]);
    setQueueType(value.queueType);
    setSelectedTaskId(nextId);
    if (scope === "current" && value.projectId !== currentProject.id) setScope("all");
    setCreatedNotice(`已创建任务 #${nextId}，并加入${value.queueType}`);
    window.setTimeout(() => setCreatedNotice(""), 2600);
  };

  return (
    <div className="p-4 h-full flex flex-col gap-3 min-w-[1040px]" style={{ background: C.bg }}>
      <div className="flex items-start justify-between gap-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold" style={{ color: C.text, fontSize: 18 }}>跨项目社群工作台</h1>
            <Badge color={scope === "all" ? C.purple : currentProject.accent}>{scope === "all" ? "全部项目" : currentProject.shortName}</Badge>
            <span className="flex items-center gap-1" style={{ color: C.green, fontSize: 10 }}>
              <CheckCircle2 size={11} /> 数据已同步
            </span>
          </div>
          <p className="mt-1" style={{ color: C.muted, fontSize: 11 }}>统一处理成员关系、项目身份、回访任务与订单服务记录</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-md" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <button onClick={() => setScope("all")} className="px-2.5 py-1.5 rounded flex items-center gap-1.5" style={{ color: scope === "all" ? C.text : C.muted, background: scope === "all" ? C.panel2 : "transparent", fontSize: 10 }}><Layers3 size={11} />全部项目</button>
            <button onClick={() => setScope("current")} className="px-2.5 py-1.5 rounded flex items-center gap-1.5" style={{ color: scope === "current" ? C.text : C.muted, background: scope === "current" ? C.panel2 : "transparent", fontSize: 10 }}><Link2 size={11} />当前项目</button>
          </div>
          <div className="px-3 py-2 rounded-md flex items-center gap-2" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <Link2 size={13} style={{ color: C.cyan }} />
            <span style={{ color: C.text2, fontSize: 11 }}>已接入 {connectedProjects.length} 个项目</span>
          </div>
          <button onClick={() => setNewFollowUpOpen(true)} className="px-3 py-2 rounded-md flex items-center gap-1.5" style={{ color: "white", background: C.indigo, fontSize: 11 }}>
            <PhoneCall size={13} /> 新建回访
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 flex-shrink-0">
        {[
          ["当前待处理", String(scopeStats.pending), scope === "all" ? "覆盖全部项目" : currentProject.shortName, C.red, AlertCircle],
          ["已完成回访", String(scopeStats.completed), scope === "all" ? "统一归档" : "已回写项目", C.green, CheckCircle2],
          [scope === "all" ? "跨项目成员" : "项目成员", scopeStats.members.toLocaleString(), scope === "all" ? "已合并 312 人" : `${currentProject.groups} 个社群`, C.cyan, Users2],
          ["同步异常", String(scopeStats.anomalies), scopeStats.anomalies ? "需要人工确认" : "运行正常", C.amber, Link2],
        ].map(([label, value, detail, color, Icon]) => {
          const IconComponent = Icon as typeof AlertCircle;
          return (
            <div key={label as string} className="px-3 py-2.5 rounded-md flex items-center gap-3" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: `${color}18` }}>
                <IconComponent size={15} style={{ color: color as string }} />
              </div>
              <div>
                <div className="font-semibold leading-none" style={{ color: C.text, fontSize: 16 }}>{value as string}</div>
                <div className="mt-1" style={{ color: C.text2, fontSize: 10 }}>{label as string} · <span style={{ color: color as string }}>{detail as string}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[250px_minmax(500px,1fr)_330px] gap-3 flex-1 min-h-0">
        <section data-testid="task-queue" className="rounded-md flex flex-col min-h-0" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="p-3" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: C.text, fontSize: 13 }}>任务队列</h2>
              <span style={{ color: C.muted, fontSize: 10 }}>{tasksInScope.filter(task => !task.done).length} 项未完成</span>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-3 p-1 rounded-md" style={{ background: C.bg }}>
              {(["待处理", "我发布的", "我回访的"] as QueueType[]).map(type => (
                <button key={type} onClick={() => setQueueType(type)} className="py-1.5 rounded text-center"
                  style={{ color: queueType === type ? "white" : C.muted, background: queueType === type ? C.indigo : "transparent", fontSize: 10 }}>
                  {type}
                </button>
              ))}
            </div>
            <div className="mt-2 px-2.5 py-2 rounded-md flex items-center gap-2" style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
              <Search size={12} style={{ color: C.muted }} />
              <input value={search} onChange={event => setSearch(event.target.value)} className="bg-transparent outline-none min-w-0 flex-1"
                style={{ color: C.text, fontSize: 11 }} placeholder="搜索任务或成员" />
              {search && <button onClick={() => setSearch("")} title="清除搜索"><X size={11} style={{ color: C.muted }} /></button>}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1.5" style={{ scrollbarWidth: "none" }}>
            {visibleTasks.map(task => {
              const itemMember = members[task.member];
              const active = task.id === selectedTaskId;
              const pColor = task.priority === "非常重要" ? C.red : task.priority === "重要" ? C.amber : C.cyan;
              return (
                <button key={task.id} onClick={() => setSelectedTaskId(task.id)} className="w-full p-2.5 rounded-md text-left transition-colors"
                  style={{ background: active ? "rgba(99,102,241,0.13)" : C.bg, border: `1px solid ${active ? "rgba(99,102,241,0.42)" : C.border2}` }}>
                  <div className="flex items-center gap-2">
                    <img src={itemMember.avatar} alt="" className="w-7 h-7 rounded-full object-cover" style={{ background: C.panel2 }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium" style={{ color: C.text, fontSize: 11 }}>{itemMember.name}</span>
                        <span style={{ color: pColor, fontSize: 9 }}>{task.priority}</span>
                      </div>
                      <div className="truncate mt-0.5" style={{ color: C.muted, fontSize: 9 }}>{task.project}</div>
                    </div>
                  </div>
                  <p className="mt-2 leading-5" style={{ color: C.text2, fontSize: 10 }}>{task.title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge color={pColor}>{task.category}</Badge>
                    <span className="flex items-center gap-1" style={{ color: task.done ? C.green : C.muted, fontSize: 9 }}>
                      {task.done ? <Check size={10} /> : <Clock3 size={10} />}{task.due}
                    </span>
                  </div>
                </button>
              );
            })}
            {visibleTasks.length === 0 && <div className="py-12 text-center" style={{ color: C.muted, fontSize: 11 }}>当前列表暂无任务</div>}
          </div>
        </section>

        <main data-testid="operations-center" className="flex flex-col gap-3 min-h-0">
          <section className="rounded-md flex-shrink-0" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div>
                <h2 className="font-semibold" style={{ color: C.text, fontSize: 13 }}>成员影响力与项目贡献</h2>
                <p className="mt-0.5" style={{ color: C.muted, fontSize: 9 }}>同一成员跨项目合并计算，避免重复统计</p>
              </div>
              <div className="flex p-1 rounded-md" style={{ background: C.bg }}>
                {["今日", "本周", "本月"].map(item => (
                  <button key={item} onClick={() => setPeriod(item)} className="px-2.5 py-1 rounded"
                    style={{ color: period === item ? C.text : C.muted, background: period === item ? C.panel2 : "transparent", fontSize: 9 }}>{item}</button>
                ))}
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="grid grid-cols-[30px_1.4fr_72px_64px_64px_82px] gap-2 pb-2" style={{ color: C.muted, fontSize: 9 }}>
                <span>排名</span><span>成员 / 项目身份</span><span>影响力</span><span>活跃度</span><span>推荐</span><span>贡献金额</span>
              </div>
              {filteredRanking.map((row, index) => {
                const rowMember = members[row.member];
                const active = row.member === selectedTask.member;
                return (
                  <button key={row.member} onClick={() => {
                    const nextTask = tasks.find(task => task.member === row.member);
                    if (nextTask) setSelectedTaskId(nextTask.id);
                  }} className="w-full grid grid-cols-[30px_1.4fr_72px_64px_64px_82px] gap-2 items-center py-2 text-left rounded px-1"
                    style={{ background: active ? "rgba(99,102,241,0.09)" : "transparent", borderTop: `1px solid ${C.border2}` }}>
                    <span className="font-semibold" style={{ color: index < 3 ? C.amber : C.muted, fontSize: 11 }}>{index + 1}</span>
                    <span className="flex items-center gap-2 min-w-0">
                      <img src={rowMember.avatar} alt="" className="w-7 h-7 rounded-full object-cover" style={{ background: C.panel2 }} />
                      <span className="min-w-0">
                        <span className="block font-medium" style={{ color: C.text, fontSize: 10 }}>{rowMember.name}</span>
                        <span className="block truncate" style={{ color: C.muted, fontSize: 9 }}>{rowMember.projects.map(item => item.role).join(" · ")}</span>
                      </span>
                    </span>
                    <span className="font-semibold" style={{ color: C.purple, fontSize: 11 }}>{row.influence}</span>
                    <span style={{ color: C.green, fontSize: 10 }}>{row.activity}%</span>
                    <span style={{ color: C.text2, fontSize: 10 }}>{row.referrals} 人</span>
                    <span style={{ color: C.amber, fontSize: 10 }}>{row.spend}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-[210px_1fr] gap-3 flex-1 min-h-0">
            <section className="rounded-md p-3 overflow-auto" style={{ background: C.panel, border: `1px solid ${C.border}`, scrollbarWidth: "none" }}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold" style={{ color: C.text, fontSize: 12 }}>成员关系链</h2>
                <Badge color={C.cyan}>统一身份</Badge>
              </div>
              <div className="mt-3 space-y-1.5">
                {[
                  ["超级生态", "女王城堡", "4,186 人"],
                  ["项目", currentProject.shortName, `${currentProject.users} 人`],
                  ["社群", selectedTask.project.includes("体验") ? "体验官 3 群" : "尊享官 1 群", "126 人"],
                  ["服务员工", assignee.replace(" · ", " "), "主负责"],
                ].map(([label, value, count], index) => (
                  <div key={label}>
                    <div className="p-2 rounded-md" style={{ background: index === 3 ? "rgba(99,102,241,0.12)" : C.bg, border: `1px solid ${index === 3 ? "rgba(99,102,241,0.3)" : C.border2}` }}>
                      <div style={{ color: C.muted, fontSize: 8 }}>{label}</div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-medium" style={{ color: C.text2, fontSize: 10 }}>{value}</span>
                        <span style={{ color: index === 3 ? C.purple : C.muted, fontSize: 8 }}>{count}</span>
                      </div>
                    </div>
                    {index < 3 && <div className="h-2 w-px mx-auto" style={{ background: C.border }} />}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 9 }}>跨项目身份</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {member.projects.map(project => <Badge key={project.name} color={project.color}>{project.role}</Badge>)}
                </div>
              </div>
            </section>

            <section className="rounded-md flex flex-col min-h-0" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <h2 className="font-semibold" style={{ color: C.text, fontSize: 12 }}>回访操作台</h2>
                  <p className="mt-0.5" style={{ color: C.muted, fontSize: 9 }}>本次记录将回写至成员统一档案及来源项目</p>
                </div>
                <Badge color={C.purple}>任务 #{selectedTask.id}</Badge>
              </div>
              <div className="p-3 flex-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
                <div className="grid grid-cols-3 gap-2">
                  <label>
                    <span style={{ color: C.text2, fontSize: 9 }}>问题分类</span>
                    <select value={category} onChange={event => setCategory(event.target.value)} className="w-full mt-1 px-2 py-2 rounded-md outline-none"
                      style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 10 }}>
                      <option>售后问题</option><option>阶段回访</option><option>系统问题</option><option>财务问题</option>
                    </select>
                  </label>
                  <label>
                    <span style={{ color: C.text2, fontSize: 9 }}>优先级</span>
                    <select value={priority} onChange={event => setPriority(event.target.value)} className="w-full mt-1 px-2 py-2 rounded-md outline-none"
                      style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 10 }}>
                      <option>非常重要</option><option>重要</option><option>一般</option>
                    </select>
                  </label>
                  <label>
                    <span style={{ color: C.text2, fontSize: 9 }}>协同处理人</span>
                    <select value={assignee} onChange={event => setAssignee(event.target.value)} className="w-full mt-1 px-2 py-2 rounded-md outline-none"
                      style={{ color: C.text, background: C.panel2, border: `1px solid ${C.border}`, fontSize: 10 }}>
                      <option>运营部 · 小七</option><option>客服部 · 小五</option><option>技术部 · 陈卓</option>
                    </select>
                  </label>
                </div>
                <label className="block mt-3">
                  <span style={{ color: C.text2, fontSize: 9 }}>回访备注</span>
                  <textarea value={note} onChange={event => setNote(event.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-md outline-none resize-none"
                    style={{ height: 76, color: C.text, background: C.panel2, border: `1px solid ${note ? "rgba(99,102,241,0.4)" : C.border}`, fontSize: 10 }}
                    placeholder={`记录 ${member.name} 的反馈、处理结果及下一步安排...`} />
                </label>
                <div className="mt-2 flex items-center justify-between">
                  <button onClick={() => setAttachmentAdded(value => !value)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md" style={{ color: attachmentAdded ? C.green : C.text2, background: C.panel2, border: `1px solid ${attachmentAdded ? "rgba(52,211,153,0.35)" : C.border}`, fontSize: 9 }}>
                    {attachmentAdded ? <Check size={11} /> : <Paperclip size={11} />} {attachmentAdded ? "已添加反馈截图" : "添加附件"}
                  </button>
                  <div className="flex items-center gap-2">
                    {saved && <span className="flex items-center gap-1" style={{ color: C.green, fontSize: 9 }}><Check size={11} />已写入统一档案</span>}
                    <button disabled={!note.trim()} onClick={submitVisit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md disabled:opacity-40"
                      style={{ color: "white", background: C.indigo, fontSize: 10 }}><Send size={11} /> 完成回访</button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>

        <aside data-testid="member-profile" className="flex flex-col gap-3 min-h-0">
          <section className="rounded-md p-3 flex-shrink-0" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="flex items-start gap-3">
              <img src={member.avatar} alt={`${member.name}头像`} className="w-12 h-12 rounded-md object-cover" style={{ background: C.panel2 }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold" style={{ color: C.text, fontSize: 14 }}>{member.name}</h2>
                  <Badge color={C.purple}>{member.identity}</Badge>
                </div>
                <div className="mt-1" style={{ color: C.muted, fontSize: 9 }}>微信号 {member.wechat}</div>
                <div className="mt-1 flex items-center gap-2" style={{ color: C.text2, fontSize: 9 }}>
                  <span>{member.city}</span><span>·</span><span>{member.phone}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ border: `2px solid ${member.score >= 85 ? C.green : C.amber}`, color: member.score >= 85 ? C.green : C.amber, fontSize: 11 }}>
                {member.score}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              {[["影响力", String(memberMetric.influence)], ["总消费", memberMetric.spend], ["回访", `${tasks.filter(task => task.member === selectedTask.member && task.done).length + 7} 次`]].map(([label, value]) => (
                <div key={label} className="p-2 rounded-md text-center" style={{ background: C.bg }}>
                  <div className="font-semibold" style={{ color: C.text, fontSize: 11 }}>{value}</div>
                  <div className="mt-0.5" style={{ color: C.muted, fontSize: 8 }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between">
                <span style={{ color: C.text2, fontSize: 9 }}>项目身份</span>
                <span style={{ color: C.muted, fontSize: 8 }}>统一成员 ID: U-100024</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {member.projects.map(project => (
                  <div key={project.name} className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: C.bg }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: project.color }} />
                    <span className="flex-1 truncate" style={{ color: C.text2, fontSize: 9 }}>{project.name}</span>
                    <span style={{ color: project.color, fontSize: 9 }}>{project.role}</span>
                    <span style={{ color: C.muted, fontSize: 8 }}>{project.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-3">
              {member.tags.map(tag => <Badge key={tag} color={C.cyan}>{tag}</Badge>)}
            </div>
          </section>

          <section className="rounded-md flex-1 min-h-0 flex flex-col" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="grid grid-cols-3 p-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
              {(["回访记录", "订单记录", "用户资料"] as const).map(tab => (
                <button key={tab} onClick={() => setProfileTab(tab)} className="py-2 rounded"
                  style={{ color: profileTab === tab ? C.text : C.muted, background: profileTab === tab ? C.panel2 : "transparent", fontSize: 9 }}>{tab}</button>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-3" style={{ scrollbarWidth: "none" }}>
              {profileTab === "回访记录" && (
                <div className="space-y-2.5">
                  {[
                    ["今天 09:42", "运营部 · 小七", "确认敏感情况，用户反馈已缓解，建议暂停叠加使用。", "售后问题"],
                    ["7 月 6 日 15:20", "客服部 · 小五", "订单已签收，已告知使用顺序和注意事项。", "订单回访"],
                    ["6 月 28 日 10:15", "系统同步", "体验营第 30 天节点自动生成回访任务。", "阶段回访"],
                    ...(showAllHistory ? [
                      ["6 月 18 日 14:06", "运营部 · 小七", "完成会员权益升级意向确认，保留后续跟进。", "权益回访"],
                      ["5 月 26 日 11:32", "系统同步", "订单完成后自动生成首次使用回访。", "订单回访"],
                    ] : []),
                  ].map(([time, operator, content, type], index) => (
                    <div key={time} className="relative pl-4 pb-2" style={{ borderLeft: `1px solid ${C.border}` }}>
                      <span className="absolute w-2 h-2 rounded-full -left-[4.5px] top-1" style={{ background: index === 0 ? C.purple : C.muted }} />
                      <div className="flex items-center justify-between"><span style={{ color: C.text2, fontSize: 9 }}>{operator}</span><span style={{ color: C.muted, fontSize: 8 }}>{time}</span></div>
                      <p className="mt-1 leading-5" style={{ color: C.text2, fontSize: 9 }}>{content}</p>
                      <div className="mt-1"><Badge color={index === 0 ? C.red : C.cyan}>{type}</Badge></div>
                    </div>
                  ))}
                </div>
              )}
              {profileTab === "订单记录" && (
                <div className="space-y-2">
                  {[
                    ["ORD-20260708023", "焕活修护套装", "¥1,680", "已完成", "主理人会员项目"],
                    ["ORD-20260519018", "百日体验营进阶包", "¥980", "已完成", "百日体验营"],
                  ].map(order => (
                    <div key={order[0]} className="p-2.5 rounded-md" style={{ background: C.bg, border: `1px solid ${C.border2}` }}>
                      <div className="flex items-center gap-2"><ShoppingBag size={12} style={{ color: C.purple }} /><span className="font-medium flex-1" style={{ color: C.text, fontSize: 10 }}>{order[1]}</span><span style={{ color: C.amber, fontSize: 10 }}>{order[2]}</span></div>
                      <div className="mt-2 flex items-center justify-between" style={{ color: C.muted, fontSize: 8 }}><span>{order[0]}</span><span>{order[4]} · {order[3]}</span></div>
                    </div>
                  ))}
                </div>
              )}
              {profileTab === "用户资料" && (
                <div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {[["入库时间", member.joined], ["地区", member.city], ["职业", "品牌运营"], ["家庭情况", "二孩家庭"], ["皮肤记录", "混合偏敏感"], ["推荐人", "赵一川"]].map(([label, value]) => (
                      <div key={label}><div style={{ color: C.muted, fontSize: 8 }}>{label}</div><div className="mt-1" style={{ color: C.text2, fontSize: 9 }}>{value}</div></div>
                    ))}
                  </div>
                  <div className="mt-4 p-2.5 rounded-md flex items-center gap-3" style={{ background: "white" }}>
                    <img src="/reference-assets/wechat-qr.png" alt="成员微信二维码" className="w-14 h-14" />
                    <div><div style={{ color: "#111827", fontSize: 10, fontWeight: 600 }}>成员微信二维码</div><div className="mt-1" style={{ color: "#6b7280", fontSize: 8 }}>来源于微信号管理，更新于今天 09:30</div></div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-2.5 flex items-center gap-2" style={{ borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => { setProfileTab("回访记录"); setShowAllHistory(value => !value); }} className="flex-1 py-2 rounded-md flex items-center justify-center gap-1.5" style={{ color: showAllHistory ? C.cyan : C.text2, background: C.panel2, fontSize: 9 }}><History size={11} />{showAllHistory ? "收起历史" : "完整历史"}</button>
              <button onClick={() => setCommunicationOpen(true)} className="flex-1 py-2 rounded-md flex items-center justify-center gap-1.5" style={{ color: "white", background: C.indigo, fontSize: 9 }}><MessageSquareText size={11} />发起沟通</button>
            </div>
          </section>
        </aside>
      </div>

      {createdNotice && (
        <div className="fixed top-16 left-1/2 z-[70] -translate-x-1/2 px-4 py-2.5 rounded-md shadow-2xl flex items-center gap-2" style={{ color: C.green, background: C.panel, border: "1px solid rgba(52,211,153,0.3)", fontSize: 10 }}>
          <CheckCircle2 size={13} />{createdNotice}
        </div>
      )}
      <NewFollowUpDialog
        open={newFollowUpOpen}
        onOpenChange={setNewFollowUpOpen}
        members={memberOptions}
        projects={projectOptions}
        defaultMemberId={selectedTask.member}
        defaultProjectId={selectedTask.projectId}
        onCreate={createFollowUp}
      />
      <CommunicationSheet
        open={communicationOpen}
        onOpenChange={setCommunicationOpen}
        member={memberOptions.find(item => item.id === selectedTask.member) ?? memberOptions[0]}
        projects={projectOptions}
      />
    </div>
  );
}
