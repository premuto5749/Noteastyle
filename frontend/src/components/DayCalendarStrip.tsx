"use client";

import { useMemo } from "react";

interface DayCalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  reservationCounts?: Record<string, number>;
  onCalendarOpen?: () => void;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function DayCalendarStrip({
  selectedDate,
  onDateSelect,
  reservationCounts,
  onCalendarOpen,
}: DayCalendarStripProps) {
  const today = formatDate(new Date());

  const days = useMemo(() => {
    const center = new Date(selectedDate + "T00:00:00");
    const result: { date: string; dayOfWeek: number; dayNum: number; month: number }[] = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(center);
      d.setDate(d.getDate() + i);
      result.push({
        date: formatDate(d),
        dayOfWeek: d.getDay(),
        dayNum: d.getDate(),
        month: d.getMonth() + 1,
      });
    }
    return result;
  }, [selectedDate]);

  // Selected date's month for header
  const selectedMonth = useMemo(() => {
    const d = new Date(selectedDate + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, [selectedDate]);

  // Detect month boundary: find first date with different month than first day
  const monthBoundaryIndex = useMemo(() => {
    if (days.length === 0) return -1;
    const firstMonth = days[0].month;
    for (let i = 1; i < days.length; i++) {
      if (days[i].month !== firstMonth) return i;
    }
    return -1;
  }, [days]);

  const handlePrev = () => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() - 7);
    onDateSelect(formatDate(d));
  };

  const handleNext = () => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + 7);
    onDateSelect(formatDate(d));
  };

  return (
    <div className="bg-card border-b border-border">
      {/* Month header - tap to open monthly calendar */}
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
        <button
          onClick={onCalendarOpen}
          className="flex items-center gap-1 text-base font-bold text-foreground active:opacity-70 transition-opacity"
        >
          {selectedMonth.year}년 {selectedMonth.month}월
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button
          onClick={() => onDateSelect(formatDate(new Date()))}
          className="text-xs font-semibold text-accent px-2.5 py-1 rounded-full hover:bg-accent/10 active:bg-accent/20 transition-colors"
        >
          오늘
        </button>
      </div>

      {/* Calendar strip */}
      <div className="flex items-center gap-0.5 px-2 pb-2">
        <button
          onClick={handlePrev}
          className="p-1 text-subtle hover:text-muted-foreground shrink-0"
          aria-label="이전 주"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex flex-1 justify-around min-w-0">
          {days.map((day, idx) => {
            const isSelected = day.date === selectedDate;
            const isToday = day.date === today;
            const count = reservationCounts?.[day.date] ?? 0;
            const isSunday = day.dayOfWeek === 0;
            const isSaturday = day.dayOfWeek === 6;
            const showMonthLabel = monthBoundaryIndex === idx;

            return (
              <button
                key={day.date}
                onClick={() => onDateSelect(day.date)}
                className="flex flex-col items-center gap-0.5 py-1 px-0.5 min-w-0"
              >
                {/* Month boundary label or day-of-week */}
                {showMonthLabel ? (
                  <span className="text-[10px] font-bold text-accent leading-tight">
                    {day.month}월
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-medium leading-tight ${
                      isSunday
                        ? "text-red-400"
                        : isSaturday
                          ? "text-blue-400"
                          : "text-subtle"
                    }`}
                  >
                    {DAY_LABELS[day.dayOfWeek]}
                  </span>
                )}

                {/* Date circle */}
                <span
                  className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-accent/10 text-accent ring-1 ring-accent/30"
                        : "text-foreground"
                  }`}
                >
                  {day.dayNum}
                </span>

                {/* Reservation count */}
                {count > 0 ? (
                  <span className={`text-[9px] font-bold leading-none ${
                    isSelected ? "text-primary" : "text-accent"
                  }`}>{count}</span>
                ) : (
                  <span className="h-[11px]" />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          className="p-1 text-subtle hover:text-muted-foreground shrink-0"
          aria-label="다음 주"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
