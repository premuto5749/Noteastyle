"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  getFaceModels,
  uploadFaceModel,
  generateFaceSwap,
  getFaceSwapStatus,
  saveFaceSwapResult,
  selectFaceSwapResult,
  type TreatmentPhoto,
  type FaceModel,
  type FaceSwapResult,
} from "@/lib/api";

type Step = "select-photo" | "select-model" | "generating" | "results";

interface FaceSwapFlowProps {
  photos: TreatmentPhoto[];
  onClose: () => void;
  onComplete: () => void;
}

export function FaceSwapFlow({ photos, onClose, onComplete }: FaceSwapFlowProps) {
  const [step, setStep] = useState<Step>("select-photo");
  const [selectedPhoto, setSelectedPhoto] = useState<TreatmentPhoto | null>(null);
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
      const data = await getFaceModels();
      setModels(data);
    } catch {
      // silent fail
    }
  }, []);

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
      await uploadFaceModel(modelName, modelGender, modelFile);
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

      // Poll each job
      let completed = 0;
      const totalJobs = jobs.length;

      for (const job of jobs) {
        const interval = setInterval(async () => {
          try {
            const status = await getFaceSwapStatus(job._id);
            if (status.status === 2 && status.url) {
              clearInterval(interval);
              pollingRef.current = pollingRef.current.filter((i) => i !== interval);

              // Save result to DB
              const saved = await saveFaceSwapResult({
                treatment_photo_id: selectedPhoto.id,
                face_model_id: model.id,
                result_url: status.url,
              });

              setResults((prev) => [...prev, saved]);
              completed++;
              if (completed >= totalJobs) {
                setStep("results");
              }
            } else if (status.status === 3) {
              clearInterval(interval);
              pollingRef.current = pollingRef.current.filter((i) => i !== interval);
              completed++;
              if (completed >= totalJobs) {
                setStep("results");
              }
            }
          } catch {
            clearInterval(interval);
            pollingRef.current = pollingRef.current.filter((i) => i !== interval);
            completed++;
            if (completed >= totalJobs) {
              setStep("results");
            }
          }
        }, 3000);
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
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">AI Faceswap</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Step 1: Select Photo */}
      {step === "select-photo" && (
        <div className="flex-1 overflow-auto p-4">
          <p className="text-sm text-gray-500 mb-4">페이스 스왑할 사진을 선택하세요</p>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => handlePhotoSelect(photo)}
                className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 active:scale-95 transition-transform"
              >
                <Image
                  src={photo.photo_url}
                  alt="시술 사진"
                  fill
                  className="object-cover"
                  sizes="(max-width: 480px) 50vw, 240px"
                />
              </button>
            ))}
          </div>
          {photos.length === 0 && (
            <div className="text-center py-20 text-gray-400 text-sm">
              시술 사진이 없습니다
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Model */}
      {step === "select-model" && (
        <>
          {/* Selected photo preview */}
          {selectedPhoto && (
            <div className="relative aspect-[4/3] bg-gray-100">
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
          <div className="bg-white rounded-t-2xl border-t border-gray-100 p-4 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">AI 얼굴 모델 선택</h3>

            {models.length > 0 ? (
              <div className="flex gap-3">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 active:border-blue-500 active:bg-blue-50 transition-colors flex-1"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 relative">
                      <Image
                        src={model.image_url}
                        alt={model.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-900">{model.name}</span>
                    <span className="text-[10px] text-gray-400">
                      {model.gender === "male" ? "남성" : "여성"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">등록된 모델이 없습니다</p>
            )}

            {/* Add model button / form */}
            {!showModelAdd ? (
              <button
                onClick={() => setShowModelAdd(true)}
                className="w-full py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 active:bg-gray-50"
              >
                + 모델 추가
              </button>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                <input
                  type="text"
                  placeholder="모델 이름"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setModelGender("female")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      modelGender === "female"
                        ? "bg-blue-500 text-white"
                        : "bg-white border border-gray-200 text-gray-500"
                    }`}
                  >
                    여성
                  </button>
                  <button
                    onClick={() => setModelGender("male")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      modelGender === "male"
                        ? "bg-blue-500 text-white"
                        : "bg-white border border-gray-200 text-gray-500"
                    }`}
                  >
                    남성
                  </button>
                </div>
                <label className="block text-center text-sm py-2 rounded-lg cursor-pointer bg-white border border-gray-200 text-gray-600">
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
                    className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleModelAdd}
                    disabled={!modelName || !modelFile || modelUploading}
                    className="flex-1 py-2 text-sm text-white bg-blue-500 rounded-lg disabled:opacity-50"
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
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 relative">
                <Image
                  src={selectedPhoto.photo_url}
                  alt="시술 사진"
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            )}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
            {selectedModel && (
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 relative">
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
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-6" />
          <p className="text-sm font-medium text-gray-900">AI가 얼굴을 합성하고 있습니다...</p>
          <p className="text-xs text-gray-400 mt-1">잠시만 기다려주세요</p>
        </div>
      )}

      {/* Step 4: Results */}
      {step === "results" && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto p-4">
            <p className="text-sm text-gray-500 mb-4">결과를 선택하세요</p>

            {results.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-sm">
                생성된 결과가 없습니다. 다시 시도해주세요.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => setSelectedResultId(result.id)}
                    className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 transition-all ${
                      selectedResultId === result.id
                        ? "ring-3 ring-blue-500 ring-offset-2"
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
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
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
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={handleRegenerate}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 active:bg-gray-50"
            >
              다시 만들기
            </button>
            <button
              onClick={handleSelectResult}
              disabled={!selectedResultId || submitting}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 active:opacity-80"
            >
              {submitting ? "처리 중..." : "선택 완료"}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-60 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
