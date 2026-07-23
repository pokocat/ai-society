import { Shield } from "lucide-react";
import ComingSoon from "./ComingSoon";

export default function Permissions() {
  return (
    <ComingSoon
      title="权限设置"
      subtitle="角色与模块权限矩阵"
      icon={<Shield size={26} style={{ color: "#4361ee" }} />}
      note="权限以服务端强制为准（每个业务端点带 @Perm 校验，角色与权限位存 role / role_permission 表）。管理台的可视化权限矩阵编辑尚未接线，接入前不展示演示矩阵。"
    />
  );
}
