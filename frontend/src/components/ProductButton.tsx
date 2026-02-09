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
          ? "border-[var(--primary)] bg-purple-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      {color && (
        <span
          className="w-4 h-4 rounded-full border border-gray-200"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="text-sm font-medium">{brand}</span>
      {code && <span className="text-xs text-gray-500">{code}</span>}
    </button>
  );
}
