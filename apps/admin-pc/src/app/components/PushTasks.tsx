import { useState } from "react";
import {
  Plus, X, Clock, CheckCircle, Send, Image, FileText, Users, Calendar, ChevronRight,
  Zap, Copy, Play, Pause, AlertTriangle, TrendingUp,
} from "lucide-react";

const L = {
  bg: "#0d1629", surface: "#131f35", border: "rgba(255,255,255,0.07)", borderLight: "rgba(255,255,255,0.04)",
  primary: "#4361ee", primaryBg: "rgba(67,97,238,0.15)", text: "#e2e8f0", textSec: "#94a3b8",
  muted: "#64748b", mutedLight: "#475569", surface2: "#1a2640",
};

type TaskStatus = "已完成" | "进行中" | "待发送" | "草稿" | "已暂停";

interface Task {
  id: number;
  name: string;
  type: string;
  status: TaskStatus;
  priority: "高" | "中" | "低";
  targetLabel: string;
  targetCount: number;
  platforms: string[];
  scheduledAt?: string;
  reach?: number;
  clickRate?: string;
  content: string;
}

const TASKS: Task[] = [
  {
    id: 1, name: "7月PRO会员月度活动推送", type: "朋友圈图文", status: "已完成", priority: "高",
    targetLabel: "PRO会员", targetCount: 1023, platforms: ["个人微信", "企业微信"],
    reach: 987, clickRate: "12.3%",
    content: "亲爱的PRO会员，7月专属活动已开启！限时享受双倍积分、专属折扣及优先体验权益。点击查看详情，抢先锁定你的专属福利！",
  },
  {
    id: 2, name: "抖音引流用户欢迎推送", type: "文字消息", status: "进行中", priority: "中",
    targetLabel: "新用户", targetCount: 156, platforms: ["个人微信"],
    reach: 134,
    content: "欢迎来到我们的私域社群！我是你的专属服务顾问，接下来我会为你提供最贴心的服务。有任何问题随时找我哦～",
  },
  {
    id: 3, name: "代理商月度培训提醒", type: "朋友圈视频", status: "待发送", priority: "高",
    targetLabel: "代理商", targetCount: 134, platforms: ["个人微信", "企业微信"],
    scheduledAt: "07-10 14:00",
    content: "【代理商专属】7月线上培训即将开始！本期重点分享渠道拓展方法论与成功案例，请准时参加。会议链接已附上。",
  },
  {
    id: 4, name: "沉默用户召回行动", type: "私信消息", status: "草稿", priority: "中",
    targetLabel: "沉默用户", targetCount: 218, platforms: [],
    content: "好久不见！这段时间有没有想念我们的课程？我们最近推出了全新内容，专门为你保留了一个名额，点击了解详情～",
  },
  {
    id: 5, name: "流失风险用户专属优惠", type: "朋友圈图文", status: "已暂停", priority: "高",
    targetLabel: "流失风险", targetCount: 67, platforms: ["个人微信"],
    content: "特别为你准备了专属8折优惠券，仅限本周使用！这是我们表达诚意的方式，期待你的回归。",
  },
  {
    id: 6, name: "体验官升级PRO邀请", type: "私信消息", status: "待发送", priority: "中",
    targetLabel: "体验官", targetCount: 387, platforms: ["企业微信"],
    scheduledAt: "07-12 10:00",
    content: "恭喜你成为我们的体验官！根据你的活跃表现，你已达到PRO会员升级条件。现在升级可享受额外3个月会员权益，名额有限！",
  },
];

const TEMPLATES = [
  { id: 1, icon: "🎁", name: "欢迎新用户模板", category: "欢迎语", used: 23, preview: "欢迎来到{城市}社群！我是你的专属顾问{服务老师}..." },
  { id: 2, icon: "🌟", name: "VIP专属活动通知", category: "活动推送", used: 45, preview: "亲爱的{等级}会员{用户名}，本月专属活动已开启..." },
  { id: 3, icon: "📊", name: "月度培训提醒", category: "培训通知", used: 18, preview: "【月度培训】{用户名}您好，本月线上培训将于..." },
  { id: 4, icon: "💌", name: "流失召回模板", category: "召回", used: 34, preview: "好久不见！{用户名}，这段时间有没有想念我们..." },
  { id: 5, icon: "⬆️", name: "升级邀请模板", category: "转化", used: 56, preview: "恭喜{用户名}！你已达到{等级}升级条件，现在升级..." },
  { id: 6, icon: "🎉", name: "节日祝福模板", category: "关怀", used: 89, preview: "节日快乐！{城市}的{用户名}，感谢一路相伴..." },
];

