"use client";

import Link from "next/link";
import AdminActionBar from "@/components/admins/AdminActionBar";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

import { adminAccountService, roleService, RoleDto } from "@/services/adminAccountService";
import ValidationModal from "@/components/admins/ValidationModal";
import AvatarUploadField from "@/components/avatar/AvatarUploadField";
import Avatar from "@/components/avatar/Avatar";

function getRoleLabel(roleName: string) {
  const name = (roleName || "").toUpperCase();
  if (name === "ADMIN") return "Quản trị";
  if (name === "STAFF") return "Nhân viên";
  return roleName;
}

function RoleDropdown({
  roles,
  value,
  disabled,
  onChange,
}: {
  roles: RoleDto[];
  value: number | null;
  disabled: boolean;
  onChange: (next: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const selected = React.useMemo(() => {
    return roles.find((r) => r.roleId === value) || null;
  }, [roles, value]);

  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const el = containerRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const buttonText = React.useMemo(() => {
    if (roles.length === 0) return disabled ? "Đang tải vai trò..." : "Chưa có vai trò";
    if (!selected) return "Chọn vai trò";
    return getRoleLabel(selected.roleName);
  }, [disabled, roles.length, selected]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled || roles.length === 0}
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer h-11 w-full items-center justify-between gap-3 rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
      >
        <span className="truncate">{buttonText}</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-950 dark:ring-white/10">
          <div className="max-h-64 overflow-auto p-1">
            {roles.map((r) => {
              const active = r.roleId === value;
              return (
                <button
                  key={r.roleId}
                  type="button"
                  onClick={() => {
                    onChange(r.roleId);
                    setOpen(false);
                  }}
                  className={
                    "flex cursor-pointer w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm transition " +
                    (active
                      ? "bg-cyan-50 text-slate-900 dark:bg-cyan-500/10 dark:text-slate-100"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5")
                  }
                >
                  <span className="truncate">{getRoleLabel(r.roleName)}</span>
                  {active ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-600 dark:text-cyan-300" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UpdateAccountRole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const adminId = Number(id);

  const [roles, setRoles] = React.useState<RoleDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [fullName, setFullName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [roleId, setRoleId] = React.useState<number | null>(null);
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [validationModal, setValidationModal] = React.useState<{ open: boolean; fields: string[] }>({ open: false, fields: [] });


  React.useEffect(() => {
    (async () => {
      if (!id || Number.isNaN(adminId)) {
        setError("Thiếu id tài khoản.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [dto, rs] = await Promise.all([
          adminAccountService.getById(adminId),
          roleService.getAll(),
        ]);

        setRoles(rs);
        setFullName(dto.fullName || "");
        setUsername(dto.username || "");
        setEmail(dto.email || "");
        setPhone(dto.phone || "");
        setAddress(dto.address || "");
        setAvatarUrl(dto.avatarUrl || null);
        setRoleId(dto.roleId || (rs.length ? rs[0].roleId : null));
      } catch (e: any) {
        setError(e?.message || "Không tìm thấy tài khoản. Vui lòng quay lại danh sách.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, adminId]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const fn = fullName.trim();
    const un = username.trim();
    const em = email.trim();

    const missingFields: string[] = [];
    if (!fn) missingFields.push("Tên người dùng");
    if (!un) missingFields.push("Tên đăng nhập");
    
    if (password.trim() && password.length < 8) {
      missingFields.push("Mật khẩu (phải từ 8 ký tự trở lên)");
    }

    if (!roleId) missingFields.push("Vai trò");

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

    if (!id) {
      setError("Thiếu id tài khoản.");
      return;
    }

    setError(null);
    setSubmitting(true);

    window.setTimeout(async () => {
      try {
        await adminAccountService.update(adminId, {
          fullName: fn,
          username: un,
          password: password.trim() || null,
          roleId: roleId!,
          email: em,
          phone: phone.trim() || null,
          address: address.trim() || null,
          avatarUrl: avatarUrl || null,
        });
        router.push("/accounts-roles");
      } catch (e: any) {
        setError(e?.message || "Không thể cập nhật tài khoản.");
      } finally {
        setSubmitting(false);
      }
    }, 220);
  }

  const formDisabled = loading || !!error;

  const selectedRoleName = React.useMemo(() => {
    if (!roleId) return "-";
    const r = roles.find((x) => x.roleId === roleId);
    return r ? getRoleLabel(r.roleName) : "-";
  }, [roleId, roles]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4 overflow-x-hidden sm:space-y-6">
      <div className="flex flex-col gap-3 pr-28 sm:pr-0 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Cập nhật tài khoản quản trị viên
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Sửa tài khoản admin</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Chỉnh sửa thông tin tài khoản Quản trị/Nhân viên.</p>
        </div>
      </div>

      <AdminActionBar backHref="/accounts-roles" formId="account-form" submitting={submitting} disabled={formDisabled} />

      <div className="mx-auto grid w-full min-w-0 max-w-full grid-cols-1 gap-4 rounded-3xl bg-slate-50/70 p-3 ring-1 ring-slate-200/70 backdrop-blur dark:bg-white/5 dark:ring-white/10 sm:gap-6 sm:p-6 lg:grid-cols-5 pt-14 sm:pt-6">
        <form
          id="account-form"
          onSubmit={onSubmit}
          className="mx-auto w-full min-w-0 max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur dark:hover:shadow-black/40 lg:col-span-3"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Thông tin tài khoản</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Vui lòng nhập đầy đủ thông tin.
            </div>
          </div>

          <div className="space-y-4 p-5">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                Đang tải dữ liệu...
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>
                  {error}
                </div>
              </div>
            ) : null}

            <AvatarUploadField
              label="Ảnh đại diện"
              value={avatarUrl}
              name={fullName || username}
              helperText="Ảnh đại diện (tối đa 2MB, định dạng JPG/PNG/WebP)"
              disabled={formDisabled}
              cropMode="square-required"
              onChange={(file) => {
                setAvatarFile(file);
              }}
              onPreviewChange={setAvatarPreviewUrl}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tên người dùng</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={formDisabled}
                  placeholder="Nhập tên người dùng"
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 disabled:opacity-70 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tên đăng nhập</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={formDisabled}
                  placeholder="Nhập tên đăng nhập"
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 disabled:opacity-70 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Mật khẩu (để trống nếu không đổi)</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={formDisabled}
                  placeholder="Nhập mật khẩu"
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 disabled:opacity-70 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Vai trò</label>
                <RoleDropdown roles={roles} value={roleId} disabled={formDisabled} onChange={(next) => setRoleId(next)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Gmail</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={formDisabled}
                  placeholder="Nhập Gmail"
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 disabled:opacity-70 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Số điện thoại</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={formDisabled}
                  placeholder="Nhập số điện thoại"
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 disabled:opacity-70 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Địa chỉ</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={formDisabled}
                  placeholder="Nhập địa chỉ"
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 disabled:opacity-70 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
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
                  <Avatar 
                    src={avatarUrl} 
                    name={fullName || username}
                    className="h-12 w-12 rounded-full cursor-pointer shrink-0"
                    textClassName="text-base font-semibold"
                  />

                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {fullName.trim() || "Tên người dùng"}
                    </div>
                    <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">{username.trim() || "username"}</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Vai trò: {selectedRoleName}</div>
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

export { UpdateAccountRole };

export default UpdateAccountRole;
