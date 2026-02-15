"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, type Customer } from "@/lib/api";

export default function CustomersPage() {
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

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers(query?: string) {
    setLoading(true);
    try {
      const data = await getCustomers(query);
      setCustomers(data);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    await loadCustomers(search || undefined);
  }

  async function handleAddCustomer() {
    if (!newName.trim()) return;
    try {
      const customer = await createCustomer({
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
      const updated = await updateCustomer(editingCustomer.id, {
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
      await deleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("삭제에 실패했습니다.");
    }
  }

  return (
    <div>
      <PageHeader
        title="고객 관리"
        subtitle={`${customers.length}명의 고객`}
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 bg-black text-white rounded-lg text-sm font-medium"
          >
            + 추가
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="고객 이름 검색"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-500"
          >
            검색
          </button>
        </div>

        {/* Add Customer Modal */}
        {showAdd && (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-bold text-sm">새 고객 추가</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="이름"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
              autoFocus
            />
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="전화번호 (선택)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCustomer}
                className="flex-1 py-2 bg-black text-white rounded-lg text-sm font-medium"
              >
                추가
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-500"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Customer List */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">불러오는 중...</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm">
              {search ? "검색 결과가 없습니다" : "등록된 고객이 없습니다"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <div
                key={c.id}
                className="bg-gray-50 rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-gray-900">{c.name}</div>
                    {c.phone && (
                      <div className="text-xs text-gray-500 mt-0.5">{c.phone}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-900 font-medium">
                        방문 {c.visit_count}회
                      </div>
                      {c.last_visit && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          마지막 {new Date(c.last_visit).toLocaleDateString("ko-KR")}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(c)}
                        className="px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-md"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(c.id, c.name)}
                        className="px-2 py-1 text-xs text-red-400 bg-gray-100 rounded-md"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Customer Modal */}
        {editingCustomer && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditingCustomer(null)}>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-sm">고객 정보 수정</h3>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="이름"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
                  autoFocus
                />
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="전화번호 (선택)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
                />
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="메모 (선택)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEditSave}
                    disabled={!editName.trim()}
                    className="flex-1 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-40"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingCustomer(null)}
                    className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-500"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
