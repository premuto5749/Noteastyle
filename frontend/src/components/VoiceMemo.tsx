"use client";

import { useState, useRef, useCallback, useEffect, type ChangeEvent } from "react";

interface VoiceMemoProps {
  onResult: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export function VoiceMemo({ onResult, disabled }: VoiceMemoProps) {
  const [mode, setMode] = useState<"record" | "upload">("record");
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup on unmount: stop timer, recorder, and media stream
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine best supported audio format
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/mp4";
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        if (blob.size === 0) {
          alert("녹음된 오디오가 비어 있습니다. 다시 시도해주세요.");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        onResult(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(1000);
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      alert("마이크 권한이 필요합니다.");
    }
  }, [onResult]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
    setDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    chunksRef.current = [];
  }, []);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert("오디오 파일은 25MB 이하만 가능합니다.");
      return;
    }
    setFileName(file.name);
    onResult(file); // File extends Blob
  }, [onResult]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Mode tabs */}
      <div className="flex bg-muted rounded-xl p-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => setMode("record")}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            mode === "record"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          녹음
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            mode === "upload"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          파일 선택
        </button>
      </div>

      {/* Record mode */}
      {mode === "record" && (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={recording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              recording
                ? "bg-red-500 animate-pulse shadow-lg shadow-red-900/30"
                : "bg-primary"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {recording ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>
          <span className="text-sm text-muted-foreground">
            {recording ? `녹음 중 ${formatTime(duration)}` : "음성으로 기록하기"}
          </span>
          {recording && (
            <button
              type="button"
              onClick={cancelRecording}
              className="text-xs text-destructive underline"
            >
              취소
            </button>
          )}
        </>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <div className="flex flex-col items-center gap-3 w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full py-4 border-2 border-dashed border-border rounded-xl flex flex-col items-center gap-2 transition-colors hover:border-accent/50 ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-xs text-muted-foreground">
              {fileName || "오디오 파일을 선택하세요"}
            </span>
          </button>
          <p className="text-[10px] text-subtle">
            mp3, wav, m4a, webm 등 (최대 25MB)
          </p>
        </div>
      )}
    </div>
  );
}
