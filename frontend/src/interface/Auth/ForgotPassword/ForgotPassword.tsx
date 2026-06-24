
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
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
  authSubtitleClass,
  authSuccessBoxClass,
  authTitleClass,
  authTogglePasswordBtnClass,
} from "@/interface/Auth/authUi";

type Step = 1 | 2 | 3 | 4;

export default function ForgotPassword() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    if (resendCooldown <= 0) return;

    const t = setInterval(() => {
      setResendCooldown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);

    return () => clearInterval(t);
  }, [step, resendCooldown]);

  function resetFlow() {
    setStep(1);
    setUsernameOrEmail("");
    setCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowPassword(false);
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
    setResendCooldown(0);
  }

  async function onResendOtp() {
    if (step !== 2) return;
    if (isSubmitting) return;
    if (resendCooldown > 0) return;

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      await authService.forgotPasswordIdentify({ usernameOrEmail });
      setSuccess(
        "Nếu tài khoản tồn tại, bạn sẽ nhận được mã xác thực qua email trong vài phút."
      );
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      if (step === 1) {
        await authService.forgotPasswordIdentify({ usernameOrEmail });
        setSuccess(
          "Nếu tài khoản tồn tại, bạn sẽ nhận được mã xác thực qua email trong vài phút."
        );
        setStep(2);
        setResendCooldown(60);
        return;
      }

      if (step === 2) {
        await authService.forgotPasswordVerifyCode({ usernameOrEmail, code });
        setSuccess("Xác thực thành công. Bạn có thể đặt lại mật khẩu.");
        setStep(3);
        return;
      }

      if (step === 3) {
        if (newPassword.length < 8) {
          setError("Mật khẩu phải có tối thiểu 8 ký tự.");
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setError("Mật khẩu xác nhận không khớp.");
          return;
        }

        await authService.forgotPasswordReset({ usernameOrEmail, code, newPassword });
        setSuccess("Đặt lại mật khẩu thành công. Đang chuyển hướng về trang đăng nhập...");
        setStep(4);
        
        // Auto redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
        return;
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message ?? err?.message ?? "Đã xảy ra lỗi. Vui lòng thử lại.";
      
      // Kiểm tra nếu là tài khoản Google
      if (errorMessage === "GOOGLE_ACCOUNT") {
        setError("GOOGLE_LOGIN");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={authFormPanelClass}>
      <div className="mb-5 sm:mb-7">
        <div className={authBadgeClass}>
          <span className="text-xs font-bold tracking-wide text-blue-600 dark:text-blue-400">
            MyPhone Store
          </span>
          <span className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-white/10" />
          <span className="text-xs font-medium text-slate-500 dark:text-white/60">Khôi phục mật khẩu</span>
        </div>
        <h2 className={authTitleClass}>
          Quên mật khẩu
        </h2>
        <p className={authSubtitleClass}>
          {step === 1
            ? "Nhập username hoặc email để hệ thống nhận diện tài khoản."
            : step === 2
              ? "Nhập mã xác thực được gửi về email."
              : step === 3
                ? "Tạo mật khẩu mới cho tài khoản của bạn."
                : "Hoàn tất. Bạn có thể quay lại đăng nhập."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div
          className={`transition-all duration-500 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className={authLabelClass}>Email hoặc Username</label>
              <input
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
                type="text"
                className={authInputClass}
                placeholder="Nhập email hoặc username"
                autoComplete="username"
                disabled={step === 4}
              />
            </div>

            {step >= 2 ? (
              <div className="space-y-2">
                <label className={authLabelClass}>Mã xác thực</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className={authInputClass}
                  placeholder="Nhập mã gồm 6 ký tự"
                  disabled={step !== 2 && step !== 3}
                />

                {step === 2 ? (
                  <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={onResendOtp}
                      disabled={isSubmitting || resendCooldown > 0}
                      className={`${authLinkBtnClass} text-left text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      Gửi lại OTP
                    </button>

                    <span className="text-xs font-medium text-slate-500 sm:text-right dark:text-white/60">
                      {resendCooldown > 0
                        ? `Gửi lại sau ${resendCooldown}s`
                        : "Bạn có thể gửi lại ngay"}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step >= 3 ? (
              <>
                <div className="space-y-2">
                  <label className={authLabelClass}>Mật khẩu mới</label>
                  <div className="relative">
                    <input
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      type={showPassword ? "text" : "password"}
                      className={authInputWithToggleClass}
                      placeholder="Nhập mật khẩu mới"
                      autoComplete="new-password"
                      disabled={step !== 3}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className={authTogglePasswordBtnClass}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
                </div>

                <div className="space-y-2">
                  <label className={authLabelClass}>Nhập lại mật khẩu mới</label>
                  <div className="relative">
                    <input
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      minLength={8}
                      type={showPassword ? "text" : "password"}
                      className={authInputWithToggleClass}
                      placeholder="Nhập lại mật khẩu mới"
                      autoComplete="new-password"
                      disabled={step !== 3}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className={authTogglePasswordBtnClass}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
                </div>
              </>
            ) : null}
          </div>
        </div>

        {success ? (
          <div className={authSuccessBoxClass}>
            {success}
          </div>
        ) : null}

        {error ? (
          error === "GOOGLE_LOGIN" ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                    Tài khoản Google
                  </h3>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    Email này đã được đăng ký bằng tài khoản Google. Vui lòng sử dụng nút <strong>"Đăng nhập với Google"</strong> để đăng nhập.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Đăng nhập với Google
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={authErrorBoxClass}>
              {error}
            </div>
          )
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || step === 4}
          className={authPrimaryBtnClass}
        >
          {isSubmitting
            ? "Đang xử lý..."
            : step === 1
              ? "Gửi mã về email"
              : step === 2
                ? "Xác nhận mã"
                : step === 3
                  ? "Đặt lại mật khẩu"
                  : "Hoàn tất"}
        </button>

        {step !== 1 ? (
          <button
            type="button"
            onClick={resetFlow}
            className={authGhostBtnClass}
          >
            Thử lại từ đầu
          </button>
        ) : null}

        <div className="pt-2 text-center text-sm text-slate-600 dark:text-white/70">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className={authLinkBtnClass}
          >
            Quay lại đăng nhập
          </button>
        </div>
      </form>
    </div>
  );
}
