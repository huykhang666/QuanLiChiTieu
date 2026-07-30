"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { syncUserInDb } from "./actions";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        if (data?.user) {
          await syncUserInDb(data.user.email || email, data.user.id);
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: displayName } },
        });
        if (authError) throw authError;
        if (data?.user) {
          const syncResult = await syncUserInDb(data.user.email || email, data.user.id, displayName);
          if (!syncResult.success) throw new Error(syncResult.error || "Không thể đồng bộ người dùng.");
          if (data.session) {
            setSuccess("Đăng ký thành công! Đang chuyển hướng...");
            setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1500);
          } else {
            setSuccess("Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.");
          }
        }
      }
    } catch (err: any) {
      let msg = "Đã xảy ra lỗi, vui lòng thử lại.";
      if (err?.message && typeof err.message === "string" && err.message.trim() !== "{}") {
        const m = err.message.toLowerCase();
        if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) msg = "Email hoặc mật khẩu không đúng.";
        else if (m.includes("email not confirmed")) msg = "Email chưa được xác nhận. Kiểm tra hộp thư nhé.";
        else if (m.includes("rate limit")) msg = "Quá nhiều lần thử. Vui lòng đợi vài phút.";
        else if (m.includes("email address is invalid")) msg = "Địa chỉ email không hợp lệ.";
        else msg = err.message;
      } else if (err?.code === "invalid_credentials") msg = "Email hoặc mật khẩu không đúng.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left: Brand Panel ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col items-center justify-center p-12 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
        <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #065f46 0%, transparent 70%)" }} />

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Custom text logo since SVG colors don't contrast well on green */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center shadow-2xl border border-white/30">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-4xl font-black text-white tracking-tight drop-shadow">DI VEO</h2>
              <p className="text-emerald-100 text-sm font-semibold tracking-[0.2em] mt-1">QUẢN LÝ CHI TIÊU</p>
            </div>
          </div>

          <div className="mt-2 text-center max-w-sm">
            <p className="text-lg font-medium leading-relaxed text-white/90">
              Ghi lại từng đồng, đừng để tiền đi vèo mà không biết.
            </p>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {["📊 Báo cáo chi tiết", "🎯 Đặt mục tiêu", "⚡ Ghi chép nhanh", "💰 Kiểm soát hạn mức"].map((f) => (
              <span key={f} className="px-3.5 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Auth Form ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen lg:min-h-0 p-6 sm:p-10 bg-white dark:bg-slate-900 transition-colors">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-center">
            <span className="text-xl font-black text-slate-900">DI Veo</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Quản lý chi tiêu</span>
          </div>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLogin ? "Chào mừng trở lại 👋" : "Tạo tài khoản mới ✨"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              {isLogin
                ? "Đăng nhập để xem tổng quan tài chính của bạn."
                : "Bắt đầu quản lý chi tiêu thông minh hơn."}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-7">
            {[{ key: true, label: "Đăng nhập" }, { key: false, label: "Đăng ký" }].map(({ key, label }) => (
              <button
                key={String(key)}
                type="button"
                onClick={() => { setIsLogin(key); setError(null); setSuccess(null); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  isLogin === key
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label htmlFor="displayName" className="text-xs font-semibold text-[#787774] uppercase tracking-wider">
                  Tên hiển thị
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  placeholder="Ví dụ: Huy Khang"
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all placeholder-slate-400 dark:placeholder-slate-500"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-[#787774] uppercase tracking-wider">Email</label>
              <input
                id="email"
                type="email"
                required
                placeholder="ten@vi-du.com"
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all placeholder-slate-400 dark:placeholder-slate-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-[#787774] uppercase tracking-wider">Mật khẩu</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 border border-[#EAEAEA] rounded-xl bg-white text-[#111111] text-sm focus:outline-none focus:border-[#2FBF9F] focus:ring-2 focus:ring-[#2FBF9F]/15 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#BABABA] hover:text-[#787774] transition-colors"
                >
                  {showPass ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-[#FDEBEC] border border-[#FAD1D3] rounded-xl text-xs text-[#9F2F2D] leading-relaxed">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2.5 p-3.5 bg-[#EDF7F2] border border-[#B8E0CA] rounded-xl text-xs text-[#16A34A] leading-relaxed">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 text-white text-sm font-black rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 bg-gradient-to-r from-emerald-600 to-green-500"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isLogin ? "Đăng nhập →" : "Tạo tài khoản →"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-300 dark:text-slate-600 mt-8">
            DI Veo · Quản lý chi tiêu cá nhân
          </p>
        </div>
      </div>
    </main>
  );
}
