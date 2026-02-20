"use client";

interface ProductButtonProps {
  brand: string;
  code?: string;
  color?: string;
  selected?: boolean;
  onClick: () => void;
}

export function ProductButton({ brand, code, color, selected, onClick }: ProductButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all active:scale-95 ${
        selected
          ? "border-ring bg-muted"
          : "border-border bg-card hover:border-input"
      }`}
    >
      {color && (
        <span
          className="w-4 h-4 rounded-full border border-border"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="text-sm font-medium">{brand}</span>
      {code && <span className="text-xs text-muted-foreground">{code}</span>}
    </button>
  );
}
