import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  isDark?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, isDark = true }: EmptyStateProps) {
  const text = isDark ? "#e2e8f0" : "#111827";
  const muted = isDark ? "#64748b" : "#6b7280";
  const primary = "#4361ee";
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div 
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: `${primary}15` }}
      >
        <Icon size={28} style={{ color: primary }} />
      </div>
      <h3 className="font-semibold mb-1" style={{ color: text, fontSize: "15px" }}>{title}</h3>
      <p style={{ color: muted, fontSize: "13px", maxWidth: "320px" }}>{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: `linear-gradient(135deg, ${primary}, #7c3aed)` }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
