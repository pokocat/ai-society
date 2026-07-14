interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export function LoadingSpinner({ size = 20, color = "#4361ee" }: LoadingSpinnerProps) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-transparent"
      style={{
        width: size,
        height: size,
        borderTopColor: color,
        borderRightColor: color,
      }}
    />
  );
}

export function LoadingCard({ isDark = false }: { isDark?: boolean }) {
  const bg = isDark ? "#131f35" : "#ffffff";
  const shimmer = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  
  return (
    <div className="rounded-xl p-4 animate-pulse" style={{ background: bg }}>
      <div className="h-4 rounded" style={{ background: shimmer, width: "60%" }} />
      <div className="h-8 rounded mt-3" style={{ background: shimmer, width: "40%" }} />
      <div className="h-3 rounded mt-3" style={{ background: shimmer, width: "80%" }} />
    </div>
  );
}
