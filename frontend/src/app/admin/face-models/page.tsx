"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import Image from "next/image";
import type { FaceModel } from "@/lib/api";

export default function AdminFaceModelsPage() {
  const { isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const [models, setModels] = useState<FaceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAdmin) router.push("/");
  }, [isLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) fetchModels();
  }, [isAdmin]);

  const fetchModels = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/face-models");
      if (res.ok) {
        setModels(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `모델 목록을 불러오지 못했습니다. (${res.status})`);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!name || !file) return;
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("gender", gender);
      formData.append("category", category || "uncategorized");
      formData.append("file", file);

      const res = await fetch("/api/admin/face-models", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newModel = await res.json();
        setModels((prev) => [...prev, newModel]);
        setShowAdd(false);
        setName("");
        setCategory("");
        setFile(null);
      } else {
        const data = await res.json();
        setError(data.error || "모델 추가에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
    setSubmitting(false);
  };

  const handleToggleActive = async (model: FaceModel) => {
    if (model.is_active) {
      if (!confirm(`"${model.name}" 모델을 비활성화하시겠습니까?`)) return;
      try {
        await fetch(`/api/admin/face-models/${model.id}`, { method: "DELETE" });
        await fetchModels();
      } catch {
        setError("비활성화에 실패했습니다.");
      }
    } else {
      try {
        await fetch(`/api/admin/face-models/${model.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: true }),
        });
        await fetchModels();
      } catch {
        setError("활성화에 실패했습니다.");
      }
    }
  };

  const startEdit = (model: FaceModel) => {
    setEditingId(model.id);
    setEditName(model.name);
    setEditGender(model.gender);
    setEditCategory(model.category);
    setEditSortOrder(model.sort_order);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/admin/face-models/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          gender: editGender,
          category: editCategory,
          sort_order: editSortOrder,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchModels();
      } else {
        const data = await res.json();
        setError(data.error || "수정에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
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
      <PageHeader
        title="기본 Face Model 관리"
        backHref="/admin"
      />

      <div className="px-4 pb-24">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center justify-between gap-2">
            <span>{error}</span>
            <button
              onClick={fetchModels}
              className="shrink-0 text-xs underline text-red-500 dark:text-red-400"
            >
              재시도
            </button>
          </div>
        )}

        {/* Add button */}
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full mb-4 py-3 border border-dashed border-input rounded-xl text-sm text-muted-foreground active:bg-surface"
          >
            + 기본 모델 추가
          </button>
        ) : (
          <div className="mb-4 bg-surface border border-border rounded-xl p-4 space-y-3">
            <input
              type="text"
              placeholder="모델 이름 (예: 여성 A)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setGender("female")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  gender === "female"
                    ? "bg-accent text-accent-foreground"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                여성
              </button>
              <button
                onClick={() => setGender("male")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  gender === "male"
                    ? "bg-accent text-accent-foreground"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                남성
              </button>
            </div>
            <input
              type="text"
              placeholder="카테고리 (예: 여성-20대)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
            />
            <label className="block text-center text-sm py-2 rounded-lg cursor-pointer bg-card border border-border text-muted-foreground">
              {file ? file.name : "얼굴 사진 선택"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAdd(false); setName(""); setCategory(""); setFile(null); }}
                className="flex-1 py-2 text-sm text-muted-foreground border border-border rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                disabled={!name || !file || submitting}
                className="flex-1 py-2 text-sm text-accent-foreground bg-accent rounded-lg disabled:opacity-50"
              >
                {submitting ? "추가 중..." : "추가"}
              </button>
            </div>
          </div>
        )}

        {/* Model list */}
        {loading ? (
          <div className="text-center py-8 text-subtle text-sm">불러오는 중...</div>
        ) : models.length === 0 ? (
          <div className="text-center py-8 text-subtle text-sm">
            등록된 기본 모델이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {models.map((model) => (
              <div
                key={model.id}
                className={`p-3 bg-card border rounded-xl ${
                  model.is_active ? "border-border" : "border-border opacity-50"
                }`}
              >
                {editingId === model.id ? (
                  /* Edit mode */
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
                    />
                    <div className="flex gap-2">
                      <select
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value)}
                        className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
                      >
                        <option value="female">여성</option>
                        <option value="male">남성</option>
                      </select>
                      <input
                        type="text"
                        placeholder="카테고리"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">정렬:</label>
                      <input
                        type="number"
                        value={editSortOrder}
                        onChange={(e) => setEditSortOrder(Number(e.target.value))}
                        className="w-20 text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="flex-1 py-2 text-sm text-muted-foreground border border-border rounded-lg">취소</button>
                      <button onClick={handleSaveEdit} className="flex-1 py-2 text-sm text-accent-foreground bg-accent rounded-lg">저장</button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-muted relative flex-shrink-0">
                      <Image
                        src={model.image_url}
                        alt={model.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{model.name}</span>
                        {!model.is_active && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400">비활성</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {model.gender === "male" ? "남성" : "여성"}
                        {model.category !== "uncategorized" && ` · ${model.category}`}
                        {` · 정렬: ${model.sort_order}`}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(model)}
                        className="p-2 text-muted-foreground hover:text-foreground"
                        title="수정"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleActive(model)}
                        className={`p-2 ${model.is_active ? "text-red-500" : "text-green-500"}`}
                        title={model.is_active ? "비활성화" : "활성화"}
                      >
                        {model.is_active ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
