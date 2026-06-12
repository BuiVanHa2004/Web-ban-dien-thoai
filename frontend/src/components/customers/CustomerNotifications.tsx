"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

type Notification = {
  notificationId: number;
  type: "ORDER" | "CONTACT" | "EVALUATE";
  action: string;
  actorName: string;
  orderId?: number;
  contactId?: number;
  evaluateId?: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type CustomerNotificationsProps = {
  variant?: "default" | "header";
};

export default function CustomerNotifications({ variant = "default" }: CustomerNotificationsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const [resList, resCount] = await Promise.all([
        fetch(`${API_URL}/api/customer/notifications?size=10`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          cache: 'no-store'
        }).catch(() => null),
        fetch(`${API_URL}/api/customer/notifications/unread-count`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          cache: 'no-store'
        }).catch(() => null)
      ]);

      if (resList && resList.ok) {
        const data = await resList.json();
        setNotifications(data.content || []);
      }
      if (resCount && resCount.ok) {
        const countData = await resCount.json();
        setUnreadCount(countData || 0);
      }
    } catch (error) {
      console.warn("Error fetching customer notifications");
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const markAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      await fetch(`${API_URL}/api/customer/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      await fetch(`${API_URL}/api/customer/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const translateMessage = (msg: string) => {
    return msg
      .replace(/PENDING_CONFIRM/g, "Chờ xác nhận")
      .replace(/CONFIRMED/g, "Đã xác nhận")
      .replace(/PENDING_PICKUP/g, "Chờ lấy hàng")
      .replace(/PENDING_SHIPPING/g, "Chờ giao hàng")
      .replace(/SHIPPING/g, "Đang giao hàng")
      .replace(/DELIVERED/g, "Đã giao hàng")
      .replace(/CANCELLED/g, "Đã hủy");
  };

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.notificationId);
    setOpen(false);
    if (notif.type === "ORDER") {
      if (notif.orderId) {
        router.push(`/order/${notif.orderId}`);
      } else {
        router.push(`/order`);
      }
    } else if (notif.type === "EVALUATE") {
      if (notif.orderId) {
        router.push(`/order/${notif.orderId}?scrollToReview=${notif.evaluateId || ""}`);
      } else {
        router.push(`/order`);
      }
    } else if (notif.type === "CONTACT") {
      router.push(`/contact`);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <style>{`
        @keyframes ring {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-10deg); }
          30% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          50% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-ring {
          animation: ring 2s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={
          variant === "header"
            ? "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-500/50 bg-zinc-800/80 text-amber-300 transition hover:bg-zinc-700/90 sm:h-10 sm:w-10"
            : "relative flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100/50 bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100 dark:border-indigo-500/10 dark:bg-indigo-500/10 dark:text-indigo-400"
        }
        aria-label="Thông báo"
      >
        <Bell
          className={`h-[18px] w-[18px] transition sm:h-5 sm:w-5 ${
            unreadCount > 0
              ? variant === "header"
                ? "animate-ring text-amber-300"
                : "animate-ring text-indigo-600 dark:text-indigo-400"
              : ""
          }`}
        />
        {unreadCount > 0 && (
          <span
            className={`absolute flex items-center justify-center rounded-full bg-rose-500 font-black text-white ${
              variant === "header"
                ? "-right-1 -top-1 h-4 min-w-4 px-0.5 text-[9px]"
                : "-right-1.5 -top-1.5 h-5 w-5 text-[10px] shadow-lg shadow-rose-500/20"
            }`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[210] bg-black/40 sm:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className="
              z-[220] flex flex-col overflow-hidden rounded-2xl shadow-xl
              border border-zinc-700/60 bg-[#1e1e22]
              shadow-2xl shadow-black/40
              max-sm:fixed max-sm:inset-x-3 max-sm:top-[calc(env(safe-area-inset-top,0px)+3.5rem)]
              max-sm:max-h-[min(calc(100dvh-5rem),28rem)] max-sm:w-auto
              sm:absolute sm:right-0 sm:mt-2 sm:w-96 sm:max-h-[min(70vh,32rem)]
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-zinc-700/60 px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2">
                <h3 className="shrink-0 text-sm font-semibold text-zinc-100 sm:text-base">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 sm:text-xs">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {unreadCount} chưa đọc
                  </span>
                )}
              </div>
              <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="min-w-0 shrink text-right text-[10px] font-medium leading-snug text-indigo-400 hover:text-indigo-300 transition-colors sm:text-xs"
                  >
                    <span className="sm:hidden">Đọc hết</span>
                    <span className="hidden sm:inline">Đánh dấu tất cả đã đọc</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-300 transition-colors"
                  aria-label="Đóng thông báo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-500">
                  Không có thông báo nào.
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <button
                      key={notif.notificationId}
                      type="button"
                      onClick={() => handleNotificationClick(notif)}
                      className={`flex min-w-0 cursor-pointer flex-col gap-1 border-b border-zinc-700/50 p-3 text-left transition last:border-0 hover:bg-zinc-700/40 sm:p-4 ${
                        !notif.isRead ? "bg-zinc-800/60" : "bg-transparent"
                      }`}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <span className={`min-w-0 break-words text-sm font-semibold ${!notif.isRead ? "text-zinc-100" : "text-zinc-300"}`}>
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                        )}
                      </div>
                      <p className={`min-w-0 break-words text-sm leading-snug ${!notif.isRead ? "text-zinc-300" : "text-zinc-500"}`}>
                        {translateMessage(notif.message)}
                      </p>
                      <span className="text-[11px] font-medium text-indigo-400/80">
                        {new Date(notif.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
