import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquarePlus, Play, Radio, RefreshCw, Send, Square, Video, XCircle } from "lucide-react";
import { ApiError, contentApi } from "../../api";
import type { BroadcastPlan, CourseSession, WelcomeTemplate } from "../../api/content";
import { useProject } from "../contexts/ProjectContext";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640",
  border: "rgba(255,255,255,0.07)", primary: "#4361ee",
  text: "#e2e8f0", textSec: "#94a3b8", muted: "#64748b",
  success: "#22c55e", warning: "#f2b600", danger: "#ff4d4f",
};

const bcStatusColor: Record<string, string> = {
  草稿: L.muted, 待派发: L.warning, 派发中: L.primary, 已完成: L.success, 已取消: L.muted,
};
const courseStatusColor: Record<string, string> = {
  已排期: L.warning, 直播中: L.danger, 已结束: L.success, 已取消: L.muted,
};

interface Toast { text: string; kind: "success" | "error"; }

/**
 * 内容运营中心（M3a §4.4）：入群欢迎语（企微唯一全自动出站）/ 群发排期（半自动：
 * 派发→群主客户端确认→回填，每群每天≤1条）/ 讲课排期（企微群直播，回放3年）。
 * 页面如实标注半自动环节，不伪装全自动。
 */
export default function ContentCenter() {
  const { currentProject } = useProject();
  const [tab, setTab] = useState<"welcome" | "broadcast" | "course">("broadcast");
  const [welcomes, setWelcomes] = useState<WelcomeTemplate[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastPlan[]>([]);
  const [courses, setCourses] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [welcomeForm, setWelcomeForm] = useState({ name: "", scopeGroupType: "", text: "" });
  const [bcForm, setBcForm] = useState({ title: "", text: "", groupType: "" });
  const [courseForm, setCourseForm] = useState({ title: "", speaker: "", scheduledAt: "" });
  const [showForm, setShowForm] = useState(false);

  const pushToast = useCallback((text: string, kind: "success" | "error" = "success") => setToast({ text, kind }), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, b, c] = await Promise.all([
        contentApi.listWelcomeTemplates(), contentApi.listBroadcasts(), contentApi.listCourses(),
      ]);
      setWelcomes(w); setBroadcasts(b); setCourses(c);
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "加载内容数据失败", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { void load(); }, [load]);

  const run = useCallback(async (key: string, fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(key);
    try {
      await fn();
      pushToast(okMsg);
      await load();
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "操作失败", "error");
    } finally {
      setBusy(null);
    }
  }, [load, pushToast]);

  const input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`px-2 py-1.5 rounded text-xs outline-none ${props.className ?? ""}`}
      style={{ background: L.bg, color: L.text, border: `1px solid ${L.border}` }} />
  );

  return (
    <div className="p-6 min-h-full" style={{ background: L.bg }}>
      <div className="mb-5">
        <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: L.text }}>
          <Radio size={18} style={{ color: L.primary }} /> 内容运营中心
        </h1>
        <p className="text-xs mt-1" style={{ color: L.muted }}>
          欢迎语=全自动 · 群发=<b>半自动（群主客户端确认，每群每天≤1条）</b> · 讲课=企微群直播（回放3年）
        </p>
      </div>

      <div className="flex gap-1 mb-4">
        {([["welcome", "入群欢迎语"], ["broadcast", "群发排期"], ["course", "讲课排期"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k); setShowForm(false); }}
            className="px-4 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: tab === k ? L.primary : L.surface, color: tab === k ? "#fff" : L.textSec }}>
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: L.primary, color: "#fff" }}>
          <MessageSquarePlus size={13} /> 新建
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-3 rounded-xl flex gap-2 items-end flex-wrap"
          style={{ background: L.surface2, border: `1px solid ${L.border}` }}>
          {tab === "welcome" && (
            <>
              {input({ placeholder: "模板名称", value: welcomeForm.name, onChange: e => setWelcomeForm(f => ({ ...f, name: e.target.value })), className: "w-40" })}
              {input({ placeholder: "群类型（空=全部）", value: welcomeForm.scopeGroupType, onChange: e => setWelcomeForm(f => ({ ...f, scopeGroupType: e.target.value })), className: "w-36" })}
              {input({ placeholder: "欢迎文本（%NICKNAME% 可用）", value: welcomeForm.text, onChange: e => setWelcomeForm(f => ({ ...f, text: e.target.value })), className: "flex-1 min-w-[240px]" })}
              <button
                onClick={() => run("createWelcome",
                  () => contentApi.createWelcomeTemplate({
                    name: welcomeForm.name,
                    scopeGroupType: welcomeForm.scopeGroupType || undefined,
                    projectId: currentProject.id,
                    content: { text: welcomeForm.text },
                  }).then(() => setShowForm(false)), "欢迎语模板已创建")}
                disabled={!welcomeForm.name || !welcomeForm.text || busy === "createWelcome"}
                className="px-3 py-1.5 rounded text-xs font-medium"
                style={{ background: L.primary, color: "#fff", opacity: !welcomeForm.name || !welcomeForm.text ? 0.5 : 1 }}>
                创建
              </button>
            </>
          )}
          {tab === "broadcast" && (
            <>
              {input({ placeholder: "群发标题", value: bcForm.title, onChange: e => setBcForm(f => ({ ...f, title: e.target.value })), className: "w-48" })}
              {input({ placeholder: "内容文本（≤4000字）", value: bcForm.text, onChange: e => setBcForm(f => ({ ...f, text: e.target.value })), className: "flex-1 min-w-[240px]" })}
              {input({ placeholder: "圈选群类型（空=全部）", value: bcForm.groupType, onChange: e => setBcForm(f => ({ ...f, groupType: e.target.value })), className: "w-40" })}
              <button
                onClick={() => run("createBc",
                  () => contentApi.createBroadcast({
                    title: bcForm.title,
                    content: { text: bcForm.text },
                    targetScope: {
                      projectId: currentProject.id,
                      ...(bcForm.groupType ? { groupType: bcForm.groupType } : {}),
                    },
                  }).then(() => setShowForm(false)), "群发排期已创建（待派发）")}
                disabled={!bcForm.title || !bcForm.text || busy === "createBc"}
                className="px-3 py-1.5 rounded text-xs font-medium"
                style={{ background: L.primary, color: "#fff", opacity: !bcForm.title || !bcForm.text ? 0.5 : 1 }}>
                创建
              </button>
            </>
          )}
          {tab === "course" && (
            <>
              {input({ placeholder: "课程标题", value: courseForm.title, onChange: e => setCourseForm(f => ({ ...f, title: e.target.value })), className: "w-48" })}
              {input({ placeholder: "讲师", value: courseForm.speaker, onChange: e => setCourseForm(f => ({ ...f, speaker: e.target.value })), className: "w-32" })}
              {input({ type: "datetime-local", value: courseForm.scheduledAt, onChange: e => setCourseForm(f => ({ ...f, scheduledAt: e.target.value })), className: "w-52" })}
              <button
                onClick={() => run("createCourse",
                  () => contentApi.createCourse({
                    title: courseForm.title,
                    speaker: courseForm.speaker || undefined,
                    scheduledAt: new Date(courseForm.scheduledAt).toISOString(),
                    groupScope: { projectId: currentProject.id },
                  }).then(() => setShowForm(false)), "讲课已排期")}
                disabled={!courseForm.title || !courseForm.scheduledAt || busy === "createCourse"}
                className="px-3 py-1.5 rounded text-xs font-medium"
                style={{ background: L.primary, color: "#fff", opacity: !courseForm.title || !courseForm.scheduledAt ? 0.5 : 1 }}>
                排期
              </button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs py-16 justify-center" style={{ color: L.muted }}>
          <Loader2 size={14} className="animate-spin" /> 加载中
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
          {tab === "welcome" && (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: L.muted, borderBottom: `1px solid ${L.border}` }}>
                  {["名称", "范围", "内容", "素材库", "状态", "操作"].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {welcomes.map(w => (
                  <tr key={w.id} style={{ color: L.textSec, borderBottom: `1px solid ${L.border}` }}>
                    <td className="px-4 py-2.5" style={{ color: L.text }}>{w.name}</td>
                    <td className="px-4 py-2.5">{w.scope_group_type ?? "全部群类型"}{w.project_name ? ` · ${w.project_name}` : ""}</td>
                    <td className="px-4 py-2.5 max-w-[320px] truncate">{String((w.content as { text?: string })?.text ?? "")}</td>
                    <td className="px-4 py-2.5 font-mono">{w.wecom_material_id ?? "未同步"}</td>
                    <td className="px-4 py-2.5">
                      <span style={{ color: w.status === "启用" ? L.success : L.muted }}>{w.status}</span>
                    </td>
                    <td className="px-4 py-2.5 flex gap-1.5">
                      <button
                        onClick={() => run(`wsync-${w.id}`, () => contentApi.syncWelcomeTemplate(w.id), "已同步企微素材库（Mock）")}
                        disabled={w.status !== "启用" || busy === `wsync-${w.id}`}
                        className="px-2 py-1 rounded text-xs"
                        style={{ background: "rgba(67,97,238,0.15)", color: L.primary, opacity: w.status !== "启用" ? 0.4 : 1 }}>
                        同步素材库
                      </button>
                      <button
                        onClick={() => run(`wtoggle-${w.id}`,
                          () => contentApi.patchWelcomeTemplate(w.id, { status: w.status === "启用" ? "停用" : "启用" }),
                          w.status === "启用" ? "已停用" : "已启用")}
                        className="px-2 py-1 rounded text-xs"
                        style={{ background: L.surface2, color: L.muted, border: `1px solid ${L.border}` }}>
                        {w.status === "启用" ? "停用" : "启用"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === "broadcast" && (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: L.muted, borderBottom: `1px solid ${L.border}` }}>
                  {["标题", "圈选", "状态", "群主确认进度", "派发时间", "操作"].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {broadcasts.map(b => (
                  <tr key={b.id} style={{ color: L.textSec, borderBottom: `1px solid ${L.border}` }}>
                    <td className="px-4 py-2.5" style={{ color: L.text }}>{b.title}</td>
                    <td className="px-4 py-2.5">{b.target_scope ? Object.entries(b.target_scope).map(([k, v]) => `${k}=${v}`).join(" ") : "全部"}</td>
                    <td className="px-4 py-2.5"><span style={{ color: bcStatusColor[b.status] ?? L.textSec }}>{b.status}</span></td>
                    <td className="px-4 py-2.5">
                      {b.task_total > 0 ? `${b.task_done}/${b.task_total} 群已确认` : "—"}
                      {b.status === "派发中" && <span style={{ color: L.warning }}>（待群主客户端确认）</span>}
                    </td>
                    <td className="px-4 py-2.5">{b.dispatched_at ? new Date(b.dispatched_at).toLocaleString("zh-CN") : "—"}</td>
                    <td className="px-4 py-2.5 flex gap-1.5">
                      {(b.status === "待派发" || b.status === "草稿") && (
                        <button
                          onClick={() => run(`dispatch-${b.id}`, async () => {
                            const r = await contentApi.dispatchBroadcast(b.id);
                            pushToast(`已派发 ${r.taskCreated} 群${r.skippedByQuota ? `，${r.skippedByQuota} 群因当日额度跳过` : ""}`);
                          }, "派发完成")}
                          disabled={busy === `dispatch-${b.id}`}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: "rgba(34,197,94,0.15)", color: L.success }}>
                          <Send size={11} /> 派发
                        </button>
                      )}
                      {b.status === "派发中" && (
                        <button
                          onClick={() => run(`bcrefresh-${b.id}`, () => contentApi.refreshBroadcast(b.id), "状态已刷新")}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: L.surface2, color: L.textSec, border: `1px solid ${L.border}` }}>
                          <RefreshCw size={11} /> 刷新进度
                        </button>
                      )}
                      {b.status !== "已完成" && b.status !== "已取消" && (
                        <button
                          onClick={() => run(`bccancel-${b.id}`, () => contentApi.cancelBroadcast(b.id, "运营取消"), "已取消")}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: "rgba(255,77,79,0.12)", color: L.danger }}>
                          <XCircle size={11} /> 取消
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === "course" && (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: L.muted, borderBottom: `1px solid ${L.border}` }}>
                  {["课程", "讲师", "开播时间", "状态", "直播/回放", "操作"].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.map(c => (
                  <tr key={c.id} style={{ color: L.textSec, borderBottom: `1px solid ${L.border}` }}>
                    <td className="px-4 py-2.5" style={{ color: L.text }}>{c.title}</td>
                    <td className="px-4 py-2.5">{c.speaker ?? "—"}</td>
                    <td className="px-4 py-2.5">{new Date(c.scheduled_at).toLocaleString("zh-CN")}</td>
                    <td className="px-4 py-2.5"><span style={{ color: courseStatusColor[c.status] ?? L.textSec }}>{c.status}</span></td>
                    <td className="px-4 py-2.5 font-mono max-w-[260px] truncate">
                      {c.replay_url ?? c.live_id ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 flex gap-1.5">
                      {c.status === "已排期" && (
                        <button
                          onClick={() => run(`live-${c.id}`, () => contentApi.startLive(c.id), "已开播（企微群直播·Mock）")}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: "rgba(255,77,79,0.15)", color: L.danger }}>
                          <Play size={11} /> 开播
                        </button>
                      )}
                      {c.status === "直播中" && (
                        <button
                          onClick={() => run(`finish-${c.id}`, () => contentApi.finishCourse(c.id), "已结课·回放已回填")}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: "rgba(34,197,94,0.15)", color: L.success }}>
                          <Square size={11} /> 结课
                        </button>
                      )}
                      {c.replay_url && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ color: L.primary }}>
                          <Video size={11} /> 回放 3 年有效
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-xs font-medium z-50"
          style={{ background: toast.kind === "success" ? L.success : L.danger, color: "#fff" }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
