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
    const result: { date: string; dayOfWeek: number; dayNum: number }[] = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(center);
      d.setDate(d.getDate() + i);
      result.push({
        date: formatDate(d),
        dayOfWeek: d.getDay(),
        dayNum: d.getDate(),
      });
    }
    return result;
  }, [selectedDate]);

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
    <div className="bg-card border-b border-border px-2 py-2">
      <div className="flex items-center gap-1">
        <button
          onClick={handlePrev}
          className="p-1.5 text-subtle hover:text-muted-foreground shrink-0"
          aria-label="이전 주"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex flex-1 justify-around">
          {days.map((day) => {
            const isSelected = day.date === selectedDate;
            const isToday = day.date === today;
            const hasReservations =
              reservationCounts && (reservationCounts[day.date] ?? 0) > 0;
            const isSunday = day.dayOfWeek === 0;
            const isSaturday = day.dayOfWeek === 6;

            return (
              <button
                key={day.date}
                onClick={() => onDateSelect(day.date)}
                className="flex flex-col items-center gap-0.5 py-1 px-1 min-w-[36px]"
              >
                <span
                  className={`text-[10px] font-medium ${
                    isSunday
                      ? "text-red-400"
                      : isSaturday
                        ? "text-blue-400"
                        : "text-subtle"
                  }`}
                >
                  {DAY_LABELS[day.dayOfWeek]}
                </span>
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-muted text-foreground"
                        : "text-foreground"
                  }`}
                >
                  {day.dayNum}
                </span>
                {hasReservations && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-primary" />
                )}
                {isSelected && <span className="w-1 h-1" />}
                {!hasReservations && !isSelected && (
                  <span className="w-1 h-1" />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          className="p-1.5 text-subtle hover:text-muted-foreground shrink-0"
          aria-label="다음 주"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {onCalendarOpen && (
          <button
            onClick={onCalendarOpen}
            className="p-1.5 ml-0.5 text-subtle hover:text-muted-foreground shrink-0"
            aria-label="월간 캘린더"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
