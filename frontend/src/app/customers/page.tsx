"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { type Customer } from "@/lib/api";
import { useShopApi } from "@/hooks/useShopApi";

export default function CustomersPage() {
  const { api, isReady } = useShopApi();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const loadCustomers = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const data = await api.getCustomers(query);
      setCustomers(data);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!isReady) return;
    loadCustomers();
  }, [loadCustomers, isReady]);

  async function handleSearch() {
    await loadCustomers(search || undefined);
  }

  async function handleAddCustomer() {
    if (!newName.trim()) return;
    try {
      const customer = await api.createCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
      });
      setCustomers((prev) => [customer, ...prev]);
      setShowAdd(false);
      setNewName("");
      setNewPhone("");
    } catch {
      alert("고객 추가에 실패했습니다.");
    }
  }

  function startEdit(c: Customer) {
    setEditingCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone || "");
    setEditNotes(c.notes || "");
  }

  async function handleEditSave() {
    if (!editingCustomer || !editName.trim()) return;
    try {
      const updated = await api.updateCustomer(editingCustomer.id, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingCustomer(null);
    } catch {
      alert("수정에 실패했습니다.");
    }
  }

  async function handleDeleteCustomer(id: string, name: string) {
    if (!confirm(`${name} 고객을 삭제하시겠습니까?`)) return;
    try {
      await api.deleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("삭제에 실패했습니다.");
    }
  }

  return (
    <div>
      {/* Page title (non-sticky, below AppHeader) */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">고객 관리</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{customers.length}명의 고객</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 bg-accent text-accent-foreground rounded-full text-sm font-medium"
          >
            + 추가
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Search bar with icon */}
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="고객 이름 검색"
            className="w-full pl-10 pr-4 py-2.5 bg-surface rounded-2xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        {/* Add Customer form */}
        {showAdd && (
          <div className="card-elevated p-4 space-y-3">
            <h3 className="font-bold text-sm text-foreground">새 고객 추가</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="이름"
              className="w-full px-3 py-2 bg-muted/50 rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoFocus
            />
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="전화번호 (선택)"
              className="w-full px-3 py-2 bg-muted/50 rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCustomer}
                className="flex-1 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium"
              >
                추가
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2 bg-muted rounded-lg text-sm font-medium text-muted-foreground"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Customer List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card-elevated p-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-20" />
                  <div className="h-3 bg-muted rounded w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <p className="text-subtle text-sm">
              {search ? "검색 결과가 없습니다" : "등록된 고객이 없습니다"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((c) => (
              <div key={c.id} className="card-elevated p-4 flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-accent">{c.name[0]}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground">{c.name}</div>
                  {c.phone && (
                    <div className="text-xs text-subtle mt-0.5">{c.phone}</div>
                  )}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right mr-1">
                    <div className="text-xs font-medium text-foreground">방문 {c.visit_count}회</div>
                    {c.last_visit && (
                      <div className="text-[10px] text-subtle">
                        {new Date(c.last_visit).toLocaleDateString("ko-KR")}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Link
                      href={`/reservation?customerId=${c.id}&name=${encodeURIComponent(c.name)}&phone=${encodeURIComponent(c.phone || "")}`}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-accent/10 text-accent"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => startEdit(c)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-muted-foreground"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(c.id, c.name)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-destructive"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingCustomer(null)}
        >
          <div
            className="card-elevated p-4 space-y-3 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-sm text-foreground">고객 정보 수정</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="이름"
              className="w-full px-3 py-2 bg-muted/50 rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoFocus
            />
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="전화번호 (선택)"
              className="w-full px-3 py-2 bg-muted/50 rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="메모 (선택)"
              rows={2}
              className="w-full px-3 py-2 bg-muted/50 rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleEditSave}
                disabled={!editName.trim()}
                className="flex-1 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40"
              >
                저장
              </button>
              <button
                onClick={() => setEditingCustomer(null)}
                className="flex-1 py-2 bg-muted rounded-lg text-sm font-medium text-muted-foreground"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
