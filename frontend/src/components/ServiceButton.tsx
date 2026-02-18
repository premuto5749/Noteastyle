"use client";

interface ServiceButtonProps {
  label: string;
  icon: string;
  selected?: boolean;
  onClick: () => void;
}

export function ServiceButton({ label, icon, selected, onClick }: ServiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 transition-all active:scale-95 min-w-[80px] ${
        selected
          ? "border-ring bg-muted text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-input"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
