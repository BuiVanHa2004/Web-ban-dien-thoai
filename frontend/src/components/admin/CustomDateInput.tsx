"use client";

import { Calendar } from "lucide-react";
import { InputHTMLAttributes } from "react";

interface CustomDateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export function CustomDateInput({ label, className = "", ...props }: CustomDateInputProps) {
  return (
    <div className="relative flex-1 sm:flex-none">
      {label && (
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none z-10" />
        <input
          type="date"
          className={`custom-date-input h-11 w-full sm:w-[180px] cursor-pointer rounded-xl bg-white border border-slate-200 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition hover:border-cyan-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:border-cyan-500 dark:focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 dark:disabled:hover:border-slate-700 ${className}`}
          {...props}
        />
      </div>
      <style jsx global>{`
        .custom-date-input::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        
        .custom-date-input::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
        
        /* Hide default icon on Firefox */
        .custom-date-input::-moz-calendar-picker-indicator {
          display: none;
        }
      `}</style>
    </div>
  );
}
