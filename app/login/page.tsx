"use client";

import { useState } from "react";
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
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Xử lý Đăng nhập
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (data?.user) {
          // Đồng bộ user vào Prisma DB đề phòng trường hợp chưa có record
          await syncUserInDb(data.user.email || email, data.user.id);
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        // Xử lý Đăng ký
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });

        if (authError) throw authError;

        if (data?.user) {
          // Đồng bộ thông tin user vào Prisma DB
          const syncResult = await syncUserInDb(
            data.user.email || email,
            data.user.id,
            displayName
          );

          if (!syncResult.success) {
            throw new Error(syncResult.error || "Không thể đồng bộ người dùng.");
          }

          // Kiểm tra xem có cần xác nhận email hay không
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
      // Xử lý lỗi Supabase AuthApiError
      let errorMsg = "Đã xảy ra lỗi, vui lòng thử lại.";
      if (err?.message && typeof err.message === "string" && err.message.trim() !== "{}") {
        const msg = err.message.toLowerCase();
        if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
          errorMsg = "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.";
        } else if (msg.includes("email not confirmed")) {
          errorMsg = "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.";
        } else if (msg.includes("rate limit")) {
          errorMsg = "Quá nhiều lần thử. Vui lòng đợi vài phút rồi thử lại.";
        } else if (msg.includes("email address is invalid")) {
          errorMsg = "Địa chỉ email không hợp lệ.";
        } else {
          errorMsg = err.message;
        }
      } else if (err?.error_description) {
        errorMsg = err.error_description;
      } else if (err?.code === "invalid_credentials") {
        errorMsg = "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#FBFBFA]">
      {/* Container chính dạng Faux-OS Window Chrome */}
      <div className="w-full max-w-md bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
        {/* Faux OS Top bar */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-[#FBFBFA] border-bottom border-[#EAEAEA] border-b">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]" />
        </div>

        {/* Nội dung Form */}
        <div className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <h1 className="font-serif text-5xl font-normal tracking-tight text-[#111111] mb-2 italic">
              DI Veo
            </h1>
            <p className="text-sm font-sans text-[#787774] leading-normal max-w-xs mx-auto">
              Ghi lại từng đồng, đừng để tiền đi vèo mà không biết.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#EAEAEA] mb-6">
            <button
              type="button"
              className={`flex-1 pb-2.5 text-sm font-medium transition-all ${
                isLogin
                  ? "border-b border-[#111111] text-[#111111]"
                  : "text-[#787774] hover:text-[#111111]"
              }`}
              onClick={() => {
                setIsLogin(true);
                setError(null);
                setSuccess(null);
              }}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`flex-1 pb-2.5 text-sm font-medium transition-all ${
                !isLogin
                  ? "border-b border-[#111111] text-[#111111]"
                  : "text-[#787774] hover:text-[#111111]"
              }`}
              onClick={() => {
                setIsLogin(false);
                setError(null);
                setSuccess(null);
              }}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label htmlFor="displayName" className="text-xs font-medium text-[#787774] tracking-wide uppercase">
                  Tên hiển thị
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  placeholder="Ví dụ: Huy Khang"
                  className="w-full px-3.5 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-[#111111] text-sm focus:outline-none focus:border-[#111111] transition-colors"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-[#787774] tracking-wide uppercase">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="ten@vi-du.com"
                className="w-full px-3.5 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-[#111111] text-sm focus:outline-none focus:border-[#111111] transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-[#787774] tracking-wide uppercase">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-[#111111] text-sm focus:outline-none focus:border-[#111111] transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="p-3 bg-[#FDEBEC] border border-[#FAD1D3] rounded-md text-xs text-[#9F2F2D] leading-relaxed">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-[#EDF3EC] border border-[#D1E5CF] rounded-md text-xs text-[#346538] leading-relaxed">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-[#111111] text-white text-sm font-medium rounded-md hover:bg-[#333333] transition-colors focus:outline-none disabled:opacity-50 active:scale-[0.98] transform duration-150 flex justify-center items-center"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : isLogin ? (
                "Đăng nhập"
              ) : (
                "Tạo tài khoản"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
