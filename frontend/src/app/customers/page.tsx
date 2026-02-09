"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getCustomers, createCustomer, type Customer } from "@/lib/api";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

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
      alert("\uACE0\uAC1D \uCD94\uAC00\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    }
  }

  return (
    <div>
      <PageHeader
        title="\uACE0\uAC1D \uAD00\uB9AC"
        subtitle={`${customers.length}\uBA85\uC758 \uACE0\uAC1D`}
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium"
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
            placeholder="\uACE0\uAC1D \uC774\uB984 \uAC80\uC0C9"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700"
          >
            검색
          </button>
        </div>

        {/* Add Customer Modal */}
        {showAdd && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-bold text-sm">새 고객 추가</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="\uC774\uB984"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
              autoFocus
            />
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="\uC804\uD654\uBC88\uD638 (\uC120\uD0DD)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCustomer}
                className="flex-1 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium"
              >
                추가
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600"
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
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <p className="text-gray-400 text-sm">
              {search ? "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" : "\uB4F1\uB85D\uB41C \uACE0\uAC1D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-gray-100 p-4 active:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    {c.phone && (
                      <div className="text-xs text-gray-500 mt-0.5">{c.phone}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[var(--primary)] font-medium">
                      방문 {c.visit_count}회
                    </div>
                    {c.last_visit && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        마지막 {new Date(c.last_visit).toLocaleDateString("ko-KR")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
