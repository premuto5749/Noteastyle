"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useShop } from "@/contexts/ShopContext";
import { useShopApi } from "@/hooks/useShopApi";
import { PageHeader } from "@/components/PageHeader";
import { type ShopMember } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  owner: "소유자",
  admin: "관리자",
  designer: "디자이너",
  assistant: "어시스턴트",
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  designer: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  assistant: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

interface Invitation {
  id: string;
  token: string;
  role: string;
  created_at: string;
  expires_at: string;
}

export default function ShopSettingsPage() {
  const router = useRouter();
  const { currentShop, refreshShops } = useShop();
  const api = useShopApi();

  // Shop info editing
  const [shopName, setShopName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Members
  const [members, setMembers] = useState<ShopMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Invitations
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>("designer");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Leave shop
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Role change / deactivate
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const isOwnerOrAdmin =
    currentShop?.role === "owner" || currentShop?.role === "admin";
  const isOwner = currentShop?.role === "owner";

  const shopId = currentShop?.shop_id;

  // Initialize shop name
  useEffect(() => {
    if (currentShop) {
      setShopName(currentShop.shop_name);
    }
  }, [currentShop]);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      const data = await api.getMembers();
      setMembers(data);
    } catch {
      // silently fail
    } finally {
      setLoadingMembers(false);
    }
  }, [api]);

  // Fetch invitations
  const fetchInvitations = useCallback(async () => {
    if (!shopId || !isOwnerOrAdmin) return;
    try {
      setLoadingInvitations(true);
      const res = await fetch(`/api/shops/${shopId}/invitations`);
      if (res.ok) {
        const data = await res.json();
        setInvitations(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingInvitations(false);
    }
  }, [shopId, isOwnerOrAdmin]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Save shop name
  const handleSaveName = async () => {
    if (!shopId || !shopName.trim()) return;
    try {
      setSavingName(true);
      const res = await fetch(`/api/shops/${shopId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: shopName.trim() }),
      });
      if (res.ok) {
        setIsEditingName(false);
        await refreshShops();
      }
    } catch {
      // silently fail
    } finally {
      setSavingName(false);
    }
  };

  // Change member role
  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!shopId) return;
    try {
      setChangingRole(memberId);
      const res = await fetch(`/api/shops/${shopId}/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        await fetchMembers();
      }
    } catch {
      // silently fail
    } finally {
      setChangingRole(null);
    }
  };

  // Deactivate member
  const handleDeactivate = async (memberId: string) => {
    if (!shopId) return;
    if (!confirm("이 멤버를 비활성화하시겠습니까?")) return;
    try {
      setDeactivating(memberId);
      const res = await fetch(`/api/shops/${shopId}/members/${memberId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchMembers();
      }
    } catch {
      // silently fail
    } finally {
      setDeactivating(null);
    }
  };

  // Create invitation
  const handleCreateInvite = async () => {
    if (!shopId) return;
    try {
      setCreatingInvite(true);
      const res = await fetch(`/api/shops/${shopId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: inviteRole }),
      });
      if (res.ok) {
        await fetchInvitations();
      }
    } catch {
      // silently fail
    } finally {
      setCreatingInvite(false);
    }
  };

  // Cancel invitation
  const handleCancelInvite = async (invitationId: string) => {
    if (!shopId) return;
    try {
      const res = await fetch(
        `/api/shops/${shopId}/invitations/${invitationId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await fetchInvitations();
      }
    } catch {
      // silently fail
    }
  };

  // Copy invite URL
  const handleCopyInviteUrl = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // fallback
      prompt("초대 링크를 복사하세요:", url);
    }
  };

  // Leave shop
  const handleLeaveShop = async () => {
    if (!shopId) return;
    try {
      setLeaving(true);
      const res = await fetch(`/api/shops/${shopId}/members/${currentShop.member_id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await refreshShops();
        router.push("/");
      }
    } catch {
      // silently fail
    } finally {
      setLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const ownerCount = members.filter((m) => m.role === "owner" && m.is_active).length;

  if (!currentShop) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">매장을 선택해주세요</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="매장 설정"
        subtitle={currentShop.shop_name}
        action={
          <button
            onClick={() => router.back()}
            className="text-sm text-muted-foreground"
          >
            뒤로
          </button>
        }
      />

      {/* Section 1: Shop Info */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          매장 정보
        </h2>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          {/* Shop name */}
          <div>
            <label className="text-xs text-muted-foreground">매장 이름</label>
            {isOwnerOrAdmin && isEditingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || !shopName.trim()}
                  className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  {savingName ? "저장 중..." : "저장"}
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setShopName(currentShop.shop_name);
                  }}
                  className="px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground"
                >
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-foreground">
                  {currentShop.shop_name}
                </span>
                {isOwnerOrAdmin && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-xs text-primary font-medium"
                  >
                    수정
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Shop type */}
          <div>
            <label className="text-xs text-muted-foreground">매장 유형</label>
            <p className="text-sm text-foreground mt-1">
              {currentShop.shop_type === "hair"
                ? "헤어"
                : currentShop.shop_type === "nail"
                  ? "네일"
                  : currentShop.shop_type === "skin"
                    ? "피부"
                    : currentShop.shop_type === "scalp"
                      ? "두피"
                      : currentShop.shop_type}
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Members List */}
      <div className="px-4 mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          멤버 ({members.filter((m) => m.is_active).length}명)
        </h2>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          {loadingMembers ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              멤버를 불러오는 중...
            </div>
          ) : members.filter((m) => m.is_active).length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              멤버가 없습니다
            </div>
          ) : (
            members
              .filter((m) => m.is_active)
              .map((member) => {
                const isSelf = member.id === currentShop.member_id;
                const isLastOwner =
                  member.role === "owner" && ownerCount <= 1;

                return (
                  <div key={member.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {member.display_name}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              ROLE_BADGE_COLORS[member.role] || ROLE_BADGE_COLORS.assistant
                            }`}
                          >
                            {ROLE_LABELS[member.role] || member.role}
                          </span>
                          {isSelf && (
                            <span className="text-xs text-muted-foreground">
                              (나)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {member.specialty && (
                            <span className="text-xs text-muted-foreground">
                              {member.specialty}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(member.joined_at).toLocaleDateString(
                              "ko-KR"
                            )}{" "}
                            가입
                          </span>
                        </div>
                      </div>

                      {/* Actions for owner/admin (not self) */}
                      {isOwnerOrAdmin && !isSelf && (
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {/* Role change dropdown */}
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(member.id, e.target.value)
                            }
                            disabled={changingRole === member.id}
                            className="text-xs px-2 py-1 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                          >
                            {isOwner && (
                              <option value="owner">
                                {ROLE_LABELS.owner}
                              </option>
                            )}
                            <option value="admin">{ROLE_LABELS.admin}</option>
                            <option value="designer">
                              {ROLE_LABELS.designer}
                            </option>
                            <option value="assistant">
                              {ROLE_LABELS.assistant}
                            </option>
                          </select>

                          {/* Deactivate button */}
                          {!isLastOwner && (
                            <button
                              onClick={() => handleDeactivate(member.id)}
                              disabled={deactivating === member.id}
                              className="text-xs px-2 py-1 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 disabled:opacity-50"
                            >
                              {deactivating === member.id
                                ? "..."
                                : "비활성화"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Section 3: Invitations (owner/admin only) */}
      {isOwnerOrAdmin && (
        <div className="px-4 mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            초대
          </h2>
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            {/* Create invitation */}
            <div>
              <p className="text-sm text-foreground font-medium mb-2">
                초대 링크 생성
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="text-sm px-3 py-2 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="designer">{ROLE_LABELS.designer}</option>
                  <option value="assistant">{ROLE_LABELS.assistant}</option>
                  {isOwner && (
                    <option value="admin">{ROLE_LABELS.admin}</option>
                  )}
                </select>
                <button
                  onClick={handleCreateInvite}
                  disabled={creatingInvite}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  {creatingInvite ? "생성 중..." : "생성"}
                </button>
              </div>
            </div>

            {/* Active invitations list */}
            {loadingInvitations ? (
              <div className="text-center text-muted-foreground text-sm py-4">
                초대 목록을 불러오는 중...
              </div>
            ) : invitations.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  활성 초대 ({invitations.length}개)
                </p>
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-background"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            ROLE_BADGE_COLORS[inv.role] ||
                            ROLE_BADGE_COLORS.assistant
                          }`}
                        >
                          {ROLE_LABELS[inv.role] || inv.role}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(inv.created_at).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate font-mono">
                        /invite/{inv.token}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <button
                        onClick={() => handleCopyInviteUrl(inv.token)}
                        className="text-xs px-2 py-1 rounded-lg border border-border text-foreground"
                      >
                        {copiedToken === inv.token ? "복사됨" : "복사"}
                      </button>
                      <button
                        onClick={() => handleCancelInvite(inv.id)}
                        className="text-xs px-2 py-1 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                활성 초대가 없습니다
              </p>
            )}
          </div>
        </div>
      )}

      {/* Section 4: Leave Shop (non-owner only) */}
      {currentShop.role !== "owner" && (
        <div className="px-4 mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            위험 구역
          </h2>
          <div className="bg-card rounded-2xl border border-border p-4">
            {!showLeaveConfirm ? (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium"
              >
                매장 탈퇴
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  정말 <strong>{currentShop.shop_name}</strong>에서
                  탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleLeaveShop}
                    disabled={leaving}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {leaving ? "탈퇴 중..." : "탈퇴 확인"}
                  </button>
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
