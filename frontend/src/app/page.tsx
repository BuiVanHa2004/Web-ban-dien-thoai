"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN;
    if (adminDomain && window.location.hostname === adminDomain) {
      router.replace("/statistical");
    } else {
      router.replace("/home");
    }
  }, [router]);
  return null;
}
