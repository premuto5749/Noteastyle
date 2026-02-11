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
            className="px-3 py-1.5 bg-white text-black rounded-lg text-sm font-medium"
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
            className="flex-1 px-4 py-2.5 border border-[#333333] rounded-xl text-sm bg-[#111111] text-[#ededed] placeholder:text-[#555555] focus:outline-none focus:border-white"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-[#1a1a1a] rounded-xl text-sm font-medium text-[#a1a1a1]"
          >
            검색
          </button>
        </div>

        {/* Add Customer Modal */}
        {showAdd && (
          <div className="bg-[#111111] rounded-2xl border border-[#333333] p-4 space-y-3">
            <h3 className="font-bold text-sm">새 고객 추가</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="이름"
              className="w-full px-3 py-2 border border-[#333333] rounded-lg text-sm bg-[#111111] text-[#ededed] placeholder:text-[#555555] focus:outline-none focus:border-white"
              autoFocus
            />
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="전화번호 (선택)"
              className="w-full px-3 py-2 border border-[#333333] rounded-lg text-sm bg-[#111111] text-[#ededed] placeholder:text-[#555555] focus:outline-none focus:border-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCustomer}
                className="flex-1 py-2 bg-white text-black rounded-lg text-sm font-medium"
              >
                추가
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2 border border-[#333333] rounded-lg text-sm font-medium text-[#a1a1a1]"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Customer List */}
        {loading ? (
          <div className="text-center py-8 text-[#555555]">불러오는 중...</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 bg-[#111111] rounded-xl border border-[#262626]">
            <p className="text-[#555555] text-sm">
              {search ? "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" : "\uB4F1\uB85D\uB41C \uACE0\uAC1D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <div
                key={c.id}
                className="bg-[#111111] rounded-xl border border-[#262626] p-4 active:bg-[#1a1a1a]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    {c.phone && (
                      <div className="text-xs text-[#666666] mt-0.5">{c.phone}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white font-medium">
                      방문 {c.visit_count}회
                    </div>
                    {c.last_visit && (
                      <div className="text-xs text-[#555555] mt-0.5">
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
