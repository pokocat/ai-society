import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { projectsApi, ApiError } from "../../api";
import type { ProjectRow } from "../../api/projects";

export type ProjectStatus = "connected" | "warning" | "configuring";

export interface ProjectItem {
  id: string;
  code: string;
  name: string;
  shortName: string;
  category: string;
  status: ProjectStatus;
  statusText: string;
  accent: string;
  apiType: string;
  endpoint: string;
  lastSync: string;
  users: number;
  groups: number;
  wechatAccounts: number;
  employees: number;
}

/** 加载中/接口失败时用于占位，保证 currentProject 永不为 undefined（消费组件零改动） */
const SENTINEL_PROJECT: ProjectItem = {
  id: "",
  code: "",
  name: "加载中…",
  shortName: "加载中",
  category: "",
  status: "configuring",
  statusText: "加载中",
  accent: "#b6ff00",
  apiType: "",
  endpoint: "",
  lastSync: "—",
  users: 0,
  groups: 0,
  wechatAccounts: 0,
  employees: 0,
};

/** ISO 时间 → 相对时间文案 */
function formatRelative(iso: string | null): string {
  if (!iso) return "尚未同步";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "尚未同步";
  const diff = Date.now() - t;
  if (diff < 60_000) return "刚刚";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(t).toLocaleDateString("zh-CN");
}

/** 后端中文状态 → UI 三态 */
function mapStatus(status: string): { status: ProjectStatus; statusText: string } {
  if (status === "运行中") return { status: "connected", statusText: "运行正常" };
  if (["配置中", "筹备中", "待发布"].includes(status)) {
    return { status: "configuring", statusText: "配置中" };
  }
  // 暂停 | 已结束 | 已归档 | 其他 → warning，statusText 保留原状态文案
  return { status: "warning", statusText: status };
}

function toProjectItem(row: ProjectRow): ProjectItem {
  const s = mapStatus(row.status);
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    shortName: row.short_name,
    category: row.category,
    status: s.status,
    statusText: s.statusText,
    accent: row.accent,
    apiType: row.api_type ?? "",
    endpoint: row.endpoint ?? "待填写",
    lastSync: formatRelative(row.last_sync_at),
    users: row.member_count,
    groups: row.group_count,
    wechatAccounts: row.account_count,
    employees: 0,
  };
}

interface ProjectContextValue {
  projects: ProjectItem[];
  currentProject: ProjectItem;
  currentProjectId: string;
  setCurrentProjectId: (id: string) => void;
  syncProject: (id: string) => void;
  addProject: (project: Omit<ProjectItem, "id">) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const rows = await projectsApi.listProjects();
      const items = rows.map(toProjectItem);
      setProjects(items);
      setCurrentProjectId(prev => (prev && items.some(p => p.id === prev) ? prev : items[0]?.id ?? ""));
    } catch (err) {
      const msg = err instanceof ApiError ? `${err.code} ${err.message}` : String(err);
      console.error("[ProjectContext] 加载项目列表失败：", msg);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const currentProject = projects.find(p => p.id === currentProjectId) ?? projects[0] ?? SENTINEL_PROJECT;

  const syncProject = useCallback((id: string) => {
    if (!id) return;
    projectsApi
      .syncProject(id)
      .then(() => reload())
      .catch(err => {
        const msg = err instanceof ApiError ? `${err.code} ${err.message}` : String(err);
        console.error("[ProjectContext] 同步项目失败：", msg);
      });
  }, [reload]);

  // 接入向导（M2）尚未接线：仅保留本地占位行为，不落库
  const addProject = useCallback((project: Omit<ProjectItem, "id">) => {
    console.warn("[ProjectContext] addProject 尚未接入后端（接入向导 M2），当前仅本地占位。");
    const id = `${project.code.toLowerCase() || "draft"}-${Date.now()}`;
    setProjects(items => [...items, { ...project, id }]);
    setCurrentProjectId(id);
  }, []);

  const value = useMemo(() => ({
    projects,
    currentProject,
    currentProjectId: currentProject.id,
    setCurrentProjectId,
    syncProject,
    addProject,
  }), [projects, currentProject, syncProject, addProject]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: "#ffffff" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center animate-pulse" style={{ background: "#b6ff00" }} />
          <div style={{ color: "#68705a", fontSize: 12 }}>正在加载项目上下文…</div>
        </div>
      </div>
    );
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProject must be used within ProjectProvider");
  return context;
}
