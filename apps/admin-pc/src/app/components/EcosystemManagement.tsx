import { Globe } from "lucide-react";
import ComingSoon from "./ComingSoon";

export default function EcosystemManagement() {
  return (
    <ComingSoon
      title="生态管理"
      subtitle="跨项目的生态资源与协同视图"
      icon={<Globe size={26} style={{ color: "#4361ee" }} />}
      note="生态域聚合视图尚未接入后端；各项目的资源与社群请在对应模块查看。"
    />
  );
}
