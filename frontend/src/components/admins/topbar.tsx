
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import NotificationsDropdown from "./notifications";

type TopbarProps = {
  userName?: string;
  onToggleSidebar?: () => void;
  onLogout?: () => void;
};

export default function Topbar({
  userName,
  onToggleSidebar,
  onLogout,
}: TopbarProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState(userName || "Admin");
  const [greetingLabel, setGreetingLabel] = React.useState("Xin chào");
  const [openMenu, setOpenMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const syncDisplayName = React.useCallback(() => {
    if (userName && userName.trim()) {
      setDisplayName(userName);
      setGreetingLabel("Xin chào");
      return;
    }
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw
        ? (JSON.parse(raw) as { name?: string; userType?: string; role?: string })
        : null;

      const userType = (parsed?.userType || "").toLowerCase();
      const role = String(parsed?.role || "").toUpperCase();

      if (role === "STAFF") {
        setGreetingLabel("Xin chào nhân viên");
      } else if (role === "ADMIN") {
        setGreetingLabel("Xin chào quản trị viên");
      } else if (userType === "customer") {
        setGreetingLabel("Xin chào nhân viên");
      } else {
        setGreetingLabel("Xin chào");
      }

      const name = parsed?.name || "";
      setDisplayName(name.trim() ? name : "Admin");
    } catch {
      setDisplayName("Admin");
      setGreetingLabel("Xin chào");
    }
  }, [userName]);

  React.useEffect(() => {
    syncDisplayName();
  }, [syncDisplayName]);

  React.useEffect(() => {
    function onUserUpdated() {
      syncDisplayName();
    }
    function onStorage(e: StorageEvent) {
      if (e.key === "user") syncDisplayName();
    }

    window.addEventListener("userUpdated", onUserUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("userUpdated", onUserUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [syncDisplayName]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      const target = e.target as Node;
      if (!menuRef.current.contains(target)) setOpenMenu(false);
    }

    if (openMenu) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenu]);

  return (
    <header className="sticky top-0 z-30 h-20 border-b border-zinc-500/60 bg-[#2a2a2e]/98 shadow-sm shadow-black/10 backdrop-blur-sm transition-colors duration-300 transform-gpu">
      <div className="flex h-full items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="group inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-500/50 bg-zinc-800/80 text-zinc-100 transition hover:bg-zinc-700/90"
            aria-label="Mở/thu gọn sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 transition group-hover:scale-105" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>

          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-zinc-100">Bảng quản trị</div>
            <div className="text-xs text-zinc-400">Cửa hàng điện thoại</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationsDropdown variant="header" />

          <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpenMenu((v) => !v)}
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-500/50 bg-zinc-800/80 px-3 py-2 text-left text-zinc-100 transition hover:bg-zinc-700/90"
            aria-haspopup="menu"
            aria-expanded={openMenu}
          >
            <div className="hidden sm:block">
              <div className="text-xs text-zinc-400">{greetingLabel}</div>
              <div className="max-w-[160px] truncate text-sm font-semibold text-zinc-100">
                {displayName}
              </div>
            </div>
            <div className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-cyan-400 to-fuchsia-500 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/10">
              {displayName.trim().slice(0, 1).toUpperCase() || "A"}
            </div>
            <svg viewBox="0 0 24 24" className={"h-4 w-4 text-slate-600 transition dark:text-slate-300 " + (openMenu ? "rotate-180" : "")}
              fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {openMenu ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950/95 dark:shadow-2xl dark:shadow-black/40"
            >
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-slate-800 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                role="menuitem"
                onClick={() => {
                  setOpenMenu(false);
                  router.push("/profiles");
                }}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                  </svg>
                </span>
                Thông tin cá nhân
              </button>

              <div className="h-px bg-slate-200 dark:bg-white/10" />

              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                role="menuitem"
                onClick={() => {
                  setOpenMenu(false);
                  onLogout?.();
                }}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 17l5-5-5-5" />
                    <path d="M15 12H3" />
                    <path d="M21 3v18" />
                  </svg>
                </span>
                Đăng xuất
              </button>
            </div>
          ) : null}
        </div>
        </div>
      </div>
    </header>
  );
}

