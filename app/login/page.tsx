"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const [hasBioAuth, setHasBioAuth] = useState(false);
  const [showBioPrompt, setShowBioPrompt] = useState(false);
  const [tempSession, setTempSession] = useState<any>(null);

  const router = useRouter();
  const supabase = createClient();

  // Kiểm tra thiết bị có hỗ trợ vân tay và đã kích hoạt chưa
  useEffect(() => {
    const checkBiometrics = async () => {
      const bioEnabled = localStorage.getItem("bio_auth_enabled") === "true";
      const hasToken = !!localStorage.getItem("bio_refresh_token");
      
      // Hỗ trợ WebAuthn?
      const isBiometricSupported = 
        typeof window !== "undefined" && 
        window.PublicKeyCredential && 
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

      if (bioEnabled && hasToken && isBiometricSupported) {
        setHasBioAuth(true);
        // Tự động gọi quét vân tay ngay khi load trang
        triggerBiometricLogin();
      }
    };
    checkBiometrics();
  }, []);

  // Thực hiện quét vân tay & đăng nhập
  const triggerBiometricLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const savedEmail = localStorage.getItem("bio_email") || "";
      const savedRefreshToken = localStorage.getItem("bio_refresh_token") || "";

      if (!savedRefreshToken) {
        throw new Error("Không tìm thấy dữ liệu vân tay trên thiết bị này.");
      }

      // 1. Gọi pop-up quét vân tay của điện thoại / máy tính
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000,
        }
      });

      // 2. Vân tay khớp -> Phục hồi session của Supabase
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: "",
        refresh_token: savedRefreshToken,
      });

      if (sessionError) throw sessionError;

      if (data?.user && data?.session) {
        // Cập nhật lại refresh token mới nhất vừa được sinh ra để dùng cho lần sau
        localStorage.setItem("bio_refresh_token", data.session.refresh_token);
        await syncUserInDb(data.user.email || savedEmail, data.user.id);
        
        setSuccess("Đăng nhập bằng vân tay thành công! 🔑");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      console.error("Lỗi xác thực vân tay:", err);
      // Hủy hoặc lỗi quét vân tay -> Chỉ hiện thông báo lỗi nhẹ, để người dùng gõ mật khẩu
      if (err.name !== "NotAllowedError") {
        setError("Xác thực vân tay thất bại. Vui lòng nhập mật khẩu.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Đăng ký vân tay mới sau khi đăng nhập password thành công
  const handleRegisterBiometrics = async (session: any, user: any) => {
    setShowBioPrompt(false);
    setLoading(true);
    try {
      // 1. Hiện pop-up tạo khóa vân tay
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "DI Veo", id: window.location.hostname },
          user: {
            id: Uint8Array.from(user.id, c => c.charCodeAt(0)),
            name: user.email,
            displayName: user.email,
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
          authenticatorSelection: { 
            authenticatorAttachment: "platform", 
            userVerification: "required" 
          },
          timeout: 60000,
        }
      });

      // 2. Lưu token vào localStorage
      localStorage.setItem("bio_auth_enabled", "true");
      localStorage.setItem("bio_refresh_token", session.refresh_token);
      localStorage.setItem("bio_email", user.email);
      
      setSuccess("Kích hoạt đăng nhập vân tay thành công cho thiết bị này! 🎉");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error("Lỗi đăng ký vân tay:", err);
      setError("Không thể đăng ký vân tay. Tiếp tục vào dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        
        if (data?.user && data?.session) {
          await syncUserInDb(data.user.email || email, data.user.id);
          
          // Kiểm tra xem thiết bị này đã bật vân tay chưa
          const bioEnabled = localStorage.getItem("bio_auth_enabled") === "true";
          const isBiometricSupported = 
            typeof window !== "undefined" && 
            window.PublicKeyCredential && 
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

          if (!bioEnabled && isBiometricSupported) {
            // Lưu session tạm để chờ người dùng đồng ý bật vân tay
            setTempSession({ session: data.session, user: data.user });
            setShowBioPrompt(true);
          } else {
            // Đã bật rồi hoặc thiết bị không hỗ trợ -> Vào thẳng dashboard
            if (bioEnabled) {
              // Cập nhật lại refresh token mới nhất
              localStorage.setItem("bio_refresh_token", data.session.refresh_token);
            }
            router.push("/dashboard");
            router.refresh();
          }
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
            setTimeout(() => { 
              router.push("/dashboard"); 
              router.refresh(); 
            }, 1500);
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
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
        <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #065f46 0%, transparent 70%)" }} />

        <div className="relative z-10 flex flex-col items-center gap-8">
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
            <span className="text-xl font-black text-slate-900 dark:text-white">DI Veo</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 block">Quản lý chi tiêu</span>
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
                <label htmlFor="displayName" className="text-xs font-semibold text-[#787774] dark:text-slate-400 uppercase tracking-wider">
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
              <label htmlFor="email" className="text-xs font-semibold text-[#787774] dark:text-slate-400 uppercase tracking-wider">Email</label>
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
              <label htmlFor="password" className="text-xs font-semibold text-[#787774] dark:text-slate-400 uppercase tracking-wider">Mật khẩu</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all placeholder-slate-400 dark:placeholder-slate-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
              className="w-full mt-2 py-3.5 text-white text-sm font-black rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none bg-gradient-to-r from-emerald-600 to-green-500"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isLogin ? "Đăng nhập →" : "Tạo tài khoản →"}
            </button>

            {/* Vân tay nhanh dành cho user đã bật sinh trắc học */}
            {isLogin && hasBioAuth && (
              <button
                type="button"
                onClick={triggerBiometricLogin}
                disabled={loading}
                className="w-full mt-1.5 py-3 border border-emerald-500 dark:border-emerald-600/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a13.915 13.915 0 00-3.1-8.7A8 8 0 000 8c0 3.86 3.14 7 7 7a6.97 6.97 0 003.89-1.2M12 11c0-3.517 1.009-6.799 2.753-9.571m-3.44 2.04l-.054-.09A13.916 13.916 0 0015 11c0 3.86-3.14 7-7 7a6.97 6.97 0 00-3.89-1.2M12 11a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Xác thực bằng Vân tay / FaceID
              </button>
            )}
          </form>

          <p className="text-center text-xs text-slate-300 dark:text-slate-600 mt-8">
            DI Veo · Quản lý chi tiêu cá nhân
          </p>
        </div>
      </div>

      {/* ── Popup hỏi kích hoạt Vân tay / FaceID ── */}
      {showBioPrompt && tempSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a13.915 13.915 0 00-3.1-8.7A8 8 0 000 8c0 3.86 3.14 7 7 7a6.97 6.97 0 003.89-1.2M12 11c0-3.517 1.009-6.799 2.753-9.571m-3.44 2.04l-.054-.09A13.916 13.916 0 0015 11c0 3.86-3.14 7-7 7a6.97 6.97 0 00-3.89-1.2M12 11a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Kích hoạt vân tay?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Bạn có muốn sử dụng Vân tay / FaceID để đăng nhập nhanh hơn vào lần sau trên thiết bị này không?
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowBioPrompt(false);
                  router.push("/dashboard");
                  router.refresh();
                }}
                className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-xl transition-all"
              >
                Để sau
              </button>
              <button
                onClick={() => handleRegisterBiometrics(tempSession.session, tempSession.user)}
                className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
              >
                Kích hoạt ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
