import { ReactNode, useState } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  isDark?: boolean;
}

export function Tooltip({ content, children, placement = "top", isDark = true }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  
  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };
  
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap pointer-events-none animate-in fade-in duration-150 ${positions[placement]}`}
          style={{
            background: isDark ? "#1e2d47" : "#374151",
            color: "#ffffff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
