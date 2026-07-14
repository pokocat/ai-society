import { lazy, Suspense, useEffect, useState } from "react";
import { Landmark, Monitor, Moon, Smartphone, Sun, Zap } from "lucide-react";
import PCLayout from "./components/PCLayout";
import LoginPage from "./components/LoginPage";
import { LoadingSpinner } from "./components/shared/LoadingSpinner";
import { ProjectProvider } from "./contexts/ProjectContext";
import { ResourceProvider } from "./contexts/ResourceContext";
import { authApi, getToken } from "../api";
import type { AuthUser } from "../api/auth";

const Overview = lazy(() => import("./components/Overview"));
const AccountAssets = lazy(() => import("./components/AccountAssets"));
const WeChatManagement = lazy(() => import("./components/WeChatManagement"));
const CommunityManagement = lazy(() => import("./components/CommunityManagement"));
const GroupAssignment = lazy(() => import("./components/GroupAssignment"));
const CustomerService = lazy(() => import("./components/CustomerService"));
const EcosystemManagement = lazy(() => import("./components/EcosystemManagement"));
const ChannelFlow = lazy(() => import("./components/ChannelFlow"));
const UserOperations = lazy(() => import("./components/UserOperations"));
const Orders = lazy(() => import("./components/Orders"));
const Tickets = lazy(() => import("./components/Tickets"));
const ApprovalCenter = lazy(() => import("./components/ApprovalCenter"));
const Permissions = lazy(() => import("./components/Permissions"));
const CityBranch = lazy(() => import("./components/CityBranch"));
const ReportCenter = lazy(() => import("./components/ReportCenter"));
const Commission = lazy(() => import("./components/Commission"));
const MobileApp = lazy(() => import("./components/MobileApp"));
const JinfuMiniApp = lazy(() => import("./components/JinfuMiniApp"));
const ProjectWorkspace = lazy(() => import("./components/ProjectWorkspace"));
const ProjectIntegrations = lazy(() => import("./components/ProjectIntegrations"));
const ProjectResourceConfig = lazy(() => import("./components/ProjectResourceConfig"));
const StaffManagement = lazy(() => import("./components/StaffManagement"));

const moduleMap = {
  workspace:   ProjectWorkspace,
  integrations: ProjectIntegrations,
  resourceconfig: ProjectResourceConfig,
  staff:       StaffManagement,
  overview:    Overview,
  accounts:    AccountAssets,
  wechat:      WeChatManagement,
  community:   CommunityManagement,
  assignment:  GroupAssignment,
  cs:          CustomerService,
  channel:     ChannelFlow,
  users:       UserOperations,
  influence:   UserOperations,
  segment:     UserOperations,
  members:     UserOperations,
  pushtasks:   UserOperations,
  activities:  UserOperations,
  orders:      Orders,
  tickets:     Tickets,
  approval:    ApprovalCenter,
  permissions: Permissions,
  cities:      CityBranch,
  commission:  Commission,
  reports:     ReportCenter,
  ecosystem:   EcosystemManagement,
};

type UITheme = "dark" | "light" | "cyber";

