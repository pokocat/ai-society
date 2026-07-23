import { Plug } from "lucide-react";
import ComingSoon from "./ComingSoon";

export default function ProjectIntegrations() {
  return (
    <ComingSoon
      title="项目接入中心"
      subtitle="外部项目系统的对接与同步来源"
      icon={<Plug size={26} style={{ color: "#4361ee" }} />}
      note="项目接入配置的管理台视图尚未接线（后端已有 project_integration 定义）；接入前不展示演示数据。"
    />
  );
}
