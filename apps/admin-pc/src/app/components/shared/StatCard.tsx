import { LucideIcon, ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaDirection?: "up" | "down";
  icon?: LucideIcon;
  color?: string;
  subtitle?: string;
  isDark?: boolean;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  delta,
  deltaDirection = "up",
  icon: Icon,
  color = "#4361ee",
  subtitle,
  isDark = true,
  onClick
}: StatCardProps) {
  const bg = isDark ? "#131f35" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb";
  const text = isDark ? "#e2e8f0" : "#111827";
  const muted = isDark ? "#64748b" : "#6b7280";
  
  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden transition-all cursor-pointer group"
      style={{ 
        background: bg, 
        border: `1px solid ${border}`,
        transform: "translateY(0)",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = isDark 
          ? `0 8px 24px ${color}20` 
          : "0 8px 24px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Glow effect */}
      <div 
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 -translate-y-8 translate-x-8 transition-opacity group-hover:opacity-30" 
        style={{ background: color, filter: "blur(30px)" }} 
      />
      
      <div className="relative z-10">
        {Icon && (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${color}15` }}>
            <Icon size={20} style={{ color }} />
          </div>
        )}
        <div style={{ color: muted, fontSize: "12px", marginBottom: "4px" }}>{label}</div>
        <div className="font-bold" style={{ color: color, fontSize: "24px", marginBottom: "4px" }}>{value}</div>
        
        <div className="flex items-center gap-2">
          {delta && (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ 
              color: deltaDirection === "up" ? "#10b981" : "#ef4444" 
            }}>
              {deltaDirection === "up" ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {delta}
            </span>
          )}
          {subtitle && (
            <span style={{ color: muted, fontSize: "11px" }}>{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
}
