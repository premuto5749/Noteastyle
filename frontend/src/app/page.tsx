"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCustomers, getTreatments, type Treatment } from "@/lib/api";

export default function HomePage() {
  const [stats, setStats] = useState({ customers: 0, treatments: 0, todayTreatments: 0 });
  const [recentTreatments, setRecentTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [customers, treatments] = await Promise.all([
          getCustomers(),
          getTreatments(),
        ]);
        const today = new Date().toISOString().slice(0, 10);
        const todayCount = treatments.filter((t) =>
          t.created_at.startsWith(today)
        ).length;
        setStats({
          customers: customers.length,
          treatments: treatments.length,
          todayTreatments: todayCount,
        });
        setRecentTreatments(treatments.slice(0, 5));
      } catch {
        // API not available yet - show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white px-4 py-6">
        <h1 className="text-xl font-bold">Note-a-Style</h1>
        <p className="text-sm text-purple-200 mt-1">시술 기록의 신</p>
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/record"
              className="flex items-center gap-3 p-4 rounded-xl bg-purple-50 border border-purple-100 active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <circle cx="12" cy="12" r="8" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-sm">빠른 기록</div>
                <div className="text-xs text-gray-500">탭 한 번으로</div>
              </div>
            </Link>
            <Link
              href="/treatments/new"
              className="flex items-center gap-3 p-4 rounded-xl bg-pink-50 border border-pink-100 active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-sm">상세 기록</div>
                <div className="text-xs text-gray-500">꼼꼼하게</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="오늘 시술" value={stats.todayTreatments} loading={loading} />
          <StatCard label="전체 고객" value={stats.customers} loading={loading} />
          <StatCard label="전체 시술" value={stats.treatments} loading={loading} />
        </div>
      </div>

      {/* Recent Treatments */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">최근 시술</h2>
          <Link href="/treatments" className="text-sm text-[var(--primary)]">
            전체보기
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-400">불러오는 중...</div>
        ) : recentTreatments.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
            <p className="text-gray-400 text-sm">아직 시술 기록이 없습니다</p>
            <Link
              href="/record"
              className="inline-block mt-3 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm"
            >
              첫 기록 시작하기
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTreatments.map((t) => (
              <TreatmentCard key={t.id} treatment={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
      <div className="text-2xl font-bold text-[var(--primary)]">
        {loading ? "-" : value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function TreatmentCard({ treatment: t }: { treatment: Treatment }) {
  return (
    <Link
      href={`/treatments/${t.id}`}
      className="block bg-white rounded-xl border border-gray-100 p-3 active:bg-gray-50"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">{t.service_type}</span>
          {t.service_detail && (
            <span className="text-xs text-gray-500 ml-2">{t.service_detail}</span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {new Date(t.created_at).toLocaleDateString("ko-KR")}
        </span>
      </div>
      {t.products_used && t.products_used.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {t.products_used.map((p, i) => (
            <span
              key={i}
              className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full"
            >
              {p.brand} {p.code}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
