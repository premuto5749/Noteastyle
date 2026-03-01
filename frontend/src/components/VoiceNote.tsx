"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useShopApi } from "@/hooks/useShopApi";
import { useShop } from "@/contexts/ShopContext";
import {
  transcribeVoiceMemo,
  type Reservation,
  type VoiceMemoResult,
  type KeyComment,
} from "@/lib/api";

type VoiceNoteState = "idle" | "recording" | "processing" | "confirming" | "saved";

const CHIP_COLORS: Record<string, string> = {
  area: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  product: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  time: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  caution: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  result: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

interface VoiceNoteProps {
  reservation?: Reservation;
  treatmentId?: string;
  onComplete: (result: { treatmentId: string }) => void;
  onClose: () => void;
}

export function VoiceNote({
  reservation,
  treatmentId,
  onComplete,
  onClose,
}: VoiceNoteProps) {
  const { api } = useShopApi();
  const { currentShop } = useShop();
  const [state, setState] = useState<VoiceNoteState>("idle");
  const [duration, setDuration] = useState(0);
  const [aiResult, setAiResult] = useState<VoiceMemoResult | null>(null);
  const [editedResult, setEditedResult] = useState<VoiceMemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const audioBlobRef = useRef<Blob | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Auto-close after saved
  useEffect(() => {
    if (state !== "saved") return;
    const timer = setTimeout(() => {
      onClose();
    }, 1500);
    return () => clearTimeout(timer);
  }, [state, onClose]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        stream.getTracks().forEach((t) => t.stop());

        if (blob.size === 0) {
          setError("녹음된 오디오가 비어 있습니다. 다시 시도해주세요.");
          setState("idle");
          return;
        }

        audioBlobRef.current = blob;
        setState("processing");

        try {
          const result = await transcribeVoiceMemo(blob, currentShop?.shop_id);
          setAiResult(result);
          setEditedResult({ ...result });
          setState("confirming");
        } catch (err) {
          setError(err instanceof Error ? err.message : "AI 분석에 실패했습니다.");
          setState("idle");
        }
      };

      mediaRecorder.start(1000);
      setState("recording");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setError("마이크 권한이 필요합니다.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    chunksRef.current = [];
    setState("idle");
  }, []);

  const handleRetry = useCallback(() => {
    setAiResult(null);
    setEditedResult(null);
    setError(null);
    setState("idle");
  }, []);

  const handleSave = useCallback(async () => {
    if (!editedResult || saving) return;
    setSaving(true);
    setError(null);

    try {
      let tid = treatmentId;

      // If opened from a reservation, start treatment first
      if (!tid && reservation) {
        const result = await api.startTreatmentFromReservation(reservation.id);
        tid = result.treatment.id;
      }

      // If no treatment yet (no reservation, no treatmentId), create customer + treatment
      if (!tid) {
        let customerId: string | undefined;
        if (editedResult.customer_name) {
          const customer = await api.createCustomer({ name: editedResult.customer_name });
          customerId = customer.id;
        }
        if (!customerId) {
          setError("고객 정보가 필요합니다.");
          setSaving(false);
          return;
        }
        const treatment = await api.createTreatment({
          customer_id: customerId,
          service_type: editedResult.service_type || "other",
          service_detail: undefined,
          products_used: editedResult.products_used || undefined,
          area: editedResult.area || undefined,
          duration_minutes: editedResult.duration_minutes || undefined,
          satisfaction: editedResult.satisfaction || undefined,
          customer_notes: editedResult.summary || undefined,
          next_visit_recommendation: editedResult.next_visit_recommendation || undefined,
        });
        tid = treatment.id;
      }

      // Update treatment with AI data
      if (tid) {
        await api.updateTreatment(tid, {
          ...(editedResult.service_type ? { service_type: editedResult.service_type } : {}),
          ...(editedResult.products_used ? { products_used: editedResult.products_used } : {}),
          ...(editedResult.area ? { area: editedResult.area } : {}),
          ...(editedResult.duration_minutes ? { duration_minutes: editedResult.duration_minutes } : {}),
          ...(editedResult.satisfaction ? { satisfaction: editedResult.satisfaction } : {}),
          ...(editedResult.summary ? { customer_notes: editedResult.summary } : {}),
          ...(editedResult.summary ? { ai_summary: editedResult.summary } : {}),
          ...(editedResult.next_visit_recommendation ? { next_visit_recommendation: editedResult.next_visit_recommendation } : {}),
        });
      }

      setState("saved");
      if (tid) {
        onComplete({ treatmentId: tid });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [editedResult, saving, treatmentId, reservation, api, onComplete]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const updateField = (field: keyof VoiceMemoResult, value: string | null) => {
    if (!editedResult) return;
    setEditedResult({ ...editedResult, [field]: value });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          onClick={onClose}
          className="text-muted-foreground text-sm"
        >
          닫기
        </button>
        <h2 className="text-sm font-bold text-foreground">보이스 노트</h2>
        <div className="w-10" />
      </div>

      {/* Context info */}
      {reservation && (
        <div className="px-4 py-2 bg-surface text-xs text-muted-foreground border-b border-border">
          {reservation.customer?.name} · {reservation.service_type || "시술"} · {reservation.scheduled_time?.slice(0, 5)}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Error banner */}
        {error && (
          <div className="w-full mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        {/* ===== IDLE ===== */}
        {state === "idle" && (
          <div className="flex flex-col items-center gap-6">
            <button
              onClick={startRecording}
              className="w-24 h-24 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform shadow-lg"
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <p className="text-muted-foreground text-sm">탭하여 녹음 시작</p>
          </div>
        )}

        {/* ===== RECORDING ===== */}
        {state === "recording" && (
          <div className="flex flex-col items-center gap-6">
            <button
              onClick={stopRecording}
              className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center active:scale-95 transition-transform shadow-lg animate-pulse"
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
            <div className="text-center">
              <p className="text-2xl font-mono font-semibold text-foreground">{formatTime(duration)}</p>
              <p className="text-muted-foreground text-sm mt-1">탭하여 완료</p>
            </div>
            <button
              onClick={cancelRecording}
              className="text-sm text-destructive underline"
            >
              취소
            </button>
          </div>
        )}

        {/* ===== PROCESSING ===== */}
        {state === "processing" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">AI가 음성을 분석하고 있어요...</p>
          </div>
        )}

        {/* ===== CONFIRMING ===== */}
        {state === "confirming" && editedResult && (
          <div className="w-full max-w-md space-y-4 overflow-y-auto max-h-[60vh]">
            <h3 className="text-sm font-bold text-foreground">AI 분석 결과</h3>

            {/* Customer name */}
            {!treatmentId && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">고객명</label>
                <input
                  type="text"
                  value={editedResult.customer_name || ""}
                  onChange={(e) => updateField("customer_name", e.target.value || null)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground"
                  placeholder="고객명"
                />
              </div>
            )}

            {/* Service type */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">시술 종류</label>
              <input
                type="text"
                value={editedResult.service_type || ""}
                onChange={(e) => updateField("service_type", e.target.value || null)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground"
                placeholder="커트, 염색, 펌 등"
              />
            </div>

            {/* Products */}
            {editedResult.products_used && editedResult.products_used.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">사용 제품</label>
                <div className="flex flex-wrap gap-1">
                  {editedResult.products_used.map((p, i) => (
                    <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                      {p.brand} {p.code}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Area */}
            {editedResult.area && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">시술 부위</label>
                <input
                  type="text"
                  value={editedResult.area || ""}
                  onChange={(e) => updateField("area", e.target.value || null)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground"
                />
              </div>
            )}

            {/* Summary/Notes */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">메모</label>
              <textarea
                value={editedResult.summary || ""}
                onChange={(e) => updateField("summary", e.target.value || null)}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground resize-none"
                placeholder="메모"
              />
            </div>

            {/* AI Key Comments (Chips) */}
            {editedResult.key_comments && editedResult.key_comments.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground block mb-2">핵심 코멘트</label>
                <div className="flex flex-wrap gap-2">
                  {editedResult.key_comments.map((comment, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded-full ${CHIP_COLORS[comment.category] || "bg-muted text-muted-foreground"}`}
                    >
                      {comment.text}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-subtle mt-1">
                  저장 후 사진 위에 배치할 수 있습니다
                </p>
              </div>
            )}

            {/* Next visit */}
            {editedResult.next_visit_recommendation && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">다음 방문 추천</label>
                <input
                  type="text"
                  value={editedResult.next_visit_recommendation || ""}
                  onChange={(e) => updateField("next_visit_recommendation", e.target.value || null)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground"
                />
              </div>
            )}
          </div>
        )}

        {/* ===== SAVED ===== */}
        {state === "saved" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-foreground font-semibold">기록 완료!</p>
          </div>
        )}
      </div>

      {/* Bottom actions for confirming state */}
      {state === "confirming" && (
        <div className="px-4 py-4 border-t border-border flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 py-3 border border-border text-muted-foreground rounded-xl text-sm font-medium active:bg-muted"
          >
            다시 녹음
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium active:opacity-80 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      )}
    </div>
  );
}
