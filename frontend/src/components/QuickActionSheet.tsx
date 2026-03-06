"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACTIONS = [
  {
    label: "예약 등록",
    description: "새 예약을 생성합니다",
    href: "/reservation",
    icon: CalendarPlusIcon,
  },
  {
    label: "시술 기록",
    description: "시술 내용을 기록합니다",
    href: "/treatments/new",
    icon: FileTextIcon,
  },
  {
    label: "고객 등록",
    description: "새 고객을 추가합니다",
    href: "/customers?add=true",
    icon: UserPlusIcon,
  },
];

export function QuickActionSheet({ isOpen, onClose }: QuickActionSheetProps) {
  const router = useRouter();

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleAction = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-3 mb-20 space-y-2">
          {/* Action list */}
          <div className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-xl">
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                빠른 등록
              </p>
            </div>
            {ACTIONS.map((action, i) => (
              <button
                key={action.href}
                onClick={() => handleAction(action.href)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted ${
                  i < ACTIONS.length - 1 ? "border-b border-border/30" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <action.icon />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {action.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Cancel button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-card rounded-2xl text-sm font-semibold text-muted-foreground border border-border/50 shadow-xl active:bg-muted transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </>
  );
}

function CalendarPlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M12 14v4" />
      <path d="M10 16h4" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}
