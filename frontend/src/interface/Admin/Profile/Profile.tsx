"use client";

import React from "react";
import { RefreshCcw } from "lucide-react";
import { useAppNotification } from "@/providers/AppNotificationProvider";
import Avatar from "@/components/avatar/Avatar";
import AvatarUploadField from "@/components/avatar/AvatarUploadField";

type AdminAccountDto = {
  accountId: number;
  fullName: string;
  username: string;
  password: string;
  roleId: number | null;
  roleName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Token không hợp lệ. Vui lòng đăng nhập lại.");
    }
    let message = "Có lỗi xảy ra.";
    try {
      const data = (await res.json()) as { message?: string };
      message = data?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function getCurrentUserId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; userType?: string };
    if (!parsed?.id) return null;
    if ((parsed.userType || "").toLowerCase() !== "admin") return null;
    const n = Number(parsed.id);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

type TabKey = "info" | "password";

export default function Profile() {
  const { showToast } = useAppNotification();
  const [tab, setTab] = React.useState<TabKey>("info");
  const [loading, setLoading] = React.useState(true);
  const [savingInfo, setSavingInfo] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [account, setAccount] = React.useState<AdminAccountDto | null>(null);

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [avatarFieldKey, setAvatarFieldKey] = React.useState(0);

  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const loadProfile = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setAvatarFile(null);
    setAvatarPreview(null);

    const userId = getCurrentUserId();
    if (!userId) {
      setLoading(false);
      setAccount(null);
      setError("Không tìm thấy thông tin đăng nhập admin.");
      return;
    }

    try {
      const data = await requestJson<AdminAccountDto>(`/admin-accounts/${userId}`);
      setAccount(data);
      setFullName(data.fullName || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
      setAvatarUrl(data.avatarUrl || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải thông tin.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function onSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!account) return;

    if (!fullName.trim()) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (!account.roleId) {
      setError("Tài khoản chưa có vai trò (role). Không thể cập nhật.");
      return;
    }

    setSavingInfo(true);
    try {
      // Upload avatar if there's a new file
      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        
        const uploadRes = await fetch(`${API_URL}/api/uploads/avatars`, {
          method: "POST",
          headers: getAuthHeader(),
          body: formData,
        });
        
        if (!uploadRes.ok) {
          throw new Error("Không thể tải ảnh đại diện lên server.");
        }
        
        const uploadData = await uploadRes.json() as { url: string };
        finalAvatarUrl = uploadData.url;
      }
      
      const updated = await requestJson<AdminAccountDto>(`/admin-accounts/${account.accountId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            fullName: fullName.trim(),
            username: account.username,
            roleId: account.roleId,
            email: email.trim(),
            phone: phone.trim() || null,
            address: address.trim() || null,
            avatarUrl: finalAvatarUrl,
          }),
        }
      );
      setAccount(updated);
      setAvatarUrl(updated.avatarUrl || null);
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarFieldKey((k) => k + 1); // reset AvatarUploadField
      showToast("Cập nhật thông tin thành công.", "success");

      try {
        const raw = localStorage.getItem("user");
        const parsed = raw ? (JSON.parse(raw) as any) : null;
        if (parsed) {
          localStorage.setItem(
            "user",
            JSON.stringify({ ...parsed, name: updated.fullName, avatarUrl: updated.avatarUrl || null })
          );
          window.dispatchEvent(new Event("userUpdated"));
        }
      } catch {
        // ignore
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật thất bại.");
    } finally {
      setSavingInfo(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!account) return;

    if (!oldPassword.trim()) {
      setError("Vui lòng nhập mật khẩu cũ.");
      return;
    }
    if (!newPassword.trim()) {
      setError("Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }
    if (!account.roleId) {
      setError("Tài khoản chưa có vai trò (role). Không thể cập nhật.");
      return;
    }

    setSavingPassword(true);
    try {
      await requestJson<AdminAccountDto>(`/admin-accounts/${account.accountId}/change-password`, {
        method: "POST",
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Đổi mật khẩu thành công.", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đổi mật khẩu thất bại.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">Thông tin cá nhân</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Quản trị viên/Nhân viên có thể cập nhật thông tin và đổi mật khẩu
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadProfile()}
          disabled={loading}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:w-auto"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Tải lại
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setTab("info");
              setError(null);
            }}
            className={
              "h-10 rounded-xl px-4 text-sm font-semibold ring-1 transition " +
              (tab === "info"
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-slate-100 text-slate-900 ring-slate-200 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/10")
            }
          >
            Cập nhật thông tin
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("password");
              setError(null);
            }}
            className={
              "h-10 rounded-xl px-4 text-sm font-semibold ring-1 transition " +
              (tab === "password"
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-slate-100 text-slate-900 ring-slate-200 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/10")
            }
          >
            Đổi mật khẩu
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
            <div className="flex flex-col items-center text-center">
              <Avatar
                src={avatarUrl}
                name={fullName || account?.username}
                className="h-24 w-24 rounded-3xl"
                textClassName="text-3xl font-black"
              />
              <div className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
                {fullName || account?.username || "Tài khoản"}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                Ảnh đại diện hiển thị theo khung vuông 1:1 trên toàn bộ website.
              </div>
            </div>
            <div className="mt-5 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-300">Username</span>
                <span className="max-w-[60%] truncate font-semibold">{account?.username || "-"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-300">Vai trò</span>
                <span className="font-semibold">{account?.roleName || "-"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-300">Email</span>
                <span className="max-w-[60%] truncate font-semibold">{account?.email || "-"}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {loading ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                Đang tải dữ liệu...
              </div>
            ) : tab === "info" ? (
              <form onSubmit={onSaveInfo} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                <div className="mb-5">
                  <AvatarUploadField
                    key={`avatar-${account?.accountId || 'new'}-${avatarFieldKey}`}
                    label="Ảnh đại diện"
                    value={avatarUrl}
                    name={fullName || account?.username}
                    helperText="Admin và nhân viên có thể tải ảnh ở mọi tỉ lệ, website sẽ hiển thị trong khung vuông 1:1."
                    onChange={setAvatarFile}
                    onPreviewChange={setAvatarPreview}
                    cropMode="square-required"
                  />
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                        setAvatarFieldKey((k) => k + 1);
                      }}
                      className="mt-2 text-xs text-slate-500 underline hover:text-rose-500 dark:text-slate-400"
                    >
                      Hủy ảnh vừa chọn
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Họ và tên</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-slate-400 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-white/30"
                      placeholder="Nhập họ và tên"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-slate-400 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-white/30"
                      placeholder="Nhập email"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Số điện thoại</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-slate-400 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-white/30"
                      placeholder="Nhập số điện thoại"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Địa chỉ</label>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-slate-400 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-white/30"
                      placeholder="Nhập địa chỉ"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingInfo}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingInfo ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={onChangePassword} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Mật khẩu cũ</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-slate-400 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-white/30"
                      placeholder="Nhập mật khẩu cũ"
                    />
                  </div>
                  <div className="hidden sm:block" />
                  <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Mật khẩu mới</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-slate-400 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-white/30"
                      placeholder="Nhập mật khẩu mới"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Xác nhận mật khẩu</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-slate-400 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-white/30"
                      placeholder="Nhập lại mật khẩu"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingPassword ? "Đang cập nhật..." : "Đổi mật khẩu"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
