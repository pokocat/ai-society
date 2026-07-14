interface BadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({ label, variant = "default", size = "md", dot = false }: BadgeProps) {
  const variants = {
    default: { bg: "rgba(100,116,139,0.15)", color: "#64748b", dotColor: "#64748b" },
    success: { bg: "rgba(16,185,129,0.15)", color: "#10b981", dotColor: "#10b981" },
    warning: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", dotColor: "#f59e0b" },
    danger: { bg: "rgba(239,68,68,0.15)", color: "#ef4444", dotColor: "#ef4444" },
    info: { bg: "rgba(67,97,238,0.15)", color: "#4361ee", dotColor: "#4361ee" },
    purple: { bg: "rgba(139,92,246,0.15)", color: "#8b5cf6", dotColor: "#8b5cf6" },
  };
  
  const style = variants[variant];
  const fontSize = size === "sm" ? "10px" : "11px";
  const padding = size === "sm" ? "2px 6px" : "3px 8px";
  
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium"
      style={{
        background: style.bg,
        color: style.color,
        fontSize,
        padding,
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: style.dotColor }}
        />
      )}
      {label}
    </span>
  );
}
