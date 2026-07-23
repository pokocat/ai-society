import { BarChart3 } from "lucide-react";
import ComingSoon from "./ComingSoon";

export default function ReportCenter() {
  return (
    <ComingSoon
      title="报表中心"
      subtitle="经营报表与数据看板"
      icon={<BarChart3 size={26} style={{ color: "#4361ee" }} />}
      note="报表域尚未接入后端聚合。经营总览已有实时关键指标；完整报表接口落地后在此展示。"
    />
  );
}
