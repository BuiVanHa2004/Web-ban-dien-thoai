"use client";

import AppNotificationProvider from "@/providers/AppNotificationProvider";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppNotificationProvider>{children}</AppNotificationProvider>;
}
