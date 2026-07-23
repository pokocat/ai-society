import { ReactNode } from "react";
import { Construction } from "lucide-react";

const L = {
  bg: "#0d1629", surface: "#131f35", surface2: "#1a2640", border: "rgba(255,255,255,0.07)",
  text: "#e2e8f0", textSec: "#94a3b8", muted: "#64748b", primary: "#4361ee",
};

/**
 * 诚实空态：某模块的后端域尚未接入时统一展示，避免渲染任何虚构演示数据。
 * 不是"加载失败"，而是明确告诉运营"该能力在规划中"。
 */
export default function ComingSoon({ title, subtitle, note, icon }: {
  title: string;
  subtitle: string;
  note?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="p-5 h-full flex flex-col gap-3" style={{ background: L.bg }}>
      <div>
        <h1 className="font-semibold" style={{ color: L.text, fontSize: 18 }}>{title}</h1>
        <p className="mt-1" style={{ color: L.muted, fontSize: 11 }}>{subtitle}</p>
      </div>
      <div className="flex-1 rounded-md flex items-center justify-center" style={{ background: L.surface, border: `1px solid ${L.border}` }}>
        <div className="max-w-[440px] text-center px-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(67,97,238,0.14)" }}>
            {icon ?? <Construction size={26} style={{ color: L.primary }} />}
          </div>
          <div className="mt-4 font-semibold" style={{ color: L.text, fontSize: 15 }}>该模块建设中</div>
          <p className="mt-2 leading-relaxed" style={{ color: L.textSec, fontSize: 11 }}>
            此功能的后端数据域尚未接入，为避免展示虚构数据，暂以空态呈现。接口落地后此处将展示真实数据。
          </p>
          {note && (
            <div className="mt-4 px-3 py-2.5 rounded-md text-left" style={{ background: L.surface2, border: `1px solid ${L.border}` }}>
              <div style={{ color: L.muted, fontSize: 9 }}>{note}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
