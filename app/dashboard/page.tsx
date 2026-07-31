"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import QuickAddModal from "@/components/QuickAddModal";
import NavDrawer from "@/components/NavDrawer";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface SummaryData {
  today: { income: number; expense: number };
  week: { income: number; expense: number };
  month: { income: number; expense: number };
  suggestedSavings: number;
  chartData: { date: string; income: number; expense: number }[];
  budgetWarnings?: {
    categoryId: string; categoryName: string;
    limit: number; spent: number; percentage: number;
  }[];
}

type DrawerSection = "transactions" | "summary" | "budgets" | "goals" | "settings";

const NAV_LINKS: { label: string; section: DrawerSection }[] = [
  { label: "Giao dịch", section: "transactions" },
  { label: "Báo cáo", section: "summary" },
  { label: "Hạn mức", section: "budgets" },
  { label: "Mục tiêu", section: "goals" },
  { label: "Cài đặt", section: "settings" },
];

const QUICK_LINKS: {
  label: string; section: DrawerSection; emoji: string;
  gradient: string;
}[] = [
  { label: "Giao dịch", section: "transactions", emoji: "📋", gradient: "from-blue-500 to-blue-600" },
  { label: "Hạn mức", section: "budgets", emoji: "📊", gradient: "from-amber-400 to-orange-500" },
  { label: "Mục tiêu", section: "goals", emoji: "🎯", gradient: "from-emerald-500 to-green-600" },
  { label: "Báo cáo", section: "summary", emoji: "📈", gradient: "from-violet-500 to-purple-600" },
];

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [preloadedData, setPreloadedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<"week" | "month">("week");
  const [chartLoading, setChartLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerSection, setDrawerSection] = useState<DrawerSection | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const loadSummary = async (period = "week") => {
    const res = await fetch(`/api/summary?period=${period}`);
    if (!res.ok) throw new Error("Không thể tải thông tin thống kê.");
    return res.json();
  };

  const loadPreload = async () => {
    try {
      const res = await fetch("/api/preload");
      if (res.ok) setPreloadedData(await res.json());
    } catch {}
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) { router.push("/login"); return; }
        setUser(data.user);
        // Fire both in parallel — summary for the dashboard KPIs,
        // preload for the drawer panels (so they open instantly)
        const [summaryData] = await Promise.all([
          loadSummary("week"),
          loadPreload(),
        ]);
        setSummary(summaryData);
      } catch (err: any) { setError(err.message); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleChartPeriodChange = async (period: "week" | "month") => {
    setChartPeriod(period);
    setChartLoading(true);
    try {
      const data = await loadSummary(period);
      setSummary(prev => prev ? { ...prev, chartData: data.chartData } : data);
    } catch { }
    finally { setChartLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " đ";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg animate-bounce">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-400">Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  if (!user || !summary) return null;

  const weekBalance = summary.week.income - summary.week.expense;
  const todayBalance = summary.today.income - summary.today.expense;
  const spendRate = summary.week.income > 0 ? Math.min(100, (summary.week.expense / summary.week.income) * 100) : 0;

  const chartColors = {
    grid: isDark ? "#334155" : "#F1F5F9",
    tick: isDark ? "#64748B" : "#94A3B8",
    tooltipBg: isDark ? "#1E293B" : "#fff",
    tooltipBorder: isDark ? "#334155" : "#E2E8F0",
    tooltipText: isDark ? "#F1F5F9" : "#0F172A",
    cursor: isDark ? "#1E293B" : "#F8FAFC",
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          <div className="shrink-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-none tracking-tight">Di Veo</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5 hidden sm:block">Quản lý chi tiêu</p>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((l) => (
              <button
                key={l.section}
                onClick={() => setDrawerSection(l.section)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                  drawerSection === l.section
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-95 shadow-md shadow-emerald-200 dark:shadow-emerald-900/50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Ghi chép
            </button>
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-2 gap-1.5">
              {NAV_LINKS.map((l) => (
                <button
                  key={l.section}
                  onClick={() => { setDrawerSection(l.section); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors text-left"
                >
                  {l.label}
                </button>
              ))}
              <button
                onClick={() => { setModalOpen(true); setMobileMenuOpen(false); }}
                className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Ghi chép nhanh
              </button>
              <button
                onClick={handleLogout}
                className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-white/10 rounded-full translate-y-1/2" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <p className="text-emerald-100 text-xs font-medium mb-1">👋 {user.email}</p>
              <h1 className="text-white text-2xl sm:text-3xl font-bold tracking-tight">Tổng quan tài chính</h1>
              <p className="text-emerald-100 text-sm mt-1">
                {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className={`backdrop-blur rounded-2xl px-5 py-3 border hidden sm:block transition-all ${weekBalance >= 0 ? "bg-white/15 border-white/20" : "bg-white/95 border-white/60 shadow-lg"}`}>
                <p className={`text-xs font-semibold ${weekBalance >= 0 ? "text-emerald-100" : "text-slate-600"}`}>Số dư tuần</p>
                <p className={`text-2xl font-black mt-0.5 tracking-tight ${weekBalance >= 0 ? "text-white" : "text-red-600"}`}>
                  {weekBalance >= 0 ? "+" : "−"}{new Intl.NumberFormat("vi-VN").format(Math.abs(weekBalance))} đ
                </p>
              </div>

              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 bg-white text-emerald-700 text-sm font-bold rounded-2xl hover:bg-emerald-50 active:scale-95 transition-all shadow-lg shadow-black/10"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Ghi chép nhanh
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Stats ──────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Hôm nay */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hôm nay</span>
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold px-2 py-0.5 rounded-full">
                {new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
              </span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">Thu nhập</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{fmt(summary.today.income)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">Chi tiêu</span>
                </div>
                <span className="text-sm font-bold text-red-500 dark:text-red-400">−{fmt(summary.today.expense)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm text-slate-400 dark:text-slate-500">Số dư</span>
              <span className={`text-2xl font-black tracking-tight ${todayBalance >= 0 ? "text-slate-900 dark:text-white" : "text-red-500 dark:text-red-400"}`}>
                {todayBalance >= 0 ? "" : "−"}{fmt(Math.abs(todayBalance))}
              </span>
            </div>
          </div>

          {/* Tuần này */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tuần này</span>
              <span className="text-xs bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">7 ngày</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">Thu nhập</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{fmt(summary.week.income)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">Chi tiêu</span>
                </div>
                <span className="text-sm font-bold text-red-500 dark:text-red-400">−{fmt(summary.week.expense)}</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${spendRate >= 100 ? "bg-red-500" : spendRate >= 80 ? "bg-amber-400" : "bg-emerald-500"}`}
                  style={{ width: `${spendRate}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{spendRate.toFixed(0)}% thu nhập đã chi</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm text-slate-400 dark:text-slate-500">Số dư</span>
              <span className={`text-2xl font-black tracking-tight ${weekBalance >= 0 ? "text-slate-900 dark:text-white" : "text-red-500 dark:text-red-400"}`}>
                {weekBalance >= 0 ? "" : "−"}{fmt(Math.abs(weekBalance))}
              </span>
            </div>
          </div>

          {/* Tiết kiệm */}
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 shadow-md shadow-amber-200 dark:shadow-amber-900/30 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/15 rounded-full" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-amber-900/70 uppercase tracking-widest">Tiết kiệm đề xuất</span>
                <span className="text-xs bg-white/30 text-amber-900 font-black px-2 py-0.5 rounded-full">25%</span>
              </div>
              <p className="text-3xl font-black text-white tracking-tight drop-shadow">{fmt(summary.suggestedSavings)}</p>
              <p className="text-sm text-amber-900/70 mt-1.5 font-medium">
                {weekBalance <= 0 ? "📉 Chi tiêu vượt thu nhập tuần này." : "25% số dư dương tuần này."}
              </p>
              <button
                onClick={() => setDrawerSection("goals")}
                className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-900/80 hover:text-amber-900 transition-colors"
              >
                Xem mục tiêu →
              </button>
            </div>
          </div>
        </section>

        {/* ── Chart ──────────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Xu hướng thu chi</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {chartPeriod === "week" ? "7 ngày gần nhất" : "Theo tuần trong tháng này"}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
              {(["week", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handleChartPeriodChange(p)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    chartPeriod === p
                      ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {p === "week" ? "Tuần" : "Tháng"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Thu nhập</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chi tiêu</span>
            </div>
          </div>

          <div className="h-[220px] sm:h-[260px] w-full relative">
            {chartLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 z-10 rounded-xl">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={32} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: chartColors.tick, fontSize: 10, fontWeight: 600 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: chartColors.tick, fontSize: 10 }}
                    tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}tr` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                      color: chartColors.tooltipText,
                    }}
                    cursor={{ fill: chartColors.cursor }}
                    formatter={(value: number, name: string) => [
                      new Intl.NumberFormat("vi-VN").format(value) + " đ",
                      name === "income" ? "Thu nhập" : "Chi tiêu"
                    ]}
                  />
                  <Bar name="income" dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar name="expense" dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-sm text-slate-400">Đang tải biểu đồ...</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Quick links ─────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Truy cập nhanh</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_LINKS.map((item) => (
              <button
                key={item.section}
                onClick={() => setDrawerSection(item.section)}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 text-left shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-lg shadow-md mb-3 group-hover:scale-110 transition-transform`}>
                  {item.emoji}
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-0.5">
                  Mở ngay
                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* ── Budget warnings ─────────────────────────────────────────── */}
        {summary.budgetWarnings && summary.budgetWarnings.length > 0 && (
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⚠️</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cảnh báo hạn mức</h2>
            </div>
            <div className="space-y-4">
              {summary.budgetWarnings.map((w) => (
                <div key={w.categoryId}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{w.categoryName}</span>
                    <span className={`text-sm font-black ${w.percentage >= 100 ? "text-red-500 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {w.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${w.percentage >= 100 ? "bg-red-500" : w.percentage >= 80 ? "bg-amber-400" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, w.percentage)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{fmt(w.spent)} / {fmt(w.limit)}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <QuickAddModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={async () => {
          try { setSummary(await loadSummary(chartPeriod)); } catch { }
        }}
      />
      <NavDrawer
        section={drawerSection}
        onClose={() => setDrawerSection(null)}
        preloadedData={preloadedData}
        onDataMutated={loadPreload}
      />
    </div>
  );
}
