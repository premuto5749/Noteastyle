"use client";

import { useState } from "react";
import { useShopApi } from "@/hooks/useShopApi";

const POSITION_OPTIONS = [
  "디자이너",
  "실장",
  "원장",
  "스텝",
  "인턴",
  "프리랜서",
  "기타",
];

interface ProposalModalProps {
  memberId: string;
  memberName: string;
  remainingCredits: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProposalModal({
  memberId,
  memberName,
  remainingCredits,
  onClose,
  onSuccess,
}: ProposalModalProps) {
  const { api, isReady } = useShopApi();
  const [position, setPosition] = useState(POSITION_OPTIONS[0]);
  const [salaryRange, setSalaryRange] = useState("");
  const [benefits, setBenefits] = useState("");
  const [shopIntro, setShopIntro] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (remainingCredits < 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
        <div className="bg-card w-full max-w-[480px] rounded-t-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-foreground">크레딧 부족</h3>
          <p className="text-sm text-muted-foreground">
            제안 크레딧이 부족합니다. 문의를 통해 추가 크레딧을 받으세요.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-muted text-muted-foreground rounded-xl text-sm font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!isReady || !salaryRange.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.sendProposal({
        to_member_id: memberId,
        position,
        salary_range: salaryRange.trim(),
        benefits: benefits.trim() || undefined,
        shop_intro: shopIntro.trim() || undefined,
        message: message.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "제안 전송에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-card w-full max-w-[480px] rounded-t-2xl overflow-y-auto max-h-[90vh]">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">
              {memberName}님에게 제안 보내기
            </h3>
            <button onClick={onClose} className="p-1 text-muted-foreground">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            잔여 크레딧: <span className="font-medium text-foreground">{remainingCredits}건</span>
            &nbsp;· 제안 전송 시 1크레딧 차감
          </p>

          {/* Position */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">포지션 *</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground"
            >
              {POSITION_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Salary range */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">급여 범위 *</label>
            <input
              type="text"
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="예: 월 300~400만원"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
            />
          </div>

          {/* Benefits */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">복리후생 (선택)</label>
            <textarea
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              placeholder="예: 4대보험, 퇴직금, 재료비 지원"
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring resize-none"
            />
          </div>

          {/* Shop intro */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">매장 소개 (선택)</label>
            <textarea
              value={shopIntro}
              onChange={(e) => setShopIntro(e.target.value)}
              placeholder="매장 분위기, 규모, 특징 등을 소개해주세요"
              rows={3}
              maxLength={1000}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring resize-none"
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">자유 메시지 (선택)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="추가로 전달하고 싶은 내용을 적어주세요"
              rows={2}
              maxLength={1000}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <div className="flex gap-2 pt-1 pb-safe">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl text-sm font-medium"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !salaryRange.trim()}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "전송 중..." : "제안 보내기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
