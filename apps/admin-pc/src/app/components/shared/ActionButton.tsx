import { LucideIcon } from "lucide-react";
import { useState } from "react";

interface ActionButtonProps {
  icon?: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  isDark?: boolean;
}

export function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  isDark = true
}: ActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const sizeStyles = {
    sm: { padding: "6px 12px", fontSize: "12px", iconSize: 12 },
    md: { padding: "8px 16px", fontSize: "13px", iconSize: 14 },
    lg: { padding: "10px 20px", fontSize: "14px", iconSize: 16 },
  };
  
  const variantStyles = {
    primary: {
      background: "linear-gradient(135deg, #4361ee, #7c3aed)",
      color: "#ffffff",
      hoverShadow: "0 4px 16px rgba(67,97,238,0.4)",
    },
    secondary: {
      background: isDark ? "#1a2640" : "#f3f4f6",
      color: isDark ? "#94a3b8" : "#374151",
      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
      hoverShadow: isDark ? "0 4px 16px rgba(255,255,255,0.05)" : "0 4px 16px rgba(0,0,0,0.08)",
    },
    ghost: {
      background: "transparent",
      color: isDark ? "#94a3b8" : "#6b7280",
      hoverShadow: "none",
    },
    danger: {
      background: "linear-gradient(135deg, #ef4444, #dc2626)",
      color: "#ffffff",
      hoverShadow: "0 4px 16px rgba(239,68,68,0.4)",
    },
  };
  
  const style = variantStyles[variant];
  const currentSize = sizeStyles[size];
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="rounded-lg font-medium transition-all inline-flex items-center gap-2 justify-center"
      style={{
        padding: currentSize.padding,
        fontSize: currentSize.fontSize,
        background: style.background,
        color: style.color,
        border: style.border || "none",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        boxShadow: isHovered && !disabled && !loading ? style.hoverShadow : "none",
        transform: isHovered && !disabled && !loading ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      {loading ? (
        <div
          className="animate-spin rounded-full border-2 border-transparent"
          style={{
            width: currentSize.iconSize,
            height: currentSize.iconSize,
            borderTopColor: "currentColor",
            borderRightColor: "currentColor",
          }}
        />
      ) : (
        Icon && <Icon size={currentSize.iconSize} />
      )}
      {label}
    </button>
  );
}
