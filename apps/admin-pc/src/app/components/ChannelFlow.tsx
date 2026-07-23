import { Radio, Link2 } from "lucide-react";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.07)",
  text: "#e2e8f0", textSec: "#94a3b8", muted: "#64748b", primary: "#4361ee",
};

/**
 * 渠道流量绑定。
 * 后端暂无渠道域接口（渠道来源目前仅作为会员档案上的 source_channel 字段随进线记录）。
 * 未接线前展示诚实空态，不再渲染虚构的渠道/投放数据。
 */
export default function ChannelFlow() {
  return (
    <div className="p-5 h-full flex flex-col gap-3" style={{ background: L.bg }}>
      <div>
        <h1 className="font-semibold" style={{ color: L.text, fontSize: 18 }}>渠道流量绑定</h1>
        <p className="mt-1" style={{ color: L.muted, fontSize: 11 }}>投放渠道与进线来源的绑定归因</p>
      </div>

      <div className="flex-1 rounded-md flex items-center justify-center" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="max-w-[420px] text-center px-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(67,97,238,0.14)" }}>
            <Radio size={26} style={{ color: L.primary }} />
          </div>
          <div className="mt-4 font-semibold" style={{ color: L.text, fontSize: 15 }}>渠道域数据接入中</div>
          <p className="mt-2 leading-relaxed" style={{ color: L.textSec, fontSize: 11 }}>
            该模块的渠道绑定与投放归因尚未接入后端。当前会员的来源渠道以档案上的
            <strong style={{ color: L.text }}> source_channel </strong>字段随进线记录，可在会员档案中查看。
          </p>
          <div className="mt-5 px-3 py-2.5 rounded-md flex items-center gap-2.5 text-left" style={{ background: L.surface2, border: `1px solid ${L.border}` }}>
            <Link2 size={15} style={{ color: L.textSec }} />
            <div style={{ color: L.muted, fontSize: 9 }}>渠道域接口落地后，此处将展示真实的渠道列表、进线量与转化归因。</div>
          </div>
        </div>
      </div>
    </div>
  );
}
