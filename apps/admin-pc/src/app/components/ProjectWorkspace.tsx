import { LayoutDashboard } from "lucide-react";
import ComingSoon from "./ComingSoon";

export default function ProjectWorkspace() {
  return (
    <ComingSoon
      title="工作台"
      subtitle="跨项目待办与个人工作队列"
      icon={<LayoutDashboard size={26} style={{ color: "#4361ee" }} />}
      note="工作台的待办队列聚合尚未接入后端。入群分配、审批、回访等具体待办请在对应模块处理。"
    />
  );
}
