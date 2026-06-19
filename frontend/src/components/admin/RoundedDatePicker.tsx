"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface RoundedDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function RoundedDatePicker({ 
  value, 
  onChange, 
  min, 
  max, 
  disabled,
  placeholder = "Chọn ngày" 
}: RoundedDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    
    // Add empty slots for days before the 1st
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleSelectDay = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    // Check min/max constraints
    if (min && dateStr < min) return;
    if (max && dateStr > max) return;
    
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    onChange(todayStr);
    setIsOpen(false);
  };

  const isDateDisabled = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  const isDateSelected = (day: number) => {
    if (!value) return false;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr === value;
  };

  const isToday = (day: number) => {
    const today = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="h-11 w-full sm:w-[180px] flex items-center gap-3 px-3 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-900 outline-none transition hover:border-cyan-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:border-cyan-500 dark:focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 dark:disabled:hover:border-slate-700"
      >
        <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <span className="flex-1 text-left truncate">
          {value ? formatDisplayDate(value) : placeholder}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Mobile Overlay backdrop */}
          <div className="fixed inset-0 bg-black/30 z-40 sm:hidden" onClick={() => setIsOpen(false)} />
          
          {/* Calendar popup container with better positioning */}
          <div className="fixed sm:absolute inset-x-4 top-1/2 -translate-y-1/2 sm:translate-y-0 sm:inset-x-auto sm:top-full sm:left-0 mt-0 sm:mt-2 z-50 flex justify-center sm:block">
            {/* Calendar popup */}
            <div className="relative rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700 overflow-hidden w-full max-w-[340px] sm:max-w-none sm:w-[320px]">
              {/* Header with padding adjustments for mobile */}
              <div className="flex items-center justify-between px-5 py-3 sm:px-4 sm:py-2.5 border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
                <span className="text-base sm:text-sm font-bold text-slate-900 dark:text-white">
                  {monthName}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
              </div>

              {/* Calendar Grid with better spacing for mobile */}
              <div className="p-4 sm:p-2.5">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-1 mb-2 sm:mb-1.5">
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
                    <div
                      key={day}
                      className="h-8 sm:h-7 flex items-center justify-center text-sm sm:text-xs font-bold text-slate-500 dark:text-slate-400"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid with better touch targets for mobile */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-1">
                  {days.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="h-10 sm:h-8" />;
                    }

                    const disabled = isDateDisabled(day);
                    const selected = isDateSelected(day);
                    const today = isToday(day);

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => !disabled && handleSelectDay(day)}
                        disabled={disabled}
                        className={`
                          h-10 sm:h-8 flex items-center justify-center text-base sm:text-sm font-medium rounded-lg transition
                          ${disabled 
                            ? "text-slate-300 dark:text-slate-600 cursor-not-allowed" 
                            : "hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95"
                          }
                          ${selected 
                            ? "bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-500/30" 
                            : today 
                              ? "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 ring-1 ring-cyan-200 dark:ring-cyan-500/30" 
                              : "text-slate-900 dark:text-slate-100"
                          }
                        `}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer with better spacing and touch targets */}
              <div className="flex items-center justify-between px-5 py-3 sm:px-4 sm:py-2.5 border-t border-slate-200 dark:border-slate-700 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                  className="px-4 py-2 sm:px-0 sm:py-0 rounded-lg sm:rounded-none hover:bg-slate-100 sm:hover:bg-transparent active:bg-slate-200 sm:active:bg-transparent text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-5 py-2 sm:px-3 sm:py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-sm font-bold text-white transition shadow-lg shadow-cyan-500/30"
                >
                  Hôm nay
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
