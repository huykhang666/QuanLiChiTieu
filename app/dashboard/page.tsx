"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

const QUICK_LINKS: { label: string; section: DrawerSection; icon: string }[] = [
  { label: "Lịch sử giao dịch", section: "transactions", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { label: "Hạn mức chi tiêu", section: "budgets", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { label: "Mục tiêu tiết kiệm", section: "goals", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { label: "Báo cáo tổng hợp", section: "summary", icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
];


export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<"week" | "month">("week");
  const [chartLoading, setChartLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerSection, setDrawerSection] = useState<DrawerSection | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { setMounted(true); }, []);

  const loadSummary = async (period = "week") => {
    const res = await fetch(`/api/summary?period=${period}`);
    if (!res.ok) throw new Error("Không thể tải thông tin thống kê.");
    return res.json();
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) { router.push("/login"); return; }
        setUser(data.user);
        setSummary(await loadSummary("week"));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router, supabase.auth]);

  const handleChartPeriodChange = async (period: "week" | "month") => {
    setChartPeriod(period);
    setChartLoading(true);
    try {
      const data = await loadSummary(period);
      setSummary(prev => prev ? { ...prev, chartData: data.chartData } : data);
    } catch { /* silent */ }
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
      <div className="flex min-h-screen items-center justify-center bg-[#F7F6F3]">
        <div className="flex items-center gap-2.5">
          <svg className="animate-spin w-4 h-4 text-[#16A34A]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-[#787774]">Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  if (!user || !summary) return null;

  const weekBalance = summary.week.income - summary.week.expense;
  const todayBalance = summary.today.income - summary.today.expense;

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-40 bg-[#FBFBFA]/95 border-b border-[#EAEAEA] backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 h-14 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-md bg-[#16A34A] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="font-semibold text-sm text-[#111111] tracking-tight">Di Veo</span>
          </Link>
          <div className="hidden sm:flex items-center gap-0.5">
            {NAV_LINKS.map((l) => (
              <button
                key={l.section}
                onClick={() => setDrawerSection(l.section)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  drawerSection === l.section
                    ? "bg-[#EDF7F2] text-[#16A34A] font-semibold"
                    : "text-[#787774] hover:text-[#111111] hover:bg-[#F0F0EE]"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={handleLogout} className="hidden sm:block px-3 py-1.5 text-xs font-medium text-[#787774] hover:text-[#9F2F2D] hover:bg-[#FDEBEC] rounded-md transition-all">
              Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 sm:px-8 py-10 space-y-8">
        {/* Page header + CTA */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs text-[#787774] mb-1 font-medium">{user.email}</p>
            <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Tổng quan</h1>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#16A34A] text-white text-base font-bold rounded-xl hover:bg-[#14803d] active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(22,163,74,0.35)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ghi chép nhanh
          </button>
        </div>

        {error && <div className="p-4 bg-[#FDEBEC] border border-[#FAD1D3] rounded-xl text-sm text-[#9F2F2D]">{error}</div>}

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E4E4E2] rounded-xl p-5 flex flex-col gap-3 hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition-shadow">
            <p className="text-sm font-medium text-[#787774]">Hôm nay</p>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[#787774]">Thu nhập</span>
                <span className="text-lg font-semibold text-[#16A34A]">+{fmt(summary.today.income)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[#787774]">Chi tiêu</span>
                <span className="text-lg font-semibold text-[#9F2F2D]">−{fmt(summary.today.expense)}</span>
              </div>
            </div>
            <div className="pt-3 mt-1 border-t border-[#F0F0EE] flex items-baseline justify-between">
              <span className="text-sm text-[#787774]">Số dư</span>
              <span className={`text-2xl font-bold tracking-tight ${todayBalance >= 0 ? "text-[#111111]" : "text-[#9F2F2D]"}`}>
                {fmt(todayBalance)}
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#E4E4E2] rounded-xl p-5 flex flex-col gap-3 hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition-shadow">
            <p className="text-sm font-medium text-[#787774]">Tuần này</p>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[#787774]">Thu nhập</span>
                <span className="text-lg font-semibold text-[#16A34A]">+{fmt(summary.week.income)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[#787774]">Chi tiêu</span>
                <span className="text-lg font-semibold text-[#9F2F2D]">−{fmt(summary.week.expense)}</span>
              </div>
            </div>
            <div className="pt-3 mt-1 border-t border-[#F0F0EE] flex items-baseline justify-between">
              <span className="text-sm text-[#787774]">Số dư</span>
              <span className={`text-2xl font-bold tracking-tight ${weekBalance >= 0 ? "text-[#111111]" : "text-[#9F2F2D]"}`}>
                {fmt(weekBalance)}
              </span>
            </div>
          </div>

          <div className="bg-[#16A34A] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#A8D8BE]">Tiết kiệm đề xuất</p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/15 text-white">25%</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white tracking-tight">{fmt(summary.suggestedSavings)}</p>
              <p className="text-xs text-[#A8D8BE] mt-1.5 leading-relaxed">
                {weekBalance <= 0 ? "Tuần này chi tiêu vượt thu nhập." : "25% số dư dương tuần này."}
              </p>
            </div>
            <Link href="/goals" className="mt-auto pt-3 border-t border-white/15 text-xs font-medium text-[#A8D8BE] hover:text-white transition-colors flex items-center gap-1">
              Xem mục tiêu tiết kiệm
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Chart */}
        <section className="bg-white border border-[#E4E4E2] rounded-xl p-6 sm:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-[#111111]">Xu hướng thu chi</h2>
              <p className="text-xs text-[#787774] mt-0.5">
                {chartPeriod === "week" ? "7 ngày gần nhất" : "Theo tuần trong tháng này"}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[#F7F6F3] rounded-lg p-1">
              <button
                onClick={() => handleChartPeriodChange("week")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  chartPeriod === "week"
                    ? "bg-[#16A34A] text-white shadow-sm"
                    : "text-[#787774] hover:text-[#111111]"
                }`}
              >
                Tuần
              </button>
              <button
                onClick={() => handleChartPeriodChange("month")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  chartPeriod === "month"
                    ? "bg-[#16A34A] text-white shadow-sm"
                    : "text-[#787774] hover:text-[#111111]"
                }`}
              >
                Tháng
              </button>
            </div>
          </div>
          <div className="h-[280px] w-full relative">
            {chartLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-xl">
                <svg className="animate-spin w-5 h-5 text-[#16A34A]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.chartData} margin={{ top: 4, right: 4, left: 8, bottom: 0 }} barSize={14} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#787774", fontSize: 10 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#787774", fontSize: 10 }}
                    tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}tr` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                    width={42}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #E4E4E2", borderRadius: "8px", fontSize: "11px" }}
                    cursor={{ fill: "#F7F6F3" }}
                    formatter={(value: number) => [new Intl.NumberFormat("vi-VN").format(value) + " đ", ""]}
                  />
                  <Legend verticalAlign="top" align="right" iconType="rect" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingBottom: "12px" }} />
                  <Bar name="Thu nhập" dataKey="income" fill="#16A34A" radius={[3, 3, 0, 0]} />
                  <Bar name="Chi tiêu" dataKey="expense" fill="#E1594F" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-xs text-[#787774]">Đang tải biểu đồ...</span>
              </div>
            )}
          </div>
        </section>

        {/* Quick nav cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_LINKS.map((item) => (
            <button
              key={item.section}
              onClick={() => setDrawerSection(item.section)}
              className="bg-white border border-[#E4E4E2] rounded-xl p-4 flex flex-col items-start gap-3 hover:border-[#16A34A]/40 hover:shadow-[0_2px_12px_rgba(22,163,74,0.08)] transition-all group text-left w-full"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EDF7F2] flex items-center justify-center group-hover:bg-[#16A34A] transition-colors">
                <svg className="w-4 h-4 text-[#16A34A] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <p className="text-xs font-medium text-[#111111] leading-tight">{item.label}</p>
            </button>
          ))}
        </section>
      </main>

      {/* Quick Add Modal */}
      <QuickAddModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={async () => {
          try {
            setSummary(await loadSummary(chartPeriod));
          } catch {}
        }}
      />

      {/* Nav Drawer */}
      <NavDrawer
        section={drawerSection}
        onClose={() => setDrawerSection(null)}
      />
    </div>
  );
}
