"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getReceivedProposals,
  respondToProposal,
  type TalentProposal,
} from "@/lib/api";
import { useShop } from "@/contexts/ShopContext";
import { useShopApi } from "@/hooks/useShopApi";

type ViewTab = "received" | "sent";

function statusLabel(status: TalentProposal["status"]) {
  switch (status) {
    case "pending": return { text: "대기 중", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" };
    case "accepted": return { text: "수락됨", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
    case "declined": return { text: "거절됨", cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" };
    case "expired": return { text: "만료됨", cls: "bg-muted text-muted-foreground" };
  }
}

function timeRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "만료됨";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}일 ${hours}시간 남음`;
  return `${hours}시간 남음`;
}

export default function ProposalsPage() {
  const router = useRouter();
  const { currentShop } = useShop();
  const { api: shopApi, isReady: shopApiReady } = useShopApi();

  const isOwnerOrAdmin = currentShop?.role === "owner" || currentShop?.role === "admin";

  const [tab, setTab] = useState<ViewTab>(isOwnerOrAdmin ? "sent" : "received");
  const [received, setReceived] = useState<TalentProposal[]>([]);
  const [sent, setSent] = useState<TalentProposal[]>([]);
  const [credits, setCredits] = useState<{ total_credits: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [recv] = await Promise.all([getReceivedProposals()]);
        setReceived(recv);

        if (isOwnerOrAdmin && shopApiReady) {
          const [sentData, creditsData] = await Promise.all([
            shopApi.getSentProposals(),
            shopApi.getProposalCredits(),
          ]);
          setSent(sentData);
          setCredits(creditsData);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOwnerOrAdmin, shopApiReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRespond = async (proposalId: string, action: "accept" | "decline") => {
    setRespondingId(proposalId);
    try {
      const updated = await respondToProposal(proposalId, action);
      setReceived((prev) => prev.map((p) => (p.id === proposalId ? updated : p)));
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">제안 관리</h2>
          {credits && (
            <p className="text-xs text-muted-foreground mt-0.5">
              잔여 크레딧: <span className="font-medium text-foreground">{credits.total_credits}건</span>
            </p>
          )}
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={() => router.push("/explore/talent")}
            className="text-xs text-accent font-medium"
          >
            인재풀 보기
          </button>
        )}
      </div>

      {/* Tabs */}
      {isOwnerOrAdmin && (
        <div className="flex border-b border-border mx-4">
          <button
            onClick={() => setTab("sent")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === "sent" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            발신함 {sent.length > 0 && `(${sent.length})`}
          </button>
          <button
            onClick={() => setTab("received")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === "received" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            수신함 {received.length > 0 && `(${received.length})`}
          </button>
        </div>
      )}

      <div className="px-4 pt-3 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tab === "sent" ? (
          sent.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-xl border border-border">
              <p className="text-sm text-muted-foreground">보낸 제안이 없습니다</p>
              <button
                onClick={() => router.push("/explore/talent")}
                className="text-xs text-accent mt-2 block mx-auto"
              >
                인재풀에서 디자이너 찾기
              </button>
            </div>
          ) : (
            sent.map((proposal) => {
              const badge = statusLabel(proposal.status);
              const toMember = proposal.to_member as { id: string; display_name: string; specialty: string | null; profile_photo_url?: string | null } | undefined;
              return (
                <div key={proposal.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {toMember?.display_name ?? "알 수 없음"}
                      </p>
                      {toMember?.specialty && (
                        <p className="text-xs text-muted-foreground">{toMember.specialty}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{proposal.position} · {proposal.salary_range}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </div>
                  {proposal.status === "pending" && (
                    <p className="text-[11px] text-subtle">{timeRemaining(proposal.expires_at)}</p>
                  )}
                </div>
              );
            })
          )
        ) : (
          received.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-xl border border-border">
              <p className="text-sm text-muted-foreground">받은 제안이 없습니다</p>
              <p className="text-xs text-subtle mt-1">프로필에서 제안 수신을 활성화하면 제안을 받을 수 있어요</p>
            </div>
          ) : (
            received.map((proposal) => {
              const badge = statusLabel(proposal.status);
              const isExpanded = expandedId === proposal.id;
              return (
                <div key={proposal.id} className="bg-card rounded-xl border border-border overflow-hidden">
                  <button
                    className="w-full p-4 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {proposal.from_shop?.name ?? "알 수 없음"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {proposal.position} · {proposal.salary_range}
                        </p>
                        {proposal.status === "pending" && (
                          <p className="text-[11px] text-subtle mt-0.5">{timeRemaining(proposal.expires_at)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                          {badge.text}
                        </span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`text-subtle transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t border-border">
                      {proposal.benefits && (
                        <div className="pt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">복리후생</p>
                          <p className="text-sm text-foreground">{proposal.benefits}</p>
                        </div>
                      )}
                      {proposal.shop_intro && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">매장 소개</p>
                          <p className="text-sm text-foreground">{proposal.shop_intro}</p>
                        </div>
                      )}
                      {proposal.message && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">메시지</p>
                          <p className="text-sm text-foreground">{proposal.message}</p>
                        </div>
                      )}

                      {proposal.status === "pending" && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleRespond(proposal.id, "decline")}
                            disabled={respondingId === proposal.id}
                            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground disabled:opacity-50"
                          >
                            거절
                          </button>
                          <button
                            onClick={() => handleRespond(proposal.id, "accept")}
                            disabled={respondingId === proposal.id}
                            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50"
                          >
                            {respondingId === proposal.id ? "처리 중..." : "수락"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