function ModuleFallback({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? "min-h-screen" : "h-full min-h-[320px]"}`} style={{ background: "#ffffff" }}>
      <div className="flex items-center gap-2" style={{ color: "#68705a", fontSize: 11 }}><LoadingSpinner size={16} color="#b6ff00" />正在加载模块</div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<"pc" | "mobile" | "finance">(() => window.innerWidth < 768 ? "mobile" : "pc");
  const [activeModule, setActiveModule] = useState("workspace");
  const [uiTheme, setUiTheme] = useState<UITheme>(() => {
    const savedTheme = localStorage.getItem("flm-ui-theme");
    return savedTheme === "cyber" ? savedTheme : "cyber";
  });

  const [authUser, setAuthUser] = useState<AuthUser | null>(() => authApi.getStoredUser());
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());

  const changeTheme = (theme: UITheme) => {
    setUiTheme(theme);
    localStorage.setItem("flm-ui-theme", theme);
  };

  useEffect(() => {
    const navigate = (event: Event) => setActiveModule((event as CustomEvent<string>).detail);
    window.addEventListener("flm:navigate", navigate);
    return () => window.removeEventListener("flm:navigate", navigate);
  }, []);

  // 登录态失效（4030 由 api 层广播）时退回登录门
  useEffect(() => {
    const onLogout = () => { setAuthed(false); setAuthUser(null); };
    window.addEventListener("scp:logout", onLogout);
    return () => window.removeEventListener("scp:logout", onLogout);
  }, []);

  const handleLoggedIn = (user: AuthUser) => { setAuthUser(user); setAuthed(true); };
  const handleLogout = () => { authApi.logout(); window.location.reload(); };

  if (!authed) {
    return <LoginPage onLoggedIn={handleLoggedIn} />;
  }

  const ActiveComponent = moduleMap[activeModule] || Overview;
  const accentGradient = uiTheme === "cyber"
    ? "#b6ff00"
    : "linear-gradient(135deg, #4361ee, #7c3aed)";

  return (
    <ProjectProvider>
    <ResourceProvider>
    <div data-ui-theme={uiTheme} className={view === "pc" ? "w-full h-screen overflow-hidden relative" : "w-full min-h-screen overflow-x-hidden relative"} style={{ background: uiTheme === "cyber" ? "#ffffff" : "#0d1629" }}>
      {/* View switcher */}
      <div className="fixed bottom-4 right-4 max-sm:top-3 max-sm:bottom-auto max-sm:right-auto max-sm:left-1/2 max-sm:-translate-x-1/2 z-50 flex gap-1 p-1 rounded-xl shadow-lg" style={{ background: uiTheme === "cyber" ? "#ffffff" : "#131f35", border: uiTheme === "cyber" ? "1px solid rgba(5,8,5,0.14)" : "1px solid rgba(255,255,255,0.1)" }}>
        {view === "pc" && (
          <>
            <button title="深色紫蓝" aria-label="切换为深色紫蓝风格" onClick={() => changeTheme("dark")} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: uiTheme === "dark" ? "#4361ee" : "transparent", color: uiTheme === "dark" ? "#fff" : "#64748b" }}><Moon size={13} /></button>
            <button title="白底专业" aria-label="切换为白底专业风格" onClick={() => changeTheme("light")} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: uiTheme === "light" ? "#4361ee" : "transparent", color: uiTheme === "light" ? "#fff" : "#64748b" }}><Sun size={13} /></button>
            <button title="纯白黄绿黑" aria-label="切换为纯白黄绿黑极简风格" onClick={() => changeTheme("cyber")} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: uiTheme === "cyber" ? "#b6ff00" : "transparent", color: uiTheme === "cyber" ? "#050805" : "#64748b" }}><Zap size={13} /></button>
            <span className="w-px my-1 mx-0.5" style={{ background: uiTheme === "cyber" ? "rgba(5,8,5,0.14)" : "rgba(255,255,255,0.12)" }} />
          </>
        )}
        <button
          onClick={() => setView("pc")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all font-medium"
          style={{ background: view === "pc" ? accentGradient : "transparent", color: view === "pc" && uiTheme === "cyber" ? "#050805" : view === "pc" ? "white" : "#64748b" }}
        >
          <Monitor size={13} /> PC 后台
        </button>
        <button
          onClick={() => setView("mobile")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all font-medium"
          style={{ background: view === "mobile" ? accentGradient : "transparent", color: view === "mobile" && uiTheme === "cyber" ? "#050805" : view === "mobile" ? "white" : "#64748b" }}
        >
          <Smartphone size={13} /> 会员小程序
        </button>
        <button
          onClick={() => setView("finance")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all font-medium"
          style={{ background: view === "finance" ? accentGradient : "transparent", color: view === "finance" && uiTheme === "cyber" ? "#050805" : view === "finance" ? "white" : "#64748b" }}
        >
          <Landmark size={13} /> 金服小程序
        </button>
      </div>

      {view === "pc" ? (
        <PCLayout activeModule={activeModule} onModuleChange={setActiveModule} user={authUser} onLogout={handleLogout}>
          <Suspense fallback={<ModuleFallback />}><ActiveComponent /></Suspense>
        </PCLayout>
      ) : view === "mobile" ? (
        <Suspense fallback={<ModuleFallback fullScreen />}><MobileApp /></Suspense>
      ) : (
        <Suspense fallback={<ModuleFallback fullScreen />}><JinfuMiniApp /></Suspense>
      )}
    </div>
    </ResourceProvider>
    </ProjectProvider>
  );
}
