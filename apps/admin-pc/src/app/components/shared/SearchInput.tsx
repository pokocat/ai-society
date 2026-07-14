import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isDark?: boolean;
}

export function SearchInput({ value, onChange, placeholder = "搜索...", isDark = true }: SearchInputProps) {
  const bg = isDark ? "#1a2640" : "#f9fafb";
  const border = isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb";
  const text = isDark ? "#e2e8f0" : "#111827";
  const muted = isDark ? "#64748b" : "#6b7280";
  
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <Search size={14} style={{ color: muted, flexShrink: 0 }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm"
        style={{ color: text }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
        >
          <X size={14} style={{ color: muted }} />
        </button>
      )}
    </div>
  );
}
