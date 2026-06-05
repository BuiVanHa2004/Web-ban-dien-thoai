"use client";

import Link from "next/link";
import React from "react";
import { createPortal } from "react-dom";

interface Props {
  backHref: string;
  formId?: string;
  submitting?: boolean;
  disabled?: boolean;
  backLabel?: string;
  saveLabel?: string;
  fixed?: boolean;
  extra?: React.ReactNode;
}

export default function AdminActionBar({ backHref, formId, submitting, disabled, backLabel = "Quay lại", saveLabel = "Lưu", fixed = true, extra }: Props) {
  const showSave = typeof formId === "string" && formId.length > 0;
  const rootClass = fixed ? "fixed top-[119px] right-[41px] z-50 flex items-center gap-3" : "flex items-center gap-3";

  const node = (
    <div className={rootClass}>
      {extra ? <div className="mr-2">{extra}</div> : null}
      <Link
        href={backHref}
        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {backLabel}
      </Link>

      {showSave ? (
        <button
          type="submit"
          form={formId}
          disabled={!!submitting || !!disabled}
          className={
            "inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0 " +
            ((submitting || disabled) ? "opacity-70 pointer-events-none" : "")
          }
        >
          {submitting ? (
            <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8" />
              <path d="M7 3v4h8" />
            </svg>
          )}
          {saveLabel}
        </button>
      ) : null}
    </div>
  );

  if (fixed && typeof document !== "undefined") {
    return createPortal(node, document.body);
  }

  return node;
}
