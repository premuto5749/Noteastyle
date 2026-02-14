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
        const today = new Date().toLocaleDateString("ko-KR");
        const todayCount = treatments.filter((t) =>
          new Date(t.created_at).toLocaleDateString("ko-KR") === today
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
      <div className="bg-[#0a0a0a] border-b border-[#262626] text-white px-4 py-6">
        <h1 className="text-xl font-bold">Note-a-Style</h1>
        <p className="text-sm text-[#666666] mt-1">시술 기록의 신</p>
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-4">
        <div className="bg-[#111111] rounded-2xl border border-[#262626] p-4">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/record"
              className="flex items-center gap-3 p-4 rounded-xl bg-[#1a1a1a] border border-[#262626] active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
                  <circle cx="12" cy="12" r="8" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-sm">빠른 기록</div>
                <div className="text-xs text-[#666666]">탭 한 번으로</div>
              </div>
            </Link>
            <Link
              href="/treatments/new"
              className="flex items-center gap-3 p-4 rounded-xl bg-[#1a1a1a] border border-[#262626] active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-sm">상세 기록</div>
                <div className="text-xs text-[#666666]">꼼꼼하게</div>
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
          <h2 className="font-bold text-[#ededed]">최근 시술</h2>
          <Link href="/treatments" className="text-sm text-[#a1a1a1]">
            전체보기
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-8 text-[#555555]">불러오는 중...</div>
        ) : recentTreatments.length === 0 ? (
          <div className="text-center py-8 bg-[#111111] rounded-xl border border-[#262626]">
            <p className="text-[#555555] text-sm">아직 시술 기록이 없습니다</p>
            <Link
              href="/record"
              className="inline-block mt-3 px-4 py-2 bg-white text-black rounded-lg text-sm"
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
    <div className="bg-[#111111] rounded-xl border border-[#262626] p-3 text-center">
      <div className="text-2xl font-bold text-white">
        {loading ? "-" : value}
      </div>
      <div className="text-xs text-[#666666] mt-0.5">{label}</div>
    </div>
  );
}

function TreatmentCard({ treatment: t }: { treatment: Treatment }) {
  return (
    <Link
      href={`/treatments/${t.id}`}
      className="block bg-[#111111] rounded-xl border border-[#262626] p-3 active:bg-[#1a1a1a]"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">{t.service_type}</span>
          {t.service_detail && (
            <span className="text-xs text-[#666666] ml-2">{t.service_detail}</span>
          )}
        </div>
        <span className="text-xs text-[#555555]">
          {new Date(t.created_at).toLocaleDateString("ko-KR")}
        </span>
      </div>
      {t.products_used && t.products_used.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {t.products_used.map((p, i) => (
            <span
              key={i}
              className="text-xs bg-[#1a1a1a] text-[#ededed] px-2 py-0.5 rounded-full"
            >
              {p.brand} {p.code}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
