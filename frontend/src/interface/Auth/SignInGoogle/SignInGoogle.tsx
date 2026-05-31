"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/authService";
import {
  authErrorBoxClass,
  authFormPanelClass,
  authInputClass,
  authLabelClass,
  authPrimaryBtnClass,
  authSubtitleClass,
  authTitleClass,
} from "@/interface/Auth/authUi";

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

type PendingLink = {
  idToken: string;
  email?: string;
  fullName?: string;
  username?: string;
};

export default function SignInGoogle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "link";

  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingLink = useMemo<PendingLink | null>(() => {
    try {
      const raw = sessionStorage.getItem("google-link-pending");
      return raw ? (JSON.parse(raw) as PendingLink) : null;
    } catch {
      return null;
    }
  }, []);

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? (JSON.parse(raw) as { id: string; email: string; name: string }) : null;
    } catch {
      return null;
    }
  }, []);

  async function handleLinkGoogle(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingLink?.idToken) {
      setError("Thiếu thông tin Google để liên kết.");
      return;
    }
    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu để liên kết tài khoản.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.linkGoogle({ idToken: pendingLink.idToken, password });
      if (!res.auth) throw new Error(res.message || "Liên kết Google thất bại.");
      localStorage.setItem("token", res.auth.token);
      localStorage.setItem("user", JSON.stringify(res.auth.user));
      sessionStorage.removeItem("google-link-pending");
      if (res.requiresProfileCompletion) {
        router.replace("/signin-google?mode=complete-profile");
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? "Liên kết tài khoản thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser?.id) {
      setError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
      return;
    }
    if (!phone.trim() || !address.trim()) {
      setError("Vui lòng nhập đầy đủ số điện thoại và địa chỉ.");
      return;
    }

    const token = localStorage.getItem("token");
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/customers/${currentUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName: currentUser.name,
          password: null,
          email: currentUser.email,
          phone: phone.trim(),
          address: address.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || "Không thể cập nhật thông tin.");
      }
      router.replace("/");
    } catch (err: any) {
      setError(err?.message || "Không thể cập nhật thông tin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={authFormPanelClass}>
      <h2 className={`${authTitleClass} mt-0`}>
        {mode === "complete-profile" ? "Bổ sung thông tin tài khoản" : "Liên kết tài khoản Google"}
      </h2>
      <p className={authSubtitleClass}>
        {mode === "complete-profile"
          ? "Vui lòng nhập thêm thông tin để hoàn tất đăng nhập Google."
          : "Email đã tồn tại. Nhập mật khẩu để xác thực trước khi liên kết Google."}
      </p>

      {mode === "complete-profile" ? (
        <form onSubmit={handleCompleteProfile} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className={authLabelClass}>Số điện thoại</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              autoComplete="tel"
              className={authInputClass}
              placeholder="Nhập số điện thoại"
            />
          </div>
          <div className="space-y-2">
            <label className={authLabelClass}>Địa chỉ</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="street-address"
              className={authInputClass}
              placeholder="Nhập địa chỉ"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className={authPrimaryBtnClass}
          >
            {submitting ? "Đang lưu..." : "Hoàn tất"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLinkGoogle} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className={authLabelClass}>Mật khẩu tài khoản hiện có</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={authInputClass}
              placeholder="Nhập mật khẩu"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className={authPrimaryBtnClass}
          >
            {submitting ? "Đang liên kết..." : "Liên kết Google"}
          </button>
        </form>
      )}

      {error && (
        <div className={`mt-4 ${authErrorBoxClass}`}>
          {error}
        </div>
      )}
    </div>
  );
}
