"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: "super_admin" | "env_admin" | "admin" | null;
}

function getRoleBadge(role: AdminUser["role"]) {
  switch (role) {
    case "super_admin":
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
          슈퍼관리자
        </span>
      );
    case "env_admin":
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
          환경변수 관리자
        </span>
      );
    case "admin":
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
          관리자
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
          일반 사용자
        </span>
      );
  }
}

export default function AdminPage() {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push("/");
    }
  }, [isLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      } else {
        setError("사용자 목록을 불러오지 못했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
    setLoadingUsers(false);
  };

  const handleToggleAdmin = async (targetUser: AdminUser) => {
    const action = targetUser.role === "admin" ? "revoke" : "grant";
    const confirmMsg =
      action === "grant"
        ? `${targetUser.email}에게 관리자 권한을 부여하시겠습니까?`
        : `${targetUser.email}의 관리자 권한을 해제하시겠습니까?`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(targetUser.id);
    setError("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: targetUser.id, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "작업에 실패했습니다.");
      } else {
        await fetchUsers();
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }

    setActionLoading(null);
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-subtle text-sm">확인 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto">
      <PageHeader title="관리자 설정" backHref="/" />

      <div className="px-4 pb-24">
        {/* 관리 메뉴 */}
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            관리 메뉴
          </h3>
          <div className="space-y-2">
            <a
              href="/admin/site-settings"
              className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎨</span>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    사이트 설정 관리
                  </div>
                  <div className="text-xs text-muted-foreground">
                    로고, 파비콘, 테마 색상, SEO 설정
                  </div>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
            <a
              href="/admin/face-models"
              className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    기본 Face Model 관리
                  </div>
                  <div className="text-xs text-muted-foreground">
                    모든 매장에 제공되는 기본 AI 얼굴 모델
                  </div>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          </div>
        </section>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* User List */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            사용자 관리
          </h3>

          {loadingUsers ? (
            <div className="text-center py-8 text-subtle text-sm">
              불러오는 중...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-subtle text-sm">
              등록된 사용자가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const isCurrentUser = u.id === user?.id;
                const isProtected =
                  u.role === "super_admin" || u.role === "env_admin";
                const canToggle = !isCurrentUser && !isProtected;

                return (
                  <div
                    key={u.id}
                    className="p-3 bg-card border border-border rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {u.email}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs text-subtle">(나)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {getRoleBadge(u.role)}
                        {u.last_sign_in_at && (
                          <span className="text-xs text-subtle">
                            마지막 로그인:{" "}
                            {new Date(u.last_sign_in_at).toLocaleDateString(
                              "ko-KR"
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {canToggle && (
                      <button
                        onClick={() => handleToggleAdmin(u)}
                        disabled={actionLoading === u.id}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                          u.role === "admin"
                            ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {actionLoading === u.id
                          ? "..."
                          : u.role === "admin"
                            ? "해제"
                            : "관리자 지정"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
