import { ReactNode } from "react";

interface Column {
  key: string;
  label: string;
  width?: number | string;
  align?: "left" | "center" | "right";
  render?: (value: any, row: any) => ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  selectedRow?: any;
  isDark?: boolean;
  maxHeight?: string;
}

export function DataTable({
  columns,
  data,
  onRowClick,
  selectedRow,
  isDark = true,
  maxHeight = "auto",
}: DataTableProps) {
  const bg = isDark ? "#131f35" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb";
  const headerBg = isDark ? "#0a1220" : "#f9fafb";
  const text = isDark ? "#e2e8f0" : "#111827";
  const muted = isDark ? "#64748b" : "#6b7280";
  const hoverBg = isDark ? "#1a2640" : "#f3f4f6";
  const selectedBg = isDark ? "rgba(67,97,238,0.15)" : "#eef2ff";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead style={{ background: headerBg, position: "sticky", top: 0, zIndex: 10 }}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{
                    color: muted,
                    textAlign: col.align || "left",
                    width: col.width,
                    borderBottom: `1px solid ${border}`,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => {
              const isSelected = selectedRow && selectedRow === row;
              return (
                <tr
                  key={rowIndex}
                  onClick={() => onRowClick?.(row)}
                  className="transition-colors"
                  style={{
                    background: isSelected
                      ? selectedBg
                      : rowIndex % 2 === 0
                      ? bg
                      : isDark
                      ? "#0f1829"
                      : "#f9fafb",
                    cursor: onRowClick ? "pointer" : "default",
                    borderBottom: `1px solid ${border}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && onRowClick) {
                      e.currentTarget.style.background = hoverBg;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background =
                        rowIndex % 2 === 0
                          ? bg
                          : isDark
                          ? "#0f1829"
                          : "#f9fafb";
                    }
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-3 py-2.5 text-sm"
                      style={{
                        color: text,
                        textAlign: col.align || "left",
                      }}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
