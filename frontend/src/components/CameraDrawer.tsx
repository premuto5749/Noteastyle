"use client";

interface CameraDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: "gallery" | "video" | "camera") => void;
}

const OPTIONS = [
  {
    type: "gallery" as const,
    label: "갤러리에서 선택",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    type: "video" as const,
    label: "영상 촬영",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    type: "camera" as const,
    label: "사진 촬영",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
];

export function CameraDrawer({ isOpen, onClose, onSelect }: CameraDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[60] transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-[480px] mx-auto bg-card rounded-t-2xl shadow-xl border-t border-border pb-safe">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Options */}
          <div className="px-4 pb-4 pt-2">
            {OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => onSelect(opt.type)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-muted active:bg-muted/80 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground shrink-0">
                  {opt.icon}
                </div>
                <span className="text-base font-medium text-foreground">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
