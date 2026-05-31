/** Shared Auth UI classes — tuned for mobile web (safe area, 16px inputs, touch targets). */

export const authFormPanelClass =
  "w-full max-w-md rounded-2xl border-0 bg-transparent p-0 shadow-none sm:rounded-3xl sm:border sm:border-purple-200/60 sm:bg-purple-100/50 sm:p-6 sm:shadow-sm sm:backdrop-blur-xs md:rounded-[2.5rem] md:p-8 dark:sm:border-white/10 dark:sm:bg-purple-900/10";

export const authBadgeClass =
  "inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 sm:rounded-2xl dark:border-white/10 dark:bg-white/5";

export const authTitleClass =
  "mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:mt-4 sm:text-3xl dark:text-white";

export const authSubtitleClass = "mt-2 text-sm text-slate-600 dark:text-white/70";

export const authLabelClass = "text-sm font-medium text-slate-700 dark:text-white/80";

export const authInputClass =
  "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:h-12 sm:rounded-2xl dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:hover:border-white/20 dark:focus:border-blue-400/50";

export const authInputWithToggleClass = `${authInputClass} pr-14 sm:pr-24`;

export const authPrimaryBtnClass =
  "inline-flex h-11 w-full touch-manipulation cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-blue-400 px-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-colors duration-200 hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:rounded-2xl sm:hover:scale-[1.02] dark:bg-linear-to-r dark:from-blue-400 dark:to-indigo-500";

export const authSecondaryBtnClass =
  "inline-flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60 sm:h-12 sm:rounded-2xl dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";

export const authGhostBtnClass =
  "inline-flex h-11 w-full touch-manipulation cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.98] sm:h-12 sm:rounded-2xl sm:hover:scale-[1.02] dark:border-white/10 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10";

export const authTogglePasswordBtnClass =
  "absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 touch-manipulation items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:right-2 sm:rounded-xl sm:px-3 sm:py-2 sm:w-auto dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white active:scale-95";

export const authLinkBtnClass =
  "cursor-pointer font-bold text-blue-600 transition-colors hover:text-blue-700 active:scale-95 dark:text-blue-400";

export const authErrorBoxClass =
  "rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 sm:rounded-2xl dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200";

export const authSuccessBoxClass =
  "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-600 sm:rounded-2xl dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
