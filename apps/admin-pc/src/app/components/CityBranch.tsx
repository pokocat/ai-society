import { MapPin } from "lucide-react";
import ComingSoon from "./ComingSoon";

export default function CityBranch() {
  return (
    <ComingSoon
      title="城市分站"
      subtitle="城市合伙人分站的运营与数据"
      icon={<MapPin size={26} style={{ color: "#4361ee" }} />}
      note="城市分站域接口落地后，此处将展示真实的分站列表、区域业绩与合伙人数据。"
    />
  );
}
