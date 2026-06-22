"use client";

import Link from "next/link";
import AdminActionBar from "@/components/admin/AdminActionBar";
import { useRouter } from "next/navigation";
import React from "react";

import { customerAccountService } from "@/services/customerAccountService";
import ValidationModal from "@/components/admin/ValidationModal";
import AvatarUploadField from "@/components/avatar/AvatarUploadField";

export default function CreateAccount() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [validationModal, setValidationModal] = React.useState<{ open: boolean; fields: string[] }>({ open: false, fields: [] });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fn = fullName.trim();
    const un = username.trim();
    const em = email.trim();
    const pw = password;

    const missingFields: string[] = [];
    if (!fn) missingFields.push("Tên người dùng");
    if (!un) missingFields.push("Tên đăng nhập");
    
    if (!pw.trim()) {
      missingFields.push("Mật khẩu");
    } else if (pw.length < 8) {
      missingFields.push("Mật khẩu (phải từ 8 ký tự trở lên)");
    }

    if (!em) {
      missingFields.push("Gmail");
    } else if (!em.includes("@")) {
      missingFields.push("Gmail (phải chứa ký tự @)");
    }

    if (!phone.trim()) {
      missingFields.push("Số điện thoại");
    } else if (phone.trim().length !== 10 || !/^\d+$/.test(phone.trim())) {
      missingFields.push("Số điện thoại (phải đủ 10 số)");
    }

    if (!address.trim()) missingFields.push("Địa chỉ");

    if (missingFields.length > 0) {
      setValidationModal({ open: true, fields: missingFields });
      return;
    }

    setError(null);
    setSubmitting(true);

    window.setTimeout(async () => {
      try {
        // Upload avatar first if exists
        let uploadedAvatarUrl: string | null = null;
        if (avatarFile) {
          try {
            const formData = new FormData();
            formData.append("file", avatarFile);
            const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || "http://localhost:8080"}/api/uploads/avatars`, {
              method: "POST",
              body: formData,
            });
            if (uploadResponse.ok) {
              const data = await uploadResponse.json();
              uploadedAvatarUrl = data.url || null;
            }
          } catch (uploadError) {
            console.error("Failed to upload avatar:", uploadError);
          }
        }

        await customerAccountService.create({
          fullName: fn,
          username: un,
          password: pw,
          email: em,
          phone: phone.trim() || null,
          address: address.trim() || null,
          avatarUrl: uploadedAvatarUrl,
        });
        router.push("/accounts");
      } catch (e: any) {
        setError(e?.message || "Không thể tạo tài khoản khách hàng.");
      } finally {
        setSubmitting(false);
      }
    }, 220);
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 pr-28 sm:pr-0 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_18px_rgba(232,121,249,0.55)]" />
            Thêm khách hàng
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Thêm khách hàng</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Tạo tài khoản khách hàng mới.</p>
        </div>
      </div>

      <AdminActionBar backHref="/accounts" formId="account-form" submitting={submitting} />

      <div className="mx-auto grid w-full min-w-0 max-w-full grid-cols-1 gap-6 rounded-3xl bg-slate-50/70 p-4 ring-1 ring-slate-200/70 backdrop-blur dark:bg-white/5 dark:ring-white/10 sm:p-6 lg:grid-cols-5 pt-14 sm:pt-4">
        <form
          id="account-form"
          onSubmit={onSubmit}
          className="mx-auto w-full min-w-0 max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur dark:hover:shadow-black/40 lg:col-span-3"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Thông tin tài khoản</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Vui lòng nhập đầy đủ thông tin.</div>
          </div>

          <div className="space-y-4 p-5">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="mb-5">
              <AvatarUploadField
                label="Ảnh đại diện"
                value={avatarUrl}
                name={fullName || username}
                helperText="Khách hàng có thể tải ảnh ở mọi tỉ lệ, hệ thống sẽ tự động crop thành hình vuông 1:1."
                cropMode="square-required"
                onChange={(file) => {
                  setAvatarFile(file);
                }}
                onPreviewChange={setAvatarPreviewUrl}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tên người dùng</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập tên người dùng"
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tên đăng nhập</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Mật khẩu</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Gmail</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập Gmail"
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Số điện thoại</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Nhập số điện thoại"
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Địa chỉ</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Nhập địa chỉ"
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                />
              </div>
            </div>
          </div>
        </form>

        <div className="mx-auto w-full min-w-0 max-w-full lg:col-span-2">
          <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur dark:hover:shadow-black/40">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Xem trước</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Card tài khoản hiển thị ở danh sách.</div>
            </div>
            <div className="p-5">
              <div className="rounded-3xl bg-white/60 p-4 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-slate-950/45 dark:ring-white/10 dark:shadow-2xl dark:shadow-black/40">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                    {(avatarPreviewUrl || avatarUrl) ? (
                      <img src={avatarPreviewUrl || avatarUrl || ''} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-base font-semibold text-slate-700 dark:text-slate-100">
                        {(fullName.trim() || username.trim() || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {fullName.trim() || "Tên người dùng"}
                    </div>
                    <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">{username.trim() || "username"}</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Vai trò: Khách hàng</div>
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 truncate">
                      {email.trim() || "email@gmail.com"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                Tip: Mật khẩu sẽ không hiển thị ở card xem trước.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ValidationModal
        open={validationModal.open}
        fields={validationModal.fields}
        onClose={() => setValidationModal({ open: false, fields: [] })}
      />
    </div>
  );
}