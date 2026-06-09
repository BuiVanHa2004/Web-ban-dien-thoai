
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/customers/Logo";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/signin-google") return;
    try {
      const token = localStorage.getItem("token");
      const userRaw = localStorage.getItem("user");
      const user = userRaw ? (JSON.parse(userRaw) as { userType?: string }) : null;

      if (!token || !user || !user.userType) return;

      const next = user.userType === "admin" ? "/statistical" : "/";
      router.replace(next);
    } catch {
      // ignore
    }
  }, [router]);

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden overflow-y-auto bg-[#0f172a] selection:bg-blue-100 selection:text-blue-900 supports-[min-height:100dvh]:min-h-dvh">
      {/* Background Ornaments & Stars */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Deep Space Grey Overlay - Mixed with a hint of blue */}
        <div className="absolute inset-0 bg-slate-900/40" />
        
        {/* Twinkling CSS Stars - Using inline style for animation to avoid JSX hash mismatch */}
        <div className="absolute inset-0 opacity-40" 
             style={{
               backgroundImage: `
                 radial-gradient(1px 1px at 20px 30px, white, transparent),
                 radial-gradient(1.5px 1.5px at 40px 70px, white, transparent),
                 radial-gradient(2px 2px at 50px 160px, white, transparent),
                 radial-gradient(1px 1px at 90px 40px, white, transparent),
                 radial-gradient(2px 2px at 130px 80px, white, transparent),
                 radial-gradient(1.5px 1.5px at 160px 120px, white, transparent)
               `,
               backgroundSize: '250px 250px',
               animation: 'twinkle 4s ease-in-out infinite'
             }} 
        />
        <div className="absolute inset-0 opacity-20" 
             style={{
               backgroundImage: `
                 radial-gradient(1px 1px at 100px 100px, white, transparent),
                 radial-gradient(2px 2px at 150px 150px, white, transparent),
                 radial-gradient(1.5px 1.5px at 200px 200px, white, transparent),
                 radial-gradient(1px 1px at 250px 250px, white, transparent)
               `,
               backgroundSize: '350px 350px',
               backgroundPosition: '100px 100px',
               animation: 'twinkle 4s ease-in-out infinite',
               animationDelay: '2s'
             }} 
        />

        {/* Soft Light Blue Glows */}
        <div className="absolute -top-[10%] -right-[10%] h-[70%] w-[70%] rounded-full bg-blue-500/5 blur-[180px] animate-pulse" />
        <div className="absolute -bottom-[10%] -left-[10%] h-[70%] w-[70%] rounded-full bg-indigo-500/5 blur-[180px] animate-pulse delay-700" />
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes auth-page-enter {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-auth-page {
          animation: auth-page-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl items-center justify-center px-3 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10 md:min-h-screen md:py-12">
        <div className="grid w-full grid-cols-1 overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:rounded-[2rem] md:grid-cols-2 dark:border-white/10 dark:bg-slate-900/80">

          {/* Left Section - Content/Branding */}
          <div className="relative hidden w-full flex-col items-center justify-center border-r border-slate-200/20 bg-purple-50/50 p-10 md:flex dark:bg-purple-900/10">
            <div className="relative z-10 w-full max-w-md">
              <div className="mb-10">
                <Link href="/home">
                  <Logo variant="default" />
                </Link>
              </div>

              <div className="space-y-6">
                <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-white lg:text-5xl">
                  Mua điện thoại <br />
                  <span className="text-blue-600 dark:text-blue-400">
                    dễ dàng hơn
                  </span>
                </h2>

                <p className="text-base font-medium leading-relaxed text-slate-950 dark:text-white">
                  Khám phá những mẫu smartphone mới nhất với mức giá ưu đãi và dịch vụ hậu mãi hàng
                  đầu Việt Nam.
                </p>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  {[
                    { label: "Giao hàng", value: "24 giờ", textColor: "text-blue-600 dark:text-blue-400" },
                    { label: "Bảo hành", value: "12 tháng", textColor: "text-orange-500 dark:text-orange-400" },
                    { label: "Đổi trả", value: "7 ngày", textColor: "text-emerald-500 dark:text-emerald-400" },
                  ].map((stat, i) => (stat &&
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:shadow-md dark:border-white/5 dark:bg-white/5"
                    >
                      <div className="relative z-10">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-black dark:text-white/80">
                          {stat.label}
                        </div>
                        <div className={`text-lg font-bold ${stat.textColor}`}>
                          {stat.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative mt-10 rounded-[2rem] bg-slate-900 p-6 shadow-2xl dark:bg-white/10 dark:backdrop-blur-xl">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-2 ring-slate-800 dark:ring-white/20">
                      <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                        alt="User avatar"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex gap-0.5 text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <p className="mt-2 text-xs font-medium leading-relaxed text-slate-300 dark:text-slate-300">
                        "Dịch vụ tuyệt vời, nhân viên hỗ trợ nhiệt tình. Tôi rất hài lòng."
                      </p>
                      <div className="mt-2 text-[10px] font-bold text-white dark:text-white">
                        Nguyễn Trà Giang <span className="mx-1 text-slate-500">•</span> Khách hàng
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Form Area */}
          <div className="relative flex w-full flex-col items-center justify-center bg-white/85 p-6 backdrop-blur-sm dark:bg-slate-900/85 md:p-10">
            <div className="mb-5 md:hidden">
              <Link href="/home" className="flex items-center gap-2">
                <Logo variant="header" />
                <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                  MyPhone <span className="text-blue-500">Store</span>
                </span>
              </Link>
            </div>
            <div className="w-full max-w-md animate-auth-page">
              {children}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}