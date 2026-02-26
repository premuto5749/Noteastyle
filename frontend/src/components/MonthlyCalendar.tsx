"use client";

import { useMemo } from "react";

interface MonthlyCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  currentMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  counts: Record<string, number>;
  loading?: boolean;
}

const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthlyCalendar({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  currentMonth,
  onMonthChange,
  counts,
}: MonthlyCalendarProps) {
  const today = formatDate(new Date());

  const [year, month] = useMemo(() => {
    const parts = currentMonth.split("-").map(Number);
    return [parts[0], parts[1]];
  }, [currentMonth]);

  const calendarDays = useMemo(() => {
    // First day of the month
    const firstDay = new Date(year, month - 1, 1);
    const startDow = firstDay.getDay(); // 0=Sun

    // Days in month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Previous month fill
    const prevMonthDays = new Date(year, month - 1, 0).getDate();

    const cells: { date: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month trailing days
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month - 2, prevMonthDays - i);
      cells.push({
        date: formatDate(d),
        dayNum: prevMonthDays - i,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month - 1, i);
      cells.push({
        date: formatDate(d),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month fill (complete last row)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month, i);
        cells.push({
          date: formatDate(d),
          dayNum: i,
          isCurrentMonth: false,
        });
      }
    }

    return cells;
  }, [year, month]);

  const handlePrevMonth = () => {
    const d = new Date(year, month - 2, 1);
    onMonthChange(formatMonth(d));
  };

  const handleNextMonth = () => {
    const d = new Date(year, month, 1);
    onMonthChange(formatMonth(d));
  };

  const handleDateClick = (date: string) => {
    onDateSelect(date);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-[480px] mx-auto bg-card rounded-t-2xl shadow-xl border-t border-border">
          {/* Handle */}
          <div className="flex justify-center pt-2 pb-0.5">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-1.5">
            <button
              onClick={handlePrevMonth}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="이전 월"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h3 className="text-base font-semibold text-foreground">
              {year}년 {month}월
            </h3>
            <button
              onClick={handleNextMonth}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="다음 월"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-2">
            {DAY_HEADERS.map((label, i) => (
              <div
                key={label}
                className={`text-center text-[11px] font-medium py-0.5 ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 px-2 pb-8">
            {calendarDays.map((cell, idx) => {
              const isSelected = cell.date === selectedDate;
              const isToday = cell.date === today;
              const count = counts[cell.date] ?? 0;
              const dow = idx % 7;

              return (
                <button
                  key={cell.date + idx}
                  onClick={() => handleDateClick(cell.date)}
                  className="flex flex-col items-center justify-center py-0.5"
                >
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-[13px] transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : isToday
                          ? "ring-1 ring-muted-foreground/30 text-foreground font-medium"
                          : !cell.isCurrentMonth
                            ? "text-hint"
                            : dow === 0
                              ? "text-red-400"
                              : dow === 6
                                ? "text-blue-400"
                                : "text-foreground"
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                  {count > 0 && cell.isCurrentMonth ? (
                    <span className="text-[10px] text-accent font-bold leading-none">
                      {count}
                    </span>
                  ) : (
                    <span className="text-[10px] leading-none">&nbsp;</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