const LOGS = [
  { time: "07-06 14:23", task: "7月PRO会员月度活动推送", account: "fengle_bj_01", target: "张明远", channel: "个人微信", status: "成功" },
  { time: "07-06 14:23", task: "7月PRO会员月度活动推送", account: "fengle_sh_02", target: "李晓燕", channel: "企业微信", status: "成功" },
  { time: "07-06 14:22", task: "7月PRO会员月度活动推送", account: "fengle_gz_01", target: "孙雨晴", channel: "个人微信", status: "失败" },
  { time: "07-06 10:15", task: "抖音引流用户欢迎推送", account: "fengle_bj_01", target: "陈美玲", channel: "个人微信", status: "成功" },
  { time: "07-06 09:48", task: "抖音引流用户欢迎推送", account: "fengle_sh_02", target: "王建国", channel: "个人微信", status: "成功" },
  { time: "07-05 16:30", task: "抖音引流用户欢迎推送", account: "fengle_bj_01", target: "周国强", channel: "个人微信", status: "成功" },
  { time: "07-05 15:12", task: "体验官升级PRO邀请", account: "fengle_gz_01", target: "刘志远", channel: "企业微信", status: "失败" },
  { time: "07-05 11:05", task: "代理商月度培训提醒", account: "fengle_sh_02", target: "赵丽华", channel: "企业微信", status: "成功" },
];

const STATUS_FILTER = ["全部", "已完成", "进行中", "待发送", "草稿", "已暂停"];
// 由 TASKS 实时统计而来，不再手写死数字（避免与实际列表脱节）
const STATUS_COUNTS: Record<string, number> = {
  全部: TASKS.length,
  已完成: TASKS.filter(t => t.status === "已完成").length,
  进行中: TASKS.filter(t => t.status === "进行中").length,
  待发送: TASKS.filter(t => t.status === "待发送").length,
  草稿: TASKS.filter(t => t.status === "草稿").length,
  已暂停: TASKS.filter(t => t.status === "已暂停").length,
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  "朋友圈图文": <Image size={16} />,
  "朋友圈视频": <Play size={16} />,
  "文字消息": <FileText size={16} />,
  "私信消息": <Send size={16} />,
};

