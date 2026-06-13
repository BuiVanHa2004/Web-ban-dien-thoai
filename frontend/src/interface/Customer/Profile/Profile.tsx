"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Edit3, 
  Save, 
  X, 
  ShieldCheck, 
  ChevronRight,
  Camera,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { customerAccountService, type CustomerAccountDto, type CustomerAccountCreateUpdatePayload } from "@/services/customerAccountService";
import type { User as AuthUser } from "@/common/types/auth";
import AvatarUploadField from "@/components/avatar/AvatarUploadField";
import { resolveImageUrl } from "@/common/resolveImageUrl";

export default function ProfileInterface() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<CustomerAccountDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showError = (title: string, message: string) => {
    setErrorModal({ open: true, title, message });
  };

  const showSuccess = (title: string, message: string) => {
    setSuccessModal({ open: true, title, message });
  };
  
  // Form states
  const [formData, setFormData] = useState<CustomerAccountCreateUpdatePayload>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    address: "",
    avatarUrl: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFieldKey, setAvatarFieldKey] = useState(0);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setAvatarFile(null);
      setAvatarPreview(null);
      const rawUser = localStorage.getItem("user");
      if (!rawUser) return;
      const user = JSON.parse(rawUser) as AuthUser;
      
      const data = await customerAccountService.getById(Number(user.id));
      setProfile(data);
      setFormData({
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        phone: data.phone || "",
        address: data.address || "",
        avatarUrl: data.avatarUrl || "",
      });
    } catch (err) {
      showToast("Không thể tải thông tin tài khoản", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    try {
      setUpdating(true);
      
      // Upload avatar if there's a new file
      let finalAvatarUrl = formData.avatarUrl;
      if (avatarFile) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", avatarFile);
        
        const token = localStorage.getItem("token");
        const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_URL || "http://localhost:8080"}/api/uploads/avatars`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formDataUpload,
        });
        
        if (!uploadRes.ok) {
          throw new Error("Không thể tải ảnh đại diện lên server.");
        }
        
        const uploadData = await uploadRes.json() as { url: string };
        finalAvatarUrl = uploadData.url;
      }
      
      const updated = await customerAccountService.update(profile.customerId, {
        ...formData,
        avatarUrl: finalAvatarUrl,
      });
      setProfile(updated);
      setFormData(prev => ({...prev, avatarUrl: updated.avatarUrl || ""}));
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarFieldKey((k) => k + 1); // reset AvatarUploadField
      setEditing(false);
      
      // Update local storage name and avatar if changed
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        const u = JSON.parse(rawUser) as AuthUser;
        u.name = updated.fullName;
        u.avatarUrl = updated.avatarUrl || null;
        localStorage.setItem("user", JSON.stringify(u));
        window.dispatchEvent(new Event("userUpdated"));
      }
      
      showSuccess("Cập nhật thành công", "Thông tin cá nhân của bạn đã được lưu lại trên hệ thống.");
    } catch (err: any) {
      showToast(err.message || "Cập nhật thất bại", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword.length < 8) {
      showError("Mật khẩu không hợp lệ", "Mật khẩu mới phải có ít nhất 8 ký tự để đảm bảo tính bảo mật.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError("Xác nhận mật khẩu sai", "Mật khẩu xác nhận không khớp với mật khẩu mới. Vui lòng kiểm tra lại.");
      return;
    }
    
    try {
      setUpdating(true);
      if (!profile) return;
      
      await customerAccountService.changePassword(
        profile.customerId, 
        passwordData.currentPassword, 
        passwordData.newPassword
      );
      
      showSuccess("Đổi mật khẩu thành công", "Mật khẩu đã được thay đổi. Hệ thống sẽ tự động đăng xuất để đảm bảo an toàn.");
      
      // Auto logout after password change
      setTimeout(() => {
        localStorage.clear();
        window.location.href = "/login";
      }, 3500);
      
    } catch (err: any) {
      showError("Cập nhật thất bại", err.message || "Đã có lỗi xảy ra trong quá trình đổi mật khẩu.");
    } finally {
      setUpdating(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen pb-12 sm:pb-20">
      <div className="mx-auto w-full max-w-6xl overflow-x-hidden">
        <div className="mb-6 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <nav className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <span>Trang chủ</span>
              <ChevronRight size={12} />
              <span className="text-purple-600">Tài khoản</span>
            </nav>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
              Thông tin <span className="text-purple-600">Cá nhân</span>
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Quản lý thông tin bảo mật và tùy chỉnh trải nghiệm của bạn.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                <ShieldCheck size={16} />
                <span className="text-xs font-black uppercase">Tài khoản xác thực</span>
             </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Sidebar Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="relative overflow-hidden rounded-3xl customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 p-8 shadow-xl shadow-black/20">
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="h-28 w-28 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-700 p-1 shadow-2xl transition-transform">
                    {profile?.avatarUrl ? (
                      <img 
                        src={resolveImageUrl(profile?.avatarUrl)} 
                        alt={profile?.fullName} 
                        className="h-full w-full rounded-[1.4rem] object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[1.4rem] bg-white dark:bg-slate-900">
                        <span className="text-4xl font-black text-purple-600">
                          {profile?.fullName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <h2 className="text-center text-xl font-black text-slate-900 dark:text-white w-full px-2">
                  {profile?.fullName}
                </h2>
                
                <div className="mt-8 w-full space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3 dark:border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trạng thái</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                      <CheckCircle2 size={14} /> Hoạt động
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
            </div>
            
            <button 
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-900 p-5 text-white transition hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 dark:bg-slate-900/10">
                  <Lock size={20} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black uppercase">Đổi mật khẩu</div>
                  <div className="text-[10px] font-medium opacity-60">Cập nhật mật khẩu định kỳ</div>
                </div>
              </div>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {showPasswordForm ? (
                <motion.div
                  key="password-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-3xl customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 p-8 shadow-xl shadow-black/20"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10">
                        <Lock size={20} />
                      </div>
                      <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">Cài đặt mật khẩu</h3>
                    </div>
                    <button onClick={() => setShowPasswordForm(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                       <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mật khẩu hiện tại</label>
                        <input
                          type="password"
                          required
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition focus:border-rose-500 focus:bg-white dark:border-white/5 dark:bg-white/5 dark:focus:border-rose-500"
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mật khẩu mới</label>
                        <input
                          type="password"
                          required
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition focus:border-purple-500 focus:bg-white dark:border-white/5 dark:bg-white/5 dark:focus:border-purple-500"
                          placeholder="Tối thiểu 8 ký tự"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Xác nhận mật khẩu</label>
                        <input
                          type="password"
                          required
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition focus:border-purple-500 focus:bg-white dark:border-white/5 dark:bg-white/5 dark:focus:border-purple-500"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-50 dark:border-white/5">
                      <div className="flex items-center gap-2 text-slate-400">
                        <AlertCircle size={16} />
                        <span className="text-[10px] font-bold">Lưu ý: Bạn sẽ bị đăng xuất sau khi đổi mật khẩu thành công.</span>
                      </div>
                      <button
                        type="submit"
                        disabled={updating}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-10 py-4 text-sm font-black text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
                      >
                        {updating ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="profile-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-3xl customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 p-8 shadow-xl shadow-black/20"
                >
                  <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10">
                        <User size={20} />
                      </div>
                      <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">Thông tin cơ bản</h3>
                    </div>
                    
                    {!editing ? (
                      <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-2 rounded-xl bg-purple-50 px-5 py-2.5 text-xs font-black text-purple-600 transition hover:bg-purple-100 active:scale-95 dark:bg-purple-500/10 dark:text-purple-400"
                      >
                        <Edit3 size={16} /> Chỉnh sửa
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditing(false);
                            setAvatarFile(null);
                            setAvatarPreview(null);
                            setAvatarFieldKey((k) => k + 1);
                            // Reset form data to original profile data
                            if (profile) {
                              setFormData({
                                fullName: profile.fullName,
                                username: profile.username,
                                email: profile.email,
                                phone: profile.phone || "",
                                address: profile.address || "",
                                avatarUrl: profile.avatarUrl || "",
                              });
                            }
                          }}
                          className="rounded-xl border border-slate-100 px-5 py-2.5 text-xs font-black text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                        >
                          Hủy bỏ
                        </button>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-8">
                    {/* Avatar Upload Section */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950/70">
                      <AvatarUploadField
                        key={`${editing ? 'editing' : 'view'}-${avatarFieldKey}`}
                        label="Ảnh đại diện"
                        value={formData.avatarUrl}
                        name={formData.fullName}
                        helperText="Chọn ảnh tỉ lệ bất kỳ, hệ thống sẽ tự động crop theo tỉ lệ 1:1"
                        disabled={!editing}
                        cropMode="square-required"
                        onChange={setAvatarFile}
                        onPreviewChange={setAvatarPreview}
                      />
                    </div>

                    <div className="grid gap-8 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                          <User size={12} className="text-slate-300" /> Họ và tên
                        </label>
                        <input
                          disabled={!editing}
                          value={formData.fullName}
                          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                          className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition focus:border-purple-500 focus:bg-white disabled:opacity-60 dark:border-white/5 dark:bg-white/5 dark:focus:border-purple-500"
                          placeholder="VD: Nguyễn Văn A"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                          <User size={12} className="text-slate-300" /> Tên đăng nhập
                        </label>
                        <input
                          disabled={true} // Usually username is immutable
                          value={formData.username}
                          className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition disabled:bg-slate-100/50 dark:border-white/5 dark:bg-white/5 dark:disabled:bg-white/10 opacity-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                          <Mail size={12} className="text-slate-300" /> Email liên hệ
                        </label>
                        <input
                          disabled={!editing}
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition focus:border-purple-500 focus:bg-white disabled:opacity-60 dark:border-white/5 dark:bg-white/5 dark:focus:border-purple-500"
                          placeholder="example@gmail.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                          <Phone size={12} className="text-slate-300" /> Số điện thoại
                        </label>
                        <input
                          disabled={!editing}
                          value={formData.phone || ""}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition focus:border-purple-500 focus:bg-white disabled:opacity-60 dark:border-white/5 dark:bg-white/5 dark:focus:border-purple-500"
                          placeholder="09xx xxx xxx"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                          <MapPin size={12} className="text-slate-300" /> Địa chỉ giao hàng
                        </label>
                        <textarea
                          disabled={!editing}
                          value={formData.address || ""}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          rows={3}
                          className="w-full resize-none rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition focus:border-purple-500 focus:bg-white disabled:opacity-60 dark:border-white/5 dark:bg-white/5 dark:focus:border-purple-500"
                          placeholder="Số nhà, tên đường, phường/xã..."
                        />
                      </div>
                    </div>

                    {editing && (
                      <div className="flex justify-end pt-4">
                        <button
                          type="submit"
                          disabled={updating}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-12 py-4 text-sm font-black text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-700 active:scale-95 disabled:opacity-50"
                        >
                          {updating ? "Đang lưu..." : (
                            <>
                              <Save size={18} /> Lưu thay đổi
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Additional info footer */}
            <div className="mt-8 flex items-center gap-4 rounded-3xl bg-amber-50/50 p-6 border border-amber-100 dark:bg-amber-500/5 dark:border-amber-500/10">
               <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <AlertCircle size={24} />
               </div>
               <div>
                  <h4 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-tight">Quyền riêng tư & Bảo mật</h4>
                  <p className="text-xs text-amber-700/70 dark:text-amber-400/60 leading-relaxed mt-0.5">
                    Mọi thông tin của bạn được MyPhone Store bảo mật tuyệt đối theo tiêu chuẩn quốc tế. Chúng tôi không bao giờ chia sẻ dữ liệu của bạn cho bên thứ ba.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className={`fixed bottom-10 left-1/2 z-[200] flex items-center gap-3 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-xl ring-1 ${
              toast.type === "success" 
                ? "bg-emerald-500/90 text-white ring-emerald-400/30" 
                : toast.type === "error"
                ? "bg-rose-500/90 text-white ring-rose-400/30"
                : "bg-slate-900/90 text-white ring-slate-800/30"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 size={20} />}
            {toast.type === "error" && <AlertCircle size={20} />}
            <span className="text-sm font-black tracking-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation/Error Modal */}
      {typeof window !== "undefined" && createPortal(
        <AnimatePresence>
          {errorModal.open && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" 
                onClick={() => setErrorModal({ ...errorModal, open: false })} 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-slate-900"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                    <AlertCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                    {errorModal.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    {errorModal.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => setErrorModal({ ...errorModal, open: false })}
                    className="mt-8 w-full rounded-2xl bg-slate-900 py-4 text-sm font-black text-white shadow-xl transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900"
                  >
                    Đã hiểu
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Success Modal */}
      {typeof window !== "undefined" && createPortal(
        <AnimatePresence>
          {successModal.open && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" 
                onClick={() => setSuccessModal({ ...successModal, open: false })} 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-slate-900"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                    {successModal.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    {successModal.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSuccessModal({ ...successModal, open: false })}
                    className="mt-8 w-full rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white shadow-xl transition hover:bg-emerald-700 active:scale-95"
                  >
                    Tuyệt vời
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
