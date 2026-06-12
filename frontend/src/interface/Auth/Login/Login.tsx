
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import { ensureGoogleScriptLoaded } from "@/common/googleAuthClient";
import { GoogleLogoMark } from "@/components/customers/GoogleLogoMark";
import {
  authBadgeClass,
  authErrorBoxClass,
  authFormPanelClass,
  authGhostBtnClass,
  authInputClass,
  authInputWithToggleClass,
  authLabelClass,
  authLinkBtnClass,
  authPrimaryBtnClass,
  authSecondaryBtnClass,
  authSubtitleClass,
  authTitleClass,
  authTogglePasswordBtnClass,
} from "@/interface/Auth/authUi";

export default function Login() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await authService.login({ usernameOrEmail, password });
      if (typeof window !== "undefined") {
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
      }
      if (res.user.userType === "admin") {
        const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN;
        if (adminDomain && typeof window !== "undefined" && !window.location.hostname.includes("admin")) {
          window.location.href = `https://${adminDomain}/statistical`;
        } else {
          router.push("/statistical");
        }
      } else {
        // Customer account: if on admin domain, redirect to customer domain
        const customerDomain = process.env.NEXT_PUBLIC_CUSTOMER_DOMAIN;
        if (customerDomain && typeof window !== "undefined" && window.location.hostname !== customerDomain) {
          window.location.href = `https://${customerDomain}/home`;
        } else {
          router.push("/home");
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Đăng nhập thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Thiếu cấu hình Google Client ID.");
      return;
    }

    setError(null);
    setIsGoogleSubmitting(true);
    try {
      await ensureGoogleScriptLoaded();
      await new Promise<void>((resolve, reject) => {
        if (!window.google?.accounts?.id) return reject(new Error("Google SDK chưa sẵn sàng."));
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            try {
              if (!credential) throw new Error("Không nhận được Google token.");
              const res = await authService.googleAuth({ idToken: credential });

              if (res.status === "LINK_REQUIRED") {
                sessionStorage.setItem(
                  "google-link-pending",
                  JSON.stringify({
                    idToken: credential,
                    email: res.email,
                    fullName: res.fullName,
                    username: res.username,
                  })
                );
                router.push("/signin-google?mode=link");
                return resolve();
              }

              if (!res.auth) throw new Error(res.message || "Đăng nhập Google thất bại.");
              localStorage.setItem("token", res.auth.token);
              localStorage.setItem("user", JSON.stringify(res.auth.user));
              if (res.requiresProfileCompletion) {
                router.push("/signin-google?mode=complete-profile");
              } else if (res.auth.user.userType === "admin") {
                const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN;
                if (adminDomain && !window.location.hostname.includes("admin")) {
                  window.location.href = `https://${adminDomain}/statistical`;
                } else {
                  router.push("/statistical");
                }
              } else {
                const customerDomain = process.env.NEXT_PUBLIC_CUSTOMER_DOMAIN;
                if (customerDomain && window.location.hostname !== customerDomain) {
                  window.location.href = `https://${customerDomain}/home`;
                } else {
                  router.push("/home");
                }
              }
              resolve();
            } catch (err: any) {
              reject(err);
            }
          },
        });
        window.google.accounts.id.prompt();
      });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? "Đăng nhập Google thất bại.");
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <div className={authFormPanelClass}>
      <div
        className={`transition-all duration-700 ease-out will-change-transform ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
      >
        <div className="mb-5 sm:mb-7">
          <div className={authBadgeClass}>
            <span className="text-xs font-bold tracking-wide text-blue-600 dark:text-blue-400">
              MyPhone Store
            </span>
            <span className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-white/10" />
            <span className="text-xs font-medium text-slate-500 dark:text-white/60">Khu vực khách hàng</span>
          </div>
          <h2 className={authTitleClass}>
            Đăng nhập
          </h2>
          <p className={authSubtitleClass}>
            Đăng nhập để xem đơn hàng, ưu đãi và tiếp tục mua sắm.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className={authLabelClass}>Email hoặc Username</label>
            <input
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
              className={authInputClass}
              placeholder="Nhập Username hoặc Email"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label className={authLabelClass}>Mật khẩu</label>

            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                type={showPassword ? "text" : "password"}
                className={authInputWithToggleClass}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className={authTogglePasswordBtnClass}
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                    className="h-4 w-4"
                  >
                    <path
                      fill="currentColor"
                      d="M2.1 3.51 3.51 2.1 21.9 20.49l-1.41 1.41-2.08-2.08A12.2 12.2 0 0 1 12 21C7 21 2.73 17.89 1 13.5c.82-2.09 2.2-3.89 3.95-5.22L2.1 3.51ZM12 7.5c5 0 9.27 3.11 11 7.5a12.7 12.7 0 0 1-2.64 3.86l-3.02-3.02a5.49 5.49 0 0 0-7.18-7.18L7.6 6.1c1.36-.96 2.98-1.5 4.4-1.5Zm0 3A2.5 2.5 0 0 1 14.5 13c0 .33-.07.65-.2.95l-3.25-3.25c.3-.13.62-.2.95-.2Zm-2.45.64L12.86 14.45c-.28.03-.56.05-.86.05A2.5 2.5 0 0 1 9.5 12c0-.3.02-.58.05-.86Z"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                    className="h-4 w-4"
                  >
                    <path
                      fill="currentColor"
                      d="M12 5c5 0 9.27 3.11 11 7.5S17 20 12 20 2.73 16.89 1 12.5 7 5 12 5Zm0 3.5A4 4 0 1 0 12 16.5 4 4 0 0 0 12 8.5Zm0 2A2 2 0 1 1 10 12.5a2 2 0 0 1 2-2Z"
                    />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className={`${authLinkBtnClass} text-sm font-medium`}
              >
                Quên mật khẩu?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={authPrimaryBtnClass}
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleSubmitting}
            className={authSecondaryBtnClass}
          >
            <GoogleLogoMark className="h-5 w-5 shrink-0" />
            {isGoogleSubmitting ? "Đang kết nối Google..." : "Đăng nhập bằng Google"}
          </button>

          {error ? (
            <div className={authErrorBoxClass}>
              {error}
            </div>
          ) : null}

          <p className="pt-2 text-center text-sm text-slate-600 dark:text-white/70">
            Chưa có tài khoản?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              className={authLinkBtnClass}
            >
              Đăng ký ngay
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