const STATUS_STYLE: Record<TaskStatus, { bg: string; color: string }> = {
  "已完成": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  "进行中": { bg: "rgba(67,97,238,0.15)", color: "#818cf8" },
  "待发送": { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  "草稿": { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" },
  "已暂停": { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
};

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  "高": { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  "中": { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  "低": { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
};

const PUSH_TYPES = ["朋友圈图文", "朋友圈视频", "文字消息", "私信消息"];
const TARGET_OPTIONS = ["全部用户", "PRO会员", "体验官", "代理商", "沉默用户", "流失风险", "新用户", "高价值客户"];
const VARIABLES = ["{用户名}", "{城市}", "{等级}", "{服务老师}"];

function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const isPersonal = platform === "个人微信";
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
      style={{ background: isPersonal ? "rgba(16,185,129,0.15)" : "rgba(67,97,238,0.15)", color: isPersonal ? "#34d399" : "#818cf8" }}>
      {platform}
    </span>
  );
}

function NewTaskModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", type: "朋友圈图文", platforms: [] as string[], target: "", scheduleMode: "立即", scheduledAt: "",
    template: null as number | null, content: "",
  });

  const handleNext = () => {
    if (step < 3) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const togglePlatform = (p: string) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p],
    }));
  };

  const insertVariable = (v: string) => {
    setForm(f => ({ ...f, content: f.content + v }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-[640px] rounded-2xl shadow-2xl overflow-hidden" style={{ background: L.surface }}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: L.border }}>
          <div>
            <div className="text-base font-semibold" style={{ color: L.text }}>新建推送任务</div>
            <div className="text-xs mt-0.5" style={{ color: L.muted }}>步骤 {step} / 3</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            style={{ color: L.muted }}>
            <X size={16} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-0 px-6 py-4" style={{ borderBottom: `1px solid ${L.borderLight}` }}>
          {[
            { n: 1, label: "基本设置" },
            { n: 2, label: "内容编辑" },
            { n: 3, label: "确认发送" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{
                    background: step >= s.n ? L.primary : L.borderLight,
                    color: step >= s.n ? "#fff" : L.muted,
                  }}>
                  {s.n}
                </div>
                <span className="text-sm" style={{ color: step >= s.n ? L.text : L.muted }}>{s.label}</span>
              </div>
              {i < 2 && <div className="w-12 h-px mx-3" style={{ background: step > s.n ? L.primary : L.borderLight }} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-5 max-h-[420px] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: L.textSec }}>任务名称</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="请输入任务名称..."
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: L.bg, border: `1px solid ${L.border}`, color: L.text }} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: L.textSec }}>推送类型</label>
                <div className="flex gap-2 flex-wrap">
                  {PUSH_TYPES.map(type => (
                    <button key={type} onClick={() => setForm(f => ({ ...f, type }))}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: form.type === type ? L.primary : L.bg,
                        color: form.type === type ? "#fff" : L.textSec,
                        border: `1px solid ${form.type === type ? L.primary : L.border}`,
                      }}>
                      {TYPE_ICONS[type]}
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: L.textSec }}>发送平台</label>
                <div className="flex gap-3">
                  {["个人微信", "企业微信"].map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.platforms.includes(p)} onChange={() => togglePlatform(p)}
                        style={{ accentColor: L.primary }} />
                      <span className="text-sm" style={{ color: L.textSec }}>{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: L.textSec }}>目标用户</label>
                <select value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: L.bg, border: `1px solid ${L.border}`, color: L.text }}>
                  <option value="">请选择目标用户群体</option>
                  {TARGET_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: L.textSec }}>发送时间</label>
                <div className="flex gap-2 mb-3">
                  {["立即", "定时"].map(mode => (
                    <button key={mode} onClick={() => setForm(f => ({ ...f, scheduleMode: mode }))}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: form.scheduleMode === mode ? L.primary : L.bg,
                        color: form.scheduleMode === mode ? "#fff" : L.textSec,
                        border: `1px solid ${form.scheduleMode === mode ? L.primary : L.border}`,
                      }}>
                      {mode === "立即" ? <><Zap size={13} className="inline mr-1" />立即发送</> : <><Calendar size={13} className="inline mr-1" />定时发送</>}
                    </button>
                  ))}
                </div>
                {form.scheduleMode === "定时" && (
                  <input type="datetime-local" value={form.scheduledAt}
                    onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: L.bg, border: `1px solid ${L.border}`, color: L.text }} />
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: L.textSec }}>选择模板（可选）</label>
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.slice(0, 4).map(tpl => (
                    <button key={tpl.id} onClick={() => { setForm(f => ({ ...f, template: tpl.id, content: tpl.preview })); }}
                      className="text-left p-3 rounded-xl transition-all hover:shadow-sm"
                      style={{
                        background: form.template === tpl.id ? L.primaryBg : L.bg,
                        border: `1.5px solid ${form.template === tpl.id ? L.primary : L.border}`,
                      }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{tpl.icon}</span>
                        <span className="text-xs font-semibold" style={{ color: L.text }}>{tpl.name}</span>
                      </div>
                      <div className="text-[11px] line-clamp-2" style={{ color: L.muted }}>{tpl.preview}</div>
                      <div className="text-[10px] mt-1" style={{ color: L.mutedLight }}>已使用 {tpl.used} 次</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: L.textSec }}>消息内容</label>
                  <div className="flex gap-1">
                    {VARIABLES.map(v => (
                      <button key={v} onClick={() => insertVariable(v)}
                        className="text-[10px] px-2 py-0.5 rounded-md border transition-colors hover:bg-gray-50"
                        style={{ border: `1px solid ${L.border}`, color: L.primary }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={5} placeholder="请输入推送消息内容..."
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ background: L.bg, border: `1px solid ${L.border}`, color: L.text }} />
                <div className="text-right text-xs mt-1" style={{ color: L.mutedLight }}>
                  {form.content.length} / 500 字
                </div>
              </div>

              {(form.type === "朋友圈图文" || form.type === "朋友圈视频") && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: L.textSec }}>
                    上传{form.type === "朋友圈视频" ? "视频" : "图片"}
                  </label>
                  <div className="border-2 border-dashed rounded-xl p-6 text-center"
                    style={{ borderColor: L.border, background: L.bg }}>
                    <Image size={28} style={{ color: L.mutedLight, margin: "0 auto 8px" }} />
                    <div className="text-sm" style={{ color: L.muted }}>点击上传或拖拽文件至此</div>
                    <div className="text-xs mt-1" style={{ color: L.mutedLight }}>
                      {form.type === "朋友圈视频" ? "支持 MP4 格式，最大 30MB" : "支持 JPG/PNG 格式，最多9张"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl p-4" style={{ background: L.bg, border: `1px solid ${L.border}` }}>
                <div className="text-sm font-semibold mb-3" style={{ color: L.text }}>内容预览</div>
                <div className="rounded-xl p-4" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ background: L.primary }}>运</div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: L.text }}>运营团队</div>
                      <div className="text-xs" style={{ color: L.muted }}>{form.type}</div>
                    </div>
                  </div>
                  <div className="text-sm leading-relaxed" style={{ color: L.textSec }}>
                    {form.content || "（暂无消息内容）"}
                  </div>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${L.border}` }}>
                <table className="w-full">
                  <tbody>
                    {[
                      { label: "任务名称", value: form.name || "（未填写）" },
                      { label: "推送类型", value: form.type },
                      { label: "发送平台", value: form.platforms.join("、") || "（未选择）" },
                      { label: "目标用户", value: form.target || "（未选择）" },
                      { label: "发送时间", value: form.scheduleMode === "立即" ? "立即发送" : form.scheduledAt || "（未设置）" },
                    ].map((row, i) => (
                      <tr key={row.label} style={{ borderTop: i > 0 ? `1px solid ${L.borderLight}` : "none" }}>
                        <td className="px-4 py-2.5 text-xs w-24" style={{ color: L.muted, background: L.bg }}>{row.label}</td>
                        <td className="px-4 py-2.5 text-sm" style={{ color: L.textSec }}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <AlertTriangle size={16} style={{ color: "#fbbf24", marginTop: 1, flexShrink: 0 }} />
                <div className="text-xs" style={{ color: "#78350f" }}>
                  请确认以上信息无误后再发送。推送一旦开始将无法中途撤回全部消息，请谨慎操作。
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: L.border }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: L.muted }}>取消</button>
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={handleBack}
                className="px-4 py-2 rounded-lg text-sm border"
                style={{ border: `1px solid ${L.border}`, color: L.textSec }}>
                上一步
              </button>
            )}
            {step < 3 ? (
              <button onClick={handleNext}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: L.primary }}>
                下一步
              </button>
            ) : (
              <button onClick={onClose}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: "#059669" }}>
                <Send size={14} /> 确认发送
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onSelect, selected }: { task: Task; onSelect: (t: Task) => void; selected: boolean }) {
  const ss = STATUS_STYLE[task.status];
  const ps = PRIORITY_STYLE[task.priority];

  return (
    <div onClick={() => onSelect(task)}
      className="rounded-xl p-5 cursor-pointer transition-all hover:shadow-md"
      style={{ background: L.surface, border: `1.5px solid ${selected ? L.primary : L.border}` }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: L.primaryBg, color: L.primary }}>
          {TYPE_ICONS[task.type] ?? <Send size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-sm font-semibold truncate" style={{ color: L.text }}>{task.name}</span>
            <StatusBadge status={task.status} />
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: ps.bg, color: ps.color }}>
              {task.priority}优先
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: L.muted }}>
            <div className="flex items-center gap-1">
              <Users size={11} />
              {task.targetLabel} · {task.targetCount}人
            </div>
            {task.platforms.length > 0 && (
              <div className="flex gap-1">
                {task.platforms.map(p => <PlatformBadge key={p} platform={p} />)}
              </div>
            )}
            {task.scheduledAt && (
              <div className="flex items-center gap-1">
                <Clock size={11} />
                {task.scheduledAt}
              </div>
            )}
            {task.reach && (
              <div className="flex items-center gap-1">
                <CheckCircle size={11} style={{ color: "#059669" }} />
                <span style={{ color: "#059669" }}>已触达 {task.reach}</span>
              </div>
            )}
            {task.clickRate && (
              <div className="flex items-center gap-1" style={{ color: L.primary }}>
                <TrendingUp size={11} style={{ display: "inline" }} />
                点击率 {task.clickRate}
              </div>
            )}
          </div>
        </div>
        {/* 中台暂无推送任务执行/回填接口，以下操作均无真实后端落地，先禁用避免"点击后假成功" */}
        <div className="flex flex-col gap-1.5">
          {task.status === "已完成" && (
            <button disabled title="接线中" className="text-xs px-3 py-1.5 rounded-lg font-medium opacity-50 cursor-not-allowed"
              style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}
              onClick={e => e.stopPropagation()}>
              查看报告
            </button>
          )}
          {task.status === "进行中" && (
            <button disabled title="接线中" className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium opacity-50 cursor-not-allowed"
              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
              onClick={e => e.stopPropagation()}>
              <Pause size={11} /> 暂停
            </button>
          )}
          {task.status === "待发送" && (
            <>
              <button disabled title="接线中" className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium text-white opacity-50 cursor-not-allowed"
                style={{ background: L.primary }}
                onClick={e => e.stopPropagation()}>
                <Send size={11} /> 立即发
              </button>
              <button disabled title="接线中" className="text-xs px-3 py-1.5 rounded-lg font-medium border opacity-50 cursor-not-allowed"
                style={{ border: `1px solid ${L.border}`, color: L.textSec }}
                onClick={e => e.stopPropagation()}>
                编辑
              </button>
            </>
          )}
          {task.status === "草稿" && (
            <button disabled title="接线中" className="text-xs px-3 py-1.5 rounded-lg font-medium border opacity-50 cursor-not-allowed"
              style={{ border: `1px solid ${L.border}`, color: L.textSec }}
              onClick={e => e.stopPropagation()}>
              编辑
            </button>
          )}
          {task.status === "已暂停" && (
            <>
              <button disabled title="接线中" className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium opacity-50 cursor-not-allowed"
                style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}
                onClick={e => e.stopPropagation()}>
                <Play size={11} /> 恢复
              </button>
              <button disabled title="接线中" className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium border opacity-50 cursor-not-allowed"
                style={{ border: `1px solid ${L.border}`, color: L.textSec }}
                onClick={e => e.stopPropagation()}>
                <Copy size={11} /> 复制
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ task, onClose }: { task: Task; onClose: () => void }) {
  const ss = STATUS_STYLE[task.status];
  return (
    <div className="w-80 flex-shrink-0 rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: L.border }}>
        <span className="text-sm font-semibold" style={{ color: L.text }}>任务详情</span>
        <button onClick={onClose} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-gray-100"
          style={{ color: L.muted }}>
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <div className="text-xs mb-1" style={{ color: L.muted }}>内容预览</div>
          <div className="rounded-xl p-3 text-sm leading-relaxed" style={{ background: L.bg, color: L.textSec }}>
            {task.content}
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: "状态", value: <StatusBadge status={task.status} /> },
            { label: "类型", value: task.type },
            { label: "目标", value: `${task.targetLabel} · ${task.targetCount}人` },
            { label: "平台", value: task.platforms.length > 0 ? task.platforms.join("、") : "未设置" },
            { label: "时间", value: task.scheduledAt ?? "立即发送" },
            ...(task.reach ? [{ label: "触达数", value: `${task.reach}人` }] : []),
            ...(task.clickRate ? [{ label: "点击率", value: task.clickRate }] : []),
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: L.muted }}>{row.label}</span>
              <div className="text-xs font-medium" style={{ color: L.textSec }}>
                {typeof row.value === "string" ? row.value : row.value}
              </div>
            </div>
          ))}
        </div>

        {/* 中台暂无推送任务执行/回填接口，以下操作均无真实后端落地，先禁用避免"点击后假成功" */}
        <div className="pt-2 space-y-2 border-t" style={{ borderColor: L.borderLight }}>
          {task.status === "已完成" && (
            <button disabled title="接线中" className="w-full py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
              style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>查看完整报告</button>
          )}
          {task.status === "进行中" && (
            <button disabled title="接线中" className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
              <Pause size={14} /> 暂停任务
            </button>
          )}
          {task.status === "待发送" && (
            <button disabled title="接线中" className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-white opacity-50 cursor-not-allowed"
              style={{ background: L.primary }}>
              <Send size={14} /> 立即发送
            </button>
          )}
          {task.status === "已暂停" && (
            <button disabled title="接线中" className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
              style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
              <Play size={14} /> 恢复任务
            </button>
          )}
          <button disabled title="接线中" className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm border opacity-50 cursor-not-allowed"
            style={{ border: `1px solid ${L.border}`, color: L.textSec }}>
            <Copy size={14} /> 复制任务
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PushTasks() {
  const [activeView, setActiveView] = useState<"任务列表" | "模板库" | "执行日志">("任务列表");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filteredTasks = TASKS.filter(t => statusFilter === "全部" || t.status === statusFilter);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: L.text }}>推送任务管理</h1>
          <p className="text-xs mt-0.5" style={{ color: L.muted }}>统一管理微信推送任务，追踪触达效果</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
            {(["任务列表", "模板库", "执行日志"] as const).map(tab => (
              <button key={tab} onClick={() => { setActiveView(tab); setSelectedTask(null); }}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: activeView === tab ? L.primary : "transparent", color: activeView === tab ? "#fff" : L.muted }}>
                {tab}
              </button>
            ))}
          </div>
          {/* 中台暂无推送任务创建/群发接口，新建流程无真实后端落地，先禁用避免"点击后假成功" */}
          <button onClick={() => setShowModal(true)} disabled title="接线中"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white opacity-50 cursor-not-allowed"
            style={{ background: L.primary }}>
            <Plus size={14} /> 新建任务
          </button>
        </div>
      </div>

      {/* 任务列表 */}
      {activeView === "任务列表" && (
        <div className="flex gap-4">
          <div className="flex-1 space-y-4">
            {/* Status filter */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: L.surface, border: `1px solid ${L.border}`, width: "fit-content" }}>
              {STATUS_FILTER.map(sf => (
                <button key={sf} onClick={() => setStatusFilter(sf)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: statusFilter === sf ? L.primary : "transparent",
                    color: statusFilter === sf ? "#fff" : L.muted,
                  }}>
                  {sf}({STATUS_COUNTS[sf]})
                </button>
              ))}
            </div>

            {/* Task cards */}
            <div className="space-y-3">
              {filteredTasks.map(task => (
                <TaskCard key={task.id} task={task}
                  selected={selectedTask?.id === task.id}
                  onSelect={t => setSelectedTask(prev => prev?.id === t.id ? null : t)} />
              ))}
              {filteredTasks.length === 0 && (
                <div className="rounded-xl p-12 text-center" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
                  <div className="text-sm" style={{ color: L.muted }}>暂无该状态的任务</div>
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selectedTask && (
            <DetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
          )}
        </div>
      )}

      {/* 模板库 */}
      {activeView === "模板库" && (
        <div className="grid grid-cols-3 gap-4">
          {/* Create template card（中台暂无模板管理接口，先禁用避免"点击后假成功"） */}
          <button disabled title="接线中" className="rounded-xl p-6 flex flex-col items-center justify-center gap-3 border-2 border-dashed opacity-50 cursor-not-allowed"
            style={{ borderColor: L.border, minHeight: 180 }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: L.primaryBg }}>
              <Plus size={20} style={{ color: L.primary }} />
            </div>
            <div className="text-sm font-medium" style={{ color: L.textSec }}>创建模板</div>
          </button>

          {TEMPLATES.map(tpl => (
            <div key={tpl.id} className="rounded-xl p-5" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{tpl.icon}</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: L.text }}>{tpl.name}</div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md mt-1 inline-block"
                    style={{ background: L.primaryBg, color: L.primary }}>{tpl.category}</span>
                </div>
              </div>
              <div className="text-xs leading-relaxed mb-4 line-clamp-3" style={{ color: L.muted }}>{tpl.preview}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: L.mutedLight }}>已使用 {tpl.used} 次</span>
                <div className="flex gap-2">
                  <button disabled title="接线中" className="text-xs px-2.5 py-1 rounded-md border opacity-50 cursor-not-allowed"
                    style={{ border: `1px solid ${L.border}`, color: L.textSec }}>编辑</button>
                  <button disabled title="接线中" className="text-xs px-2.5 py-1 rounded-md text-white opacity-50 cursor-not-allowed"
                    style={{ background: L.primary }}>使用</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 执行日志 */}
      {activeView === "执行日志" && (
        <div className="rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: L.border }}>
            <div className="text-sm font-semibold" style={{ color: L.text }}>执行日志</div>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: L.bg }}>
                {["时间", "任务名称", "微信号", "目标用户", "发送渠道", "状态"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: L.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LOGS.map((log, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${L.borderLight}` }} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: L.muted }}>{log.time}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: L.textSec }}>{log.task}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: L.muted }}>{log.account}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: L.textSec }}>{log.target}</td>
                  <td className="px-4 py-3">
                    <PlatformBadge platform={log.channel} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: log.status === "成功" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        color: log.status === "成功" ? "#34d399" : "#f87171",
                      }}>
                      {log.status === "成功"
                        ? <CheckCircle size={10} />
                        : <AlertTriangle size={10} />}
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Task Modal */}
      {showModal && <NewTaskModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
