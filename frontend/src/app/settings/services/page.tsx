"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useShopApi } from "@/hooks/useShopApi";
import { useShop } from "@/contexts/ShopContext";
import { type ServiceCategory, type ShopService } from "@/lib/api";

export default function ServiceSettingsPage() {
  const router = useRouter();
  const { api, isReady } = useShopApi();
  const { currentShop } = useShop();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // Category editing
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  // Service editing
  const [editingSvcId, setEditingSvcId] = useState<string | null>(null);
  const [editSvcName, setEditSvcName] = useState("");
  const [editSvcDuration, setEditSvcDuration] = useState("");
  const [editSvcPrice, setEditSvcPrice] = useState("");
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcDuration, setNewSvcDuration] = useState("");
  const [newSvcPrice, setNewSvcPrice] = useState("");
  const [addingSvcToCatId, setAddingSvcToCatId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const isOwnerOrAdmin =
    currentShop?.role === "owner" || currentShop?.role === "admin";

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getServiceCategories();
      setCategories(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!isReady) return;
    fetchCategories();
  }, [fetchCategories, isReady]);

  // Redirect non-authorized users
  if (currentShop && !isOwnerOrAdmin) {
    router.push("/settings/shop");
    return null;
  }

  // Category CRUD
  const handleAddCategory = async () => {
    if (!newCatName.trim() || saving) return;
    setSaving(true);
    try {
      await api.createServiceCategory({
        name: newCatName.trim(),
        icon: newCatIcon.trim() || undefined,
      });
      setNewCatName("");
      setNewCatIcon("");
      setAddingCategory(false);
      await fetchCategories();
    } catch {
      alert("카테고리 추가에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategory = async (catId: string) => {
    if (!editCatName.trim() || saving) return;
    setSaving(true);
    try {
      await api.updateServiceCategory(catId, {
        name: editCatName.trim(),
        icon: editCatIcon.trim() || undefined,
      });
      setEditingCatId(null);
      await fetchCategories();
    } catch {
      alert("카테고리 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("이 카테고리를 삭제하시겠습니까? 하위 시술도 함께 삭제됩니다.")) return;
    try {
      await api.deleteServiceCategory(catId);
      if (expandedCatId === catId) setExpandedCatId(null);
      await fetchCategories();
    } catch {
      alert("카테고리 삭제에 실패했습니다.");
    }
  };

  const handleMoveCategoryUp = async (cat: ServiceCategory, index: number) => {
    if (index === 0) return;
    const prev = categories[index - 1];
    try {
      await Promise.all([
        api.updateServiceCategory(cat.id, { sort_order: prev.sort_order }),
        api.updateServiceCategory(prev.id, { sort_order: cat.sort_order }),
      ]);
      await fetchCategories();
    } catch {
      // silently fail
    }
  };

  const handleMoveCategoryDown = async (cat: ServiceCategory, index: number) => {
    if (index === categories.length - 1) return;
    const next = categories[index + 1];
    try {
      await Promise.all([
        api.updateServiceCategory(cat.id, { sort_order: next.sort_order }),
        api.updateServiceCategory(next.id, { sort_order: cat.sort_order }),
      ]);
      await fetchCategories();
    } catch {
      // silently fail
    }
  };

  // Service CRUD
  const handleAddService = async (catId: string) => {
    if (!newSvcName.trim() || saving) return;
    setSaving(true);
    try {
      await api.createService({
        category_id: catId,
        name: newSvcName.trim(),
        estimated_duration_minutes: newSvcDuration ? parseInt(newSvcDuration) : undefined,
        price: newSvcPrice ? parseInt(newSvcPrice) : undefined,
      });
      setNewSvcName("");
      setNewSvcDuration("");
      setNewSvcPrice("");
      setAddingSvcToCatId(null);
      await fetchCategories();
    } catch {
      alert("시술 추가에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateService = async (svcId: string) => {
    if (!editSvcName.trim() || saving) return;
    setSaving(true);
    try {
      await api.updateService(svcId, {
        name: editSvcName.trim(),
        estimated_duration_minutes: editSvcDuration ? parseInt(editSvcDuration) : null,
        price: editSvcPrice ? parseInt(editSvcPrice) : null,
      });
      setEditingSvcId(null);
      await fetchCategories();
    } catch {
      alert("시술 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (svcId: string) => {
    if (!confirm("이 시술을 삭제하시겠습니까?")) return;
    try {
      await api.deleteService(svcId);
      await fetchCategories();
    } catch {
      alert("시술 삭제에 실패했습니다.");
    }
  };

  const startEditCategory = (cat: ServiceCategory) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatIcon(cat.icon || "");
  };

  const startEditService = (svc: ShopService) => {
    setEditingSvcId(svc.id);
    setEditSvcName(svc.name);
    setEditSvcDuration(svc.estimated_duration_minutes?.toString() || "");
    setEditSvcPrice(svc.price?.toString() || "");
  };

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
        title="시술 메뉴 관리"
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

      <div className="px-4 mt-6 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            불러오는 중...
          </div>
        ) : (
          <>
            {/* Category List */}
            {categories.map((cat, catIdx) => (
              <div
                key={cat.id}
                className="bg-card rounded-2xl border border-border overflow-hidden"
              >
                {/* Category Header */}
                <div className="flex items-center gap-2 px-4 py-3">
                  {editingCatId === cat.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editCatIcon}
                        onChange={(e) => setEditCatIcon(e.target.value)}
                        className="w-10 px-1 py-1.5 border border-border rounded-lg text-center text-sm bg-card text-foreground"
                        placeholder="🔧"
                      />
                      <input
                        type="text"
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={() => handleUpdateCategory(cat.id)}
                        disabled={saving}
                        className="px-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="px-2 py-1.5 rounded-lg border border-border text-xs text-muted-foreground"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          setExpandedCatId(
                            expandedCatId === cat.id ? null : cat.id
                          )
                        }
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-sm font-medium text-foreground">
                          {cat.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({cat.services.length})
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`ml-auto text-muted-foreground transition-transform ${
                            expandedCatId === cat.id ? "rotate-180" : ""
                          }`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {/* Category actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveCategoryUp(cat, catIdx)}
                          disabled={catIdx === 0}
                          className="p-1 text-muted-foreground disabled:opacity-30"
                          title="위로"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveCategoryDown(cat, catIdx)}
                          disabled={catIdx === categories.length - 1}
                          className="p-1 text-muted-foreground disabled:opacity-30"
                          title="아래로"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                        <button
                          onClick={() => startEditCategory(cat)}
                          className="p-1 text-muted-foreground"
                          title="수정"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1 text-red-500"
                          title="삭제"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Services list (expandable) */}
                {expandedCatId === cat.id && (
                  <div className="border-t border-border">
                    {cat.services.length === 0 && !addingSvcToCatId ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                        소분류가 없습니다
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {cat.services.map((svc) => (
                          <div key={svc.id} className="px-4 py-2.5">
                            {editingSvcId === svc.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editSvcName}
                                  onChange={(e) => setEditSvcName(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  placeholder="시술명"
                                />
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    value={editSvcDuration}
                                    onChange={(e) => setEditSvcDuration(e.target.value)}
                                    className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm bg-card text-foreground"
                                    placeholder="소요시간(분)"
                                  />
                                  <input
                                    type="number"
                                    value={editSvcPrice}
                                    onChange={(e) => setEditSvcPrice(e.target.value)}
                                    className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm bg-card text-foreground"
                                    placeholder="가격(원)"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUpdateService(svc.id)}
                                    disabled={saving}
                                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                                  >
                                    저장
                                  </button>
                                  <button
                                    onClick={() => setEditingSvcId(null)}
                                    className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground"
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm text-foreground">
                                    {svc.name}
                                  </span>
                                  <div className="flex gap-2 mt-0.5">
                                    {svc.estimated_duration_minutes && (
                                      <span className="text-xs text-muted-foreground">
                                        {svc.estimated_duration_minutes}분
                                      </span>
                                    )}
                                    {svc.price != null && (
                                      <span className="text-xs text-muted-foreground">
                                        {svc.price.toLocaleString()}원
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => startEditService(svc)}
                                    className="p-1 text-muted-foreground"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteService(svc.id)}
                                    className="p-1 text-red-500"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add service form */}
                    {addingSvcToCatId === cat.id ? (
                      <div className="px-4 py-3 border-t border-border space-y-2">
                        <input
                          type="text"
                          value={newSvcName}
                          onChange={(e) => setNewSvcName(e.target.value)}
                          className="w-full px-3 py-1.5 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="시술명 (예: 여성 커트)"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={newSvcDuration}
                            onChange={(e) => setNewSvcDuration(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm bg-card text-foreground"
                            placeholder="소요시간(분)"
                          />
                          <input
                            type="number"
                            value={newSvcPrice}
                            onChange={(e) => setNewSvcPrice(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm bg-card text-foreground"
                            placeholder="가격(원)"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddService(cat.id)}
                            disabled={saving || !newSvcName.trim()}
                            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                          >
                            추가
                          </button>
                          <button
                            onClick={() => {
                              setAddingSvcToCatId(null);
                              setNewSvcName("");
                              setNewSvcDuration("");
                              setNewSvcPrice("");
                            }}
                            className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingSvcToCatId(cat.id)}
                        className="w-full px-4 py-2.5 text-sm text-primary font-medium border-t border-border text-center"
                      >
                        + 시술 추가
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add category */}
            {addingCategory ? (
              <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-12 px-2 py-2 border border-border rounded-lg text-center text-sm bg-card text-foreground"
                    placeholder="🔧"
                  />
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="카테고리 이름 (예: 헤드스파)"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCategory}
                    disabled={saving || !newCatName.trim()}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => {
                      setAddingCategory(false);
                      setNewCatName("");
                      setNewCatIcon("");
                    }}
                    className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingCategory(true)}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-border text-sm text-muted-foreground font-medium active:scale-[0.98] transition-transform"
              >
                + 카테고리 추가
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
