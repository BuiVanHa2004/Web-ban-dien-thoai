
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import NotificationsDropdown from "./notifications";
import Avatar from "@/components/avatar/Avatar";

type TopbarProps = {
  userName?: string;
  userAvatarUrl?: string | null;
  onToggleSidebar?: () => void;
  onLogout?: () => void;
};

export default function Topbar({
  userName,
  userAvatarUrl,
  onToggleSidebar,
  onLogout,
}: TopbarProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState(userName || "Admin");
  const [displayAvatarUrl, setDisplayAvatarUrl] = React.useState<string | null>(userAvatarUrl || null);
  const [greetingLabel, setGreetingLabel] = React.useState("Xin chào");
  const [openMenu, setOpenMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const syncDisplayName = React.useCallback(() => {
    if (userName && userName.trim()) {
      setDisplayName(userName);
      setDisplayAvatarUrl(userAvatarUrl || null);
      setGreetingLabel("Xin chào");
      return;
    }
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw
        ? (JSON.parse(raw) as { name?: string; avatarUrl?: string | null; userType?: string; role?: string })
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
      setDisplayAvatarUrl(parsed?.avatarUrl || null);
    } catch {
      setDisplayName("Admin");
      setDisplayAvatarUrl(userAvatarUrl || null);
      setGreetingLabel("Xin chào");
    }
  }, [userAvatarUrl, userName]);

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
    <header className="sticky top-0 z-30 h-20 border-b border-slate-200/80 bg-white/98 shadow-sm shadow-slate-200/30 backdrop-blur-sm transition-colors duration-300 transform-gpu">
      <div className="flex h-full items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="group inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 text-slate-700 transition hover:bg-slate-100"
            aria-label="Mở/thu gọn sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 transition group-hover:scale-105" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>

          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-slate-800">Bảng quản trị</div>
            <div className="text-xs text-slate-500">Cửa hàng điện thoại</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationsDropdown variant="header" />

          <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpenMenu((v) => !v)}
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-left text-slate-800 transition hover:bg-slate-100"
            aria-haspopup="menu"
            aria-expanded={openMenu}
          >
            <div className="hidden sm:block">
              <div className="text-xs text-slate-500">{greetingLabel}</div>
              <div className="max-w-[160px] truncate text-sm font-semibold text-slate-800">
                {displayName}
              </div>
            </div>
            <Avatar
              src={displayAvatarUrl}
              name={displayName}
              className="h-9 w-9 rounded-2xl shadow-lg shadow-cyan-500/10"
              textClassName="text-sm font-semibold"
            />
            <svg viewBox="0 0 24 24" className={"h-4 w-4 text-slate-500 transition " + (openMenu ? "rotate-180" : "")}
              fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {openMenu ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-slate-800 transition hover:bg-slate-50"
                role="menuitem"
                onClick={() => {
                  setOpenMenu(false);
                  router.push("/profiles");
                }}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                  </svg>
                </span>
                Thông tin cá nhân
              </button>

              <div className="h-px bg-slate-200" />

              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-rose-700 transition hover:bg-rose-50"
                role="menuitem"
                onClick={() => {
                  setOpenMenu(false);
                  onLogout?.();
                }}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700 ring-1 ring-rose-200">
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

