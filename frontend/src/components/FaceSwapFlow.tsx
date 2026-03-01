"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  generateFaceSwap,
  getFaceSwapStatus,
  saveFaceSwapResult,
  selectFaceSwapResult,
  type TreatmentPhoto,
  type FaceModel,
  type FaceSwapResult,
} from "@/lib/api";
import { useShopApi } from "@/hooks/useShopApi";

type Step = "select-photo" | "select-model" | "generating" | "results";

interface FaceSwapFlowProps {
  photos: TreatmentPhoto[];
  initialPhoto?: TreatmentPhoto;
  onClose: () => void;
  onComplete: () => void;
}

export function FaceSwapFlow({ photos, initialPhoto, onClose, onComplete }: FaceSwapFlowProps) {
  const { api } = useShopApi();
  const [step, setStep] = useState<Step>(initialPhoto ? "select-model" : "select-photo");
  const [selectedPhoto, setSelectedPhoto] = useState<TreatmentPhoto | null>(initialPhoto ?? null);
  const [models, setModels] = useState<FaceModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<FaceModel | null>(null);
  const [results, setResults] = useState<FaceSwapResult[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Model add form
  const [showModelAdd, setShowModelAdd] = useState(false);
  const [modelName, setModelName] = useState("");
  const [modelGender, setModelGender] = useState<"male" | "female">("female");
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelUploading, setModelUploading] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    return () => {
      pollingRef.current.forEach(clearInterval);
    };
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const data = await api.getFaceModels();
      setModels(data);
    } catch {
      // silent fail
    }
  }, [api]);

  // Load models immediately when starting from initialPhoto
  useEffect(() => {
    if (initialPhoto) {
      loadModels();
    }
  }, [initialPhoto, loadModels]);

  // Photo selection
  function handlePhotoSelect(photo: TreatmentPhoto) {
    setSelectedPhoto(photo);
    setStep("select-model");
    loadModels();
  }

  // Model selection
  function handleModelSelect(model: FaceModel) {
    setSelectedModel(model);
    setStep("generating");
    startGeneration(model);
  }

  // Model add
  async function handleModelAdd() {
    if (!modelName || !modelFile) return;
    setModelUploading(true);
    try {
      await api.uploadFaceModel(modelName, modelGender, modelFile);
      await new Promise((resolve) => setTimeout(resolve, 800));
      await loadModels();
      setShowModelAdd(false);
      setModelName("");
      setModelFile(null);
    } catch {
      alert("모델 추가에 실패했습니다.");
    } finally {
      setModelUploading(false);
    }
  }

  // Generation
  async function startGeneration(model: FaceModel) {
    if (!selectedPhoto) return;
    try {
      const { jobs } = await generateFaceSwap(selectedPhoto.id, model.id, 2);

      // Poll each job (5s interval, 2min timeout)
      let completed = 0;
      const totalJobs = jobs.length;
      const POLL_INTERVAL = 5000;
      const POLL_TIMEOUT = 120000;

      for (const job of jobs) {
        const startTime = Date.now();
        const interval = setInterval(async () => {
          // Timeout: stop polling after 2 minutes
          if (Date.now() - startTime > POLL_TIMEOUT) {
            clearInterval(interval);
            pollingRef.current = pollingRef.current.filter((i) => i !== interval);
            completed++;
            if (completed >= totalJobs) setStep("results");
            return;
          }

          try {
            const status = await getFaceSwapStatus(job._id);
            if (status.status === 2 && status.url) {
              clearInterval(interval);
              pollingRef.current = pollingRef.current.filter((i) => i !== interval);

              const saved = await saveFaceSwapResult({
                treatment_photo_id: selectedPhoto.id,
                face_model_id: model.id,
                result_url: status.url,
              });

              setResults((prev) => [...prev, saved]);
              completed++;
              if (completed >= totalJobs) setStep("results");
            } else if (status.status === 3) {
              clearInterval(interval);
              pollingRef.current = pollingRef.current.filter((i) => i !== interval);
              completed++;
              if (completed >= totalJobs) setStep("results");
            }
          } catch {
            clearInterval(interval);
            pollingRef.current = pollingRef.current.filter((i) => i !== interval);
            completed++;
            if (completed >= totalJobs) setStep("results");
          }
        }, POLL_INTERVAL);
        pollingRef.current.push(interval);
      }
    } catch {
      alert("페이스 스왑 생성에 실패했습니다.");
      setStep("select-model");
    }
  }

  // Regenerate
  function handleRegenerate() {
    if (!selectedModel) return;
    setStep("generating");
    startGeneration(selectedModel);
  }

  // Select result
  async function handleSelectResult() {
    if (!selectedResultId) return;
    setSubmitting(true);
    try {
      await selectFaceSwapResult(selectedResultId);
      setToast("포트폴리오에 추가되었습니다!");
      setTimeout(() => {
        onComplete();
        onClose();
      }, 1500);
    } catch {
      alert("선택 처리에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-base font-bold text-foreground">AI Faceswap</h2>
        <button
          onClick={onClose}
          className="p-1 text-subtle"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Step 1: Select Photo - 4-column gallery grid */}
      {step === "select-photo" && (
        <div className="flex-1 overflow-auto">
          <p className="text-sm text-muted-foreground px-4 py-3">페이스 스왑할 사진을 선택하세요</p>
          {photos.length === 0 ? (
            <div className="text-center py-20 text-subtle text-sm">
              시술 사진이 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-px bg-border">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => handlePhotoSelect(photo)}
                  className="relative aspect-square bg-muted overflow-hidden active:opacity-70 transition-opacity"
                >
                  <Image
                    src={photo.photo_url}
                    alt="시술 사진"
                    fill
                    className="object-cover"
                    sizes="(max-width: 480px) 25vw, 120px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Model */}
      {step === "select-model" && (
        <>
          {/* Selected photo preview */}
          {selectedPhoto && (
            <div className="relative aspect-[4/3] bg-muted">
              <Image
                src={selectedPhoto.photo_url}
                alt="선택한 사진"
                fill
                className="object-cover"
                sizes="(max-width: 480px) 100vw, 480px"
              />
            </div>
          )}

          {/* Model selection bottom sheet */}
          <div className="bg-card rounded-t-2xl border-t border-border p-4 space-y-4">
            <h3 className="text-sm font-bold text-foreground">AI 얼굴 모델 선택</h3>

            {models.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border active:border-accent active:bg-info-bg transition-colors min-w-[90px]"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-muted relative">
                      <Image
                        src={model.image_url}
                        alt={model.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                      {model.is_global && (
                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-accent text-accent-foreground text-[9px] font-bold rounded-full">
                          기본
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-foreground">{model.name}</span>
                    <span className="text-[10px] text-subtle">
                      {model.gender === "male" ? "남성" : "여성"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-subtle text-center py-4">등록된 모델이 없습니다</p>
            )}

            {/* Add model button / form */}
            {!showModelAdd ? (
              <button
                onClick={() => setShowModelAdd(true)}
                className="w-full py-2.5 border border-dashed border-input rounded-xl text-sm text-muted-foreground active:bg-surface"
              >
                + 모델 추가
              </button>
            ) : (
              <div className="bg-surface rounded-xl p-3 space-y-3">
                <input
                  type="text"
                  placeholder="모델 이름"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setModelGender("female")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      modelGender === "female"
                        ? "bg-accent text-accent-foreground"
                        : "bg-card border border-border text-muted-foreground"
                    }`}
                  >
                    여성
                  </button>
                  <button
                    onClick={() => setModelGender("male")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      modelGender === "male"
                        ? "bg-accent text-accent-foreground"
                        : "bg-card border border-border text-muted-foreground"
                    }`}
                  >
                    남성
                  </button>
                </div>
                <label className="block text-center text-sm py-2 rounded-lg cursor-pointer bg-card border border-border text-muted-foreground">
                  {modelFile ? modelFile.name : "얼굴 사진 선택"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowModelAdd(false);
                      setModelName("");
                      setModelFile(null);
                    }}
                    className="flex-1 py-2 text-sm text-muted-foreground border border-border rounded-lg"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleModelAdd}
                    disabled={!modelName || !modelFile || modelUploading}
                    className="flex-1 py-2 text-sm text-accent-foreground bg-accent rounded-lg disabled:opacity-50"
                  >
                    {modelUploading ? "추가 중..." : "추가"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Step 3: Generating */}
      {step === "generating" && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* Selected photo + model info */}
          <div className="flex items-center gap-4 mb-8">
            {selectedPhoto && (
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted relative">
                <Image
                  src={selectedPhoto.photo_url}
                  alt="시술 사진"
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            )}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-subtle">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
            {selectedModel && (
              <div className="w-20 h-20 rounded-full overflow-hidden bg-muted relative">
                <Image
                  src={selectedModel.image_url}
                  alt={selectedModel.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            )}
          </div>

          {/* Spinner */}
          <div className="w-16 h-16 border-4 border-muted border-t-accent rounded-full animate-spin mb-6" />
          <p className="text-sm font-medium text-foreground">AI가 얼굴을 합성하고 있습니다...</p>
          <p className="text-xs text-subtle mt-1">잠시만 기다려주세요</p>
        </div>
      )}

      {/* Step 4: Results */}
      {step === "results" && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto p-4">
            <p className="text-sm text-muted-foreground mb-4">결과를 선택하세요</p>

            {results.length === 0 ? (
              <div className="text-center py-20 text-subtle text-sm">
                생성된 결과가 없습니다. 다시 시도해주세요.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => setSelectedResultId(result.id)}
                    className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-muted transition-all ${
                      selectedResultId === result.id
                        ? "ring-4 ring-accent ring-offset-2 ring-offset-background"
                        : ""
                    }`}
                  >
                    <Image
                      src={result.result_url}
                      alt="결과"
                      fill
                      className="object-cover"
                      sizes="(max-width: 480px) 50vw, 240px"
                    />
                    {selectedResultId === result.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bottom action buttons */}
          <div className="p-4 border-t border-border flex gap-3">
            <button
              onClick={handleRegenerate}
              className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground active:bg-surface"
            >
              다시 만들기
            </button>
            <button
              onClick={handleSelectResult}
              disabled={!selectedResultId || submitting}
              className="flex-1 py-3 bg-accent text-accent-foreground rounded-xl text-sm font-medium disabled:opacity-50 active:opacity-80"
            >
              {submitting ? "처리 중..." : "선택 완료"}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-60 bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
