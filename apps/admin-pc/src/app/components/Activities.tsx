import { CalendarDays } from "lucide-react";
import ComingSoon from "./ComingSoon";

export default function Activities() {
  return (
    <ComingSoon
      title="活动运营"
      subtitle="社群活动的创建、报名与核销"
      icon={<CalendarDays size={26} style={{ color: "#4361ee" }} />}
      note="活动域接口落地后，此处将展示真实的活动列表、报名数据与转化归因。"
    />
  );
}
