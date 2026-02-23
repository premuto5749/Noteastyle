"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useShop } from "@/contexts/ShopContext";

interface InvitationInfo {
  shop_name: string;
  shop_type: string;
  role: string;
  expires_at: string;
}

const SHOP_TYPE_LABELS: Record<string, string> = {
  hair: "헤어샵",
  nail: "네일샵",
  skin: "피부관리",
  scalp: "두피관리",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "소유자",
  admin: "관리자",
  designer: "디자이너",
  assistant: "어시스턴트",
};

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { refreshShops } = useShop();

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [error, setError] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);

  // Fetch invitation info on mount
  useEffect(() => {
    if (!token) return;

    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        if (res.status === 410) {
          setError("이 초대 링크는 만료되었습니다.");
          return;
        }
        if (res.status === 404) {
          setError("유효하지 않은 초대 링크입니다.");
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error || "초대 정보를 불러오는데 실패했습니다.");
          return;
        }
        const data: InvitationInfo = await res.json();
        setInvitation(data);
      } catch {
        setError("초대 정보를 불러오는데 실패했습니다.");
      } finally {
        setIsLoadingInvite(false);
      }
    }

    fetchInvitation();
  }, [token]);

  // Handle login redirect (unauthenticated user)
  const handleLoginRedirect = () => {
    localStorage.setItem("pending_invite_token", token);
    router.push("/login");
  };

  // Handle accept invitation (authenticated user)
  const handleAccept = async () => {
    setError("");
    setIsAccepting(true);

    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      });

      if (res.status === 409) {
        setError("이미 이 매장의 멤버입니다.");
        setIsAccepting(false);
        return;
      }
      if (res.status === 410) {
        setError("이 초대 링크는 만료되었습니다.");
        setIsAccepting(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "초대 수락에 실패했습니다.");
        setIsAccepting(false);
        return;
      }

      await refreshShops();
      router.push("/");
    } catch {
      setError("초대 수락에 실패했습니다.");
      setIsAccepting(false);
    }
  };

  // Loading state
  if (isLoadingInvite || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-subtle text-sm">초대 정보를 불러오는 중...</div>
      </div>
    );
  }

  // Error state (invalid/expired invitation)
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-destructive"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              초대 오류
            </h2>
            <p className="text-sm text-subtle mb-6">{error}</p>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 bg-primary text-primary-foreground rounded-full font-bold text-sm active:scale-95 transition-transform"
            >
              로그인 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Invitation loaded successfully
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            note-a-style
          </h1>
        </div>

        {/* Invitation Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          {/* Invitation icon */}
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-accent/10 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>

          <h2 className="text-lg font-bold text-foreground text-center mb-1">
            매장 초대
          </h2>
          <p className="text-sm text-subtle text-center mb-6">
            매장에 참여하도록 초대되었습니다
          </p>

          {/* Invitation details */}
          {invitation && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between py-3 px-4 bg-surface rounded-xl">
                <span className="text-sm text-subtle">매장</span>
                <span className="text-sm font-semibold text-foreground">
                  {invitation.shop_name}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-surface rounded-xl">
                <span className="text-sm text-subtle">업종</span>
                <span className="text-sm font-semibold text-foreground">
                  {SHOP_TYPE_LABELS[invitation.shop_type] ||
                    invitation.shop_type}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-surface rounded-xl">
                <span className="text-sm text-subtle">역할</span>
                <span className="text-sm font-semibold text-foreground">
                  {ROLE_LABELS[invitation.role] || invitation.role}
                </span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Action button */}
          {user ? (
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-full font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
            >
              {isAccepting ? "참여 중..." : "매장 참여하기"}
            </button>
          ) : (
            <button
              onClick={handleLoginRedirect}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-full font-bold text-sm active:scale-95 transition-transform"
            >
              로그인 / 회원가입
            </button>
          )}

          {/* Hint for unauthenticated users */}
          {!user && (
            <p className="text-xs text-subtle text-center mt-4">
              로그인 후 자동으로 매장에 참여할 수 있습니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
