import { Send } from "lucide-react";
import ComingSoon from "./ComingSoon";

export default function PushTasks() {
  return (
    <ComingSoon
      title="推送任务"
      subtitle="群发 / 欢迎语等企微内容派发"
      icon={<Send size={26} style={{ color: "#4361ee" }} />}
      note="内容派发域已在后端就位（欢迎语/群发派发器），管理台侧接线待接入；接入前不展示演示数据。"
    />
  );
}
