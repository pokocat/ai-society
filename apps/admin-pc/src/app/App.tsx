import { lazy, Suspense, useEffect, useState } from "react";
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
const ProjectWorkspace = lazy(() => import("./components/ProjectWorkspace"));
const ProjectIntegrations = lazy(() => import("./components/ProjectIntegrations"));
const ProjectResourceConfig = lazy(() => import("./components/ProjectResourceConfig"));
const StaffManagement = lazy(() => import("./components/StaffManagement"));
const RiskCenter = lazy(() => import("./components/RiskCenter"));
const MembershipCenter = lazy(() => import("./components/MembershipCenter"));
const ContentCenter = lazy(() => import("./components/ContentCenter"));
const AgentOverview = lazy(() => import("./components/AgentOverview"));

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
  risk:        RiskCenter,
  membership:  MembershipCenter,
  content:     ContentCenter,
  agents:      AgentOverview,
};

function ModuleFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[320px]" style={{ background: "#ffffff" }}>
      <div className="flex items-center gap-2" style={{ color: "#68705a", fontSize: 11 }}><LoadingSpinner size={16} color="#b6ff00" />正在加载模块</div>
    </div>
  );
}

export default function App() {
  const [activeModule, setActiveModule] = useState("workspace");
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => authApi.getStoredUser());
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());

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

  return (
    <ProjectProvider>
    <ResourceProvider>
    <div data-ui-theme="cyber" className="w-full h-screen overflow-hidden relative" style={{ background: "#ffffff" }}>
      <PCLayout activeModule={activeModule} onModuleChange={setActiveModule} user={authUser} onLogout={handleLogout}>
        <Suspense fallback={<ModuleFallback />}><ActiveComponent /></Suspense>
      </PCLayout>
    </div>
    </ResourceProvider>
    </ProjectProvider>
  );
}
