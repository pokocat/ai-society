import { LucideIcon } from "lucide-react";

interface QuickAction {
  icon: LucideIcon;
  label: string;
  count?: number;
  color: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  isDark?: boolean;
}

export function QuickActions({ actions, title = "快捷操作", isDark = false }: QuickActionsProps) {
  const bg = isDark ? "#131f35" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb";
  const text = isDark ? "#e2e8f0" : "#111827";
  const muted = isDark ? "#64748b" : "#6b7280";

  return (
    <div className="rounded-xl p-4" style={{ background: bg, border: `1px solid ${border}` }}>
      <h3 className="text-sm font-semibold mb-3" style={{ color: text }}>{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all group"
              style={{
                background: isDark ? "#1a2640" : "#f9fafb",
                border: `1px solid ${border}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = isDark
                  ? `0 4px 12px ${action.color}20`
                  : "0 4px 12px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = action.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = border;
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center relative"
                style={{ background: `${action.color}15` }}
              >
                <Icon size={18} style={{ color: action.color }} />
                {action.count !== undefined && action.count > 0 && (
                  <div
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white"
                    style={{ background: action.color, fontSize: "9px" }}
                  >
                    {action.count > 99 ? "99+" : action.count}
                  </div>
                )}
              </div>
              <span className="text-xs font-medium" style={{ color: muted }}>
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
