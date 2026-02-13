"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface CapturedMedia {
  blob: Blob;
  type: "photo" | "video";
  thumbnailBlob?: Blob;
  durationSeconds?: number;
  previewUrl: string;
  thumbnailUrl?: string;
}

interface MediaCaptureProps {
  mode: "photo" | "video";
  onCapture: (media: CapturedMedia) => void;
  onClose: () => void;
}

export function MediaCapture({ mode, onCapture, onClose }: MediaCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);

  const MAX_VIDEO_DURATION = 60;

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    // Stop previous stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: mode === "video",
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
      setError(null);
    } catch {
      setError("카메라 권한이 필요합니다. 브라우저 설정을 확인해주세요.");
    }
  }, [mode]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  const captureFrame = useCallback((): Blob | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const binary = atob(dataUrl.split(",")[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: "image/jpeg" });
  }, []);

  const takePhoto = useCallback(() => {
    const blob = captureFrame();
    if (!blob) return;

    const previewUrl = URL.createObjectURL(blob);
    onCapture({ blob, type: "photo", previewUrl });
  }, [captureFrame, onCapture]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    // Capture first frame as thumbnail
    const thumbnailBlob = captureFrame();

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const videoBlob = new Blob(chunksRef.current, { type: mimeType });
      if (videoBlob.size === 0) return;

      const previewUrl = URL.createObjectURL(videoBlob);
      const thumbnailUrl = thumbnailBlob ? URL.createObjectURL(thumbnailBlob) : undefined;
      onCapture({
        blob: videoBlob,
        type: "video",
        thumbnailBlob: thumbnailBlob || undefined,
        durationSeconds: duration,
        previewUrl,
        thumbnailUrl,
      });
      setRecording(false);
      setDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recorder.start(1000);
    setRecording(true);
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((d) => {
        if (d + 1 >= MAX_VIDEO_DURATION) {
          mediaRecorderRef.current?.stop();
          return d + 1;
        }
        return d + 1;
      });
    }, 1000);
  }, [captureFrame, onCapture, duration]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-20 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Camera switch */}
      <button
        onClick={switchCamera}
        className="absolute top-3 left-3 z-20 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 16v4a2 2 0 0 1-2 2h-4" />
          <polyline points="14 22 20 16 20 22" />
          <path d="M4 8V4a2 2 0 0 1 2-2h4" />
          <polyline points="10 2 4 8 4 2" />
        </svg>
      </button>

      {error ? (
        <div className="aspect-[4/3] flex items-center justify-center p-6">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-[4/3] object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Recording indicator */}
          {recording && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-red-500/90 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">{formatTime(duration)}</span>
            </div>
          )}

          {/* Capture controls */}
          {ready && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
              {mode === "photo" ? (
                <button
                  onClick={takePhoto}
                  className="w-16 h-16 rounded-full border-4 border-white bg-white/20 active:bg-white/50 transition-colors"
                />
              ) : (
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-all ${
                    recording ? "bg-red-500" : "bg-red-500/60"
                  }`}
                >
                  {recording ? (
                    <div className="w-6 h-6 bg-white rounded-sm" />
                  ) : (
                    <div className="w-10 h-10 bg-red-500 rounded-full" />
                  )}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
