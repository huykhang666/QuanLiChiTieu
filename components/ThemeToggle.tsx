"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Kiểm tra trạng thái đã lưu hoặc cấu hình hệ thống
    const localTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (localTheme) {
      setTheme(localTheme);
      if (localTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const defaultTheme = prefersDark ? "dark" : "light";
      setTheme(defaultTheme);
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!mounted) {
    // Trả về khoảng trống trống để tránh hydration mismatch
    return <div className="w-8 h-8" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 flex items-center justify-center border border-[#EAEAEA] rounded-md bg-white hover:bg-[#F7F6F3] active:scale-[0.98] transition-all focus:outline-none"
      aria-label="Chuyển đổi giao diện"
    >
      {theme === "light" ? (
        // Icon Mặt trăng
        <svg className="w-4.5 h-4.5 text-[#787774]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      ) : (
        // Icon Mặt trời
        <svg className="w-4.5 h-4.5 text-[#787774]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9-9h-2.25C17.75 12 12 17.75 12 21M3 12h2.25m16.5-9l-1.5 1.5M6.75 17.25L5.25 18.75m13.5 0l-1.5-1.5M6.75 6.75L5.25 5.25M12 9a3 3 0 100 6 3 3 0 000-6z" />
        </svg>
      )}
    </button>
  );
}
