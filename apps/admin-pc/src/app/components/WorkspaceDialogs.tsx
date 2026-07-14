import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Check, CheckCircle2, Clock3, FolderSync, MessageCircle,
  Send, Smartphone, UserRound, Users2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "./ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter,
  SheetHeader, SheetTitle,
} from "./ui/sheet";

const W = {
  bg: "#0d1629",
  panel: "#131f35",
  panel2: "#1a2640",
  border: "rgba(255,255,255,0.08)",
  text: "#e2e8f0",
  text2: "#94a3b8",
  muted: "#64748b",
  indigo: "#6366f1",
  purple: "#7c3aed",
  green: "#34d399",
  cyan: "#22d3ee",
};

export interface WorkspaceMemberOption {
  id: string;
  name: string;
  avatar: string;
  wechat: string;
  identity: string;
  projectIds: string[];
}

export interface WorkspaceProjectOption {
  id: string;
  name: string;
  shortName: string;
  accent: string;
}

export interface NewFollowUpValue {
  memberId: string;
  projectId: string;
  queueType: "待处理" | "我发布的";
  category: string;
  priority: "非常重要" | "重要" | "一般";
  assignee: string;
  due: string;
  title: string;
  writeBack: boolean;
}

function tomorrowAtTen() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T10:00`;
}

const fieldClass = "w-full mt-1.5 px-3 py-2.5 rounded-md outline-none";

export function NewFollowUpDialog({
  open,
  onOpenChange,
  members,
  projects,
  defaultMemberId,
  defaultProjectId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: WorkspaceMemberOption[];
  projects: WorkspaceProjectOption[];
  defaultMemberId: string;
  defaultProjectId: string;
  onCreate: (value: NewFollowUpValue) => void;
}) {
  const [memberId, setMemberId] = useState(defaultMemberId);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [queueType, setQueueType] = useState<"待处理" | "我发布的">("我发布的");
  const [category, setCategory] = useState("阶段回访");
  const [priority, setPriority] = useState<"非常重要" | "重要" | "一般">("重要");
  const [assignee, setAssignee] = useState("运营部 · 小七");
  const [due, setDue] = useState(tomorrowAtTen);
  const [title, setTitle] = useState("");
  const [writeBack, setWriteBack] = useState(true);

  const selectedMember = members.find(item => item.id === memberId) ?? members[0];
  const eligibleProjects = useMemo(() => projects.filter(project => selectedMember?.projectIds.includes(project.id)), [projects, selectedMember]);

  useEffect(() => {
    if (!open) return;
    const nextMember = members.find(item => item.id === defaultMemberId) ?? members[0];
    const nextProject = nextMember?.projectIds.includes(defaultProjectId) ? defaultProjectId : nextMember?.projectIds[0];
    setMemberId(nextMember?.id ?? "");
    setProjectId(nextProject ?? projects[0]?.id ?? "");
    setQueueType("我发布的");
    setCategory("阶段回访");
    setPriority("重要");
    setAssignee("运营部 · 小七");
    setDue(tomorrowAtTen());
    setTitle("");
    setWriteBack(true);
  }, [open, defaultMemberId, defaultProjectId, members, projects]);

  const changeMember = (nextMemberId: string) => {
    setMemberId(nextMemberId);
    const nextMember = members.find(item => item.id === nextMemberId);
    if (nextMember && !nextMember.projectIds.includes(projectId)) setProjectId(nextMember.projectIds[0]);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !memberId || !projectId) return;
    onCreate({ memberId, projectId, queueType, category, priority, assignee, due, title: title.trim(), writeBack });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="new-follow-up-dialog" className="max-w-[640px] gap-0 overflow-hidden p-0" style={{ background: W.panel, borderColor: W.border, color: W.text }}>
        <DialogHeader className="px-5 py-4" style={{ borderBottom: `1px solid ${W.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)", color: W.indigo }}><UserRound size={17} /></div>
            <div>
              <DialogTitle style={{ fontSize: 15 }}>新建回访任务</DialogTitle>
              <DialogDescription className="mt-1" style={{ color: W.muted, fontSize: 10 }}>任务将进入社群中台，并按选择回写至来源项目</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 px-5 py-4">
            <label>
              <span style={{ color: W.text2, fontSize: 10 }}>回访成员</span>
              <select aria-label="回访成员" value={memberId} onChange={event => changeMember(event.target.value)} className={fieldClass} style={{ background: W.panel2, border: `1px solid ${W.border}`, color: W.text, fontSize: 11 }}>
                {members.map(item => <option key={item.id} value={item.id}>{item.name} · {item.identity}</option>)}
              </select>
            </label>
            <label>
              <span style={{ color: W.text2, fontSize: 10 }}>来源项目</span>
              <select aria-label="来源项目" value={projectId} onChange={event => setProjectId(event.target.value)} className={fieldClass} style={{ background: W.panel2, border: `1px solid ${W.border}`, color: W.text, fontSize: 11 }}>
                {eligibleProjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              <span style={{ color: W.text2, fontSize: 10 }}>问题分类</span>
              <select aria-label="问题分类" value={category} onChange={event => setCategory(event.target.value)} className={fieldClass} style={{ background: W.panel2, border: `1px solid ${W.border}`, color: W.text, fontSize: 11 }}>
                <option>阶段回访</option><option>售后问题</option><option>订单回访</option><option>经营回访</option><option>资料完善</option>
              </select>
            </label>
            <label>
              <span style={{ color: W.text2, fontSize: 10 }}>优先级</span>
              <select aria-label="优先级" value={priority} onChange={event => setPriority(event.target.value as NewFollowUpValue["priority"])} className={fieldClass} style={{ background: W.panel2, border: `1px solid ${W.border}`, color: W.text, fontSize: 11 }}>
                <option>非常重要</option><option>重要</option><option>一般</option>
              </select>
            </label>
            <label>
              <span style={{ color: W.text2, fontSize: 10 }}>负责人</span>
              <select aria-label="负责人" value={assignee} onChange={event => setAssignee(event.target.value)} className={fieldClass} style={{ background: W.panel2, border: `1px solid ${W.border}`, color: W.text, fontSize: 11 }}>
                <option>运营部 · 小七</option><option>客服部 · 小五</option><option>技术部 · 陈卓</option>
              </select>
            </label>
            <label>
              <span style={{ color: W.text2, fontSize: 10 }}>提醒时间</span>
              <input aria-label="提醒时间" type="datetime-local" value={due} onChange={event => setDue(event.target.value)} className={fieldClass} style={{ background: W.panel2, border: `1px solid ${W.border}`, color: W.text, fontSize: 11 }} />
            </label>
            <label className="col-span-2">
              <span style={{ color: W.text2, fontSize: 10 }}>任务内容</span>
              <textarea aria-label="任务内容" value={title} onChange={event => setTitle(event.target.value)} className={`${fieldClass} resize-none`} style={{ height: 82, background: W.panel2, border: `1px solid ${title ? "rgba(99,102,241,0.5)" : W.border}`, color: W.text, fontSize: 11 }} placeholder="说明本次回访目标、需要确认的问题和预期结果" />
            </label>
            <div className="col-span-2 flex items-center justify-between gap-4 p-3 rounded-md" style={{ background: W.bg, border: `1px solid ${W.border}` }}>
              <div className="flex items-center gap-2.5">
                <FolderSync size={14} style={{ color: W.cyan }} />
                <div><div style={{ color: W.text2, fontSize: 10 }}>同步回写来源项目</div><div className="mt-0.5" style={{ color: W.muted, fontSize: 9 }}>完成回访后同步更新项目系统中的服务记录</div></div>
              </div>
              <button type="button" role="switch" aria-checked={writeBack} onClick={() => setWriteBack(value => !value)} className="w-9 h-5 rounded-full p-0.5 transition-colors" style={{ background: writeBack ? W.indigo : W.panel2 }}>
                <span className="block w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: writeBack ? "translateX(16px)" : "translateX(0)" }} />
              </button>
            </div>
          </div>
          <DialogFooter className="px-5 py-3" style={{ borderTop: `1px solid ${W.border}` }}>
            <div className="mr-auto flex p-1 rounded-md" style={{ background: W.bg }}>
              {(["我发布的", "待处理"] as const).map(type => <button key={type} type="button" onClick={() => setQueueType(type)} className="px-3 py-1.5 rounded" style={{ color: queueType === type ? W.text : W.muted, background: queueType === type ? W.panel2 : "transparent", fontSize: 10 }}>{type}</button>)}
            </div>
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-md" style={{ color: W.text2, background: W.panel2, fontSize: 10 }}>取消</button>
            <button type="submit" disabled={!title.trim()} className="px-4 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-40" style={{ color: "white", background: W.indigo, fontSize: 10 }}><Check size={12} />创建任务</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const templates = {
  "售后关怀": "想确认一下目前的使用情况，之前反馈的不适是否已经缓解？如果方便，请告诉我今天的感受。",
  "体验节点": "今天是体验计划的重要节点，想了解这段时间最明显的变化，以及还需要我们协助的地方。",
  "订单签收": "看到订单已经签收，想确认产品是否完整收到，也可以随时告诉我使用上的问题。",
};

export function CommunicationSheet({
  open,
  onOpenChange,
  member,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: WorkspaceMemberOption;
  projects: WorkspaceProjectOption[];
}) {
  const [channel, setChannel] = useState<"企业微信" | "项目消息" | "短信">("企业微信");
  const [projectId, setProjectId] = useState(member.projectIds[0] ?? "");
  const [message, setMessage] = useState("");
  const [archive, setArchive] = useState(true);
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const eligibleProjects = projects.filter(project => member.projectIds.includes(project.id));

  useEffect(() => {
    setProjectId(member.projectIds[0] ?? "");
    setMessage("");
    setSentMessages([]);
  }, [member.id]);

  const sendMessage = () => {
    if (!message.trim()) return;
    setSentMessages(items => [...items, message.trim()]);
    setMessage("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="communication-sheet" className="w-[430px] max-w-[430px] gap-0" style={{ background: W.panel, borderColor: W.border, color: W.text }}>
        <SheetHeader style={{ borderBottom: `1px solid ${W.border}` }}>
          <div className="flex items-center gap-3 pr-8">
            <img src={member.avatar} alt={`${member.name}头像`} className="w-10 h-10 rounded-md object-cover" />
            <div className="min-w-0"><SheetTitle style={{ fontSize: 14 }}>{member.name}</SheetTitle><SheetDescription className="mt-1" style={{ color: W.muted, fontSize: 9 }}>微信号 {member.wechat} · {member.identity}</SheetDescription></div>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-md" style={{ background: W.bg }}>
            {(["企业微信", "项目消息", "短信"] as const).map((item, index) => {
              const Icon = index === 0 ? MessageCircle : index === 1 ? Users2 : Smartphone;
              return <button key={item} onClick={() => setChannel(item)} className="py-2 rounded flex items-center justify-center gap-1.5" style={{ color: channel === item ? W.text : W.muted, background: channel === item ? W.panel2 : "transparent", fontSize: 9 }}><Icon size={11} />{item}</button>;
            })}
          </div>

          <label className="block mt-4">
            <span style={{ color: W.text2, fontSize: 9 }}>沟通归属项目</span>
            <select aria-label="沟通归属项目" value={projectId} onChange={event => setProjectId(event.target.value)} className={fieldClass} style={{ background: W.panel2, border: `1px solid ${W.border}`, color: W.text, fontSize: 10 }}>
              {eligibleProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>

          <div className="mt-4">
            <div style={{ color: W.text2, fontSize: 9 }}>常用话术</div>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {Object.entries(templates).map(([name, content]) => <button key={name} onClick={() => setMessage(content)} className="py-2 rounded-md" style={{ color: W.cyan, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.18)", fontSize: 9 }}>{name}</button>)}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="max-w-[85%] p-2.5 rounded-md" style={{ color: W.text2, background: W.bg, fontSize: 9 }}>您好，上次的服务记录已经同步，今天想继续确认一下您的体验情况。</div>
            {sentMessages.map((content, index) => (
              <div key={`${content}-${index}`} className="ml-auto max-w-[85%] p-2.5 rounded-md" style={{ color: "white", background: W.indigo, fontSize: 9 }}>
                {content}
                <div className="mt-1 flex items-center justify-end gap-1" style={{ color: "#c7d2fe", fontSize: 8 }}><CheckCircle2 size={9} />已发送并归档</div>
              </div>
            ))}
          </div>

          <label className="block mt-4">
            <span style={{ color: W.text2, fontSize: 9 }}>消息内容</span>
            <textarea aria-label="消息内容" value={message} onChange={event => setMessage(event.target.value)} className={`${fieldClass} resize-none`} style={{ height: 120, background: W.panel2, border: `1px solid ${message ? "rgba(99,102,241,0.5)" : W.border}`, color: W.text, fontSize: 10 }} placeholder={`输入发给 ${member.name} 的消息`} />
          </label>
          <button onClick={() => setArchive(value => !value)} className="mt-3 flex items-center gap-2" style={{ color: W.text2, fontSize: 9 }}>
            <span className="w-4 h-4 rounded flex items-center justify-center" style={{ color: "white", background: archive ? W.indigo : W.panel2, border: `1px solid ${archive ? W.indigo : W.border}` }}>{archive && <Check size={10} />}</span>
            同时写入统一成员档案和来源项目
          </button>
        </div>
        <SheetFooter style={{ borderTop: `1px solid ${W.border}` }}>
          <div className="flex items-center justify-between" style={{ color: W.muted, fontSize: 8 }}><span className="flex items-center gap-1"><Clock3 size={9} />发送后记录当前时间</span><span>{channel}</span></div>
          <button onClick={sendMessage} disabled={!message.trim()} className="w-full py-2.5 rounded-md flex items-center justify-center gap-1.5 disabled:opacity-40" style={{ color: "white", background: W.indigo, fontSize: 10 }}><Send size={12} />发送消息</button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
