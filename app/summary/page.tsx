"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import * as XLSX from "xlsx";
import ThemeToggle from "@/components/ThemeToggle";

interface WeeklySummary {
  label: string;
  startDate: string;
  income: number;
  expense: number;
  balance: number;
  suggestedSavings: number;
}

interface MonthlySummary {
  label: string;
  monthKey: string;
  income: number;
  expense: number;
  balance: number;
}

interface CategoryBreakdown {
  name: string;
  value: number;
}

// Bảng màu desaturated cao cấp theo minimalist-ui
const COLORS = ["#346538", "#9F2F2D", "#1F6C9F", "#956400", "#787774", "#C27A3F"];

export default function SummaryPage() {
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.push("/login");
          return;
        }

        const res = await fetch("/api/summary/reports");
        if (!res.ok) throw new Error("Không thể tải thông tin báo cáo.");
        const reportData = await res.json();

        setWeeklySummary(reportData.weeklySummary || []);
        setMonthlySummary(reportData.monthlySummary || []);
        setCategoryBreakdown(reportData.categoryBreakdown || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [router, supabase.auth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
  };

  const totalExpense = categoryBreakdown.reduce((sum, item) => sum + item.value, 0);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Ngày đầu tháng: YYYY-MM-01
      const fromStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;

      // Ngày cuối tháng
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const toStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const res = await fetch(`/api/transactions?from=${fromStr}&to=${toStr}`);
      if (!res.ok) throw new Error("Không thể tải danh sách giao dịch tháng này.");
      const transactions = await res.json();

      if (transactions.length === 0) {
        alert("Không có giao dịch nào trong tháng này để xuất.");
        return;
      }

      // Định dạng cho file Excel
      const excelData = transactions.map((t: any) => {
        const d = new Date(t.date);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();

        return {
          "Ngày": `${day}/${month}/${year}`,
          "Danh mục": t.category?.name || "N/A",
          "Loại": t.type === "income" ? "Thu nhập" : "Chi tiêu",
          "Số tiền (đ)": t.amount,
          "Ghi chú": t.note || "",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Định dạng độ rộng cột
      const wscols = [
        { wch: 15 }, // Ngày
        { wch: 20 }, // Danh mục
        { wch: 12 }, // Loại
        { wch: 18 }, // Số tiền (đ)
        { wch: 30 }, // Ghi chú
      ];
      worksheet["!cols"] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Giao dịch");

      XLSX.writeFile(workbook, `Giao_dich_Thang_${currentMonth + 1}_${currentYear}.xlsx`);
    } catch (err: any) {
      alert(err.message || "Gặp lỗi khi xuất dữ liệu.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFBFA]">
        <div className="text-sm font-mono text-[#787774]">Đang phân tích báo cáo tài chính...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBFBFA] py-16 px-6 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-[#EAEAEA] pb-6 gap-4">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs font-mono text-[#787774] hover:text-[#111111] transition-colors mb-2"
            >
              ← Bảng điều khiển
            </Link>
            <h1 className="font-serif text-4xl font-normal tracking-tight text-[#111111] italic">
              Báo cáo tổng hợp
            </h1>
            <p className="text-xs text-[#787774] mt-1 font-mono">
              Phân tích động dữ liệu thu chi từ database
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[#EAEAEA] rounded-md text-xs font-medium text-[#111111] bg-white hover:bg-[#F7F6F3] active:scale-[0.98] transition-all font-sans disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-[#787774]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              {exporting ? "Đang xuất..." : "Xuất Excel"}
            </button>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-[#FDEBEC] border border-[#FAD1D3] rounded-md text-sm text-[#9F2F2D]">
            {error}
          </div>
        )}

        {/* Bố cục chính Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cột trái: Bảng biểu thống kê tuần/tháng (Chọc 2/3 không gian) */}
          <div className="lg:col-span-2 space-y-10">
            {/* Bảng tổng hợp tuần */}
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="font-serif text-2xl font-normal text-[#111111] italic">
                Tổng hợp theo tuần
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] text-[#787774] font-mono tracking-wider uppercase">
                      <th className="pb-3 font-medium">Khoảng thời gian</th>
                      <th className="pb-3 text-right font-medium">Tổng thu</th>
                      <th className="pb-3 text-right font-medium">Tổng chi</th>
                      <th className="pb-3 text-right font-medium">Số dư</th>
                      <th className="pb-3 text-right font-medium">Tiết kiệm (25%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA]">
                    {weeklySummary.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-[#787774]">
                          Chưa có dữ liệu tuần.
                        </td>
                      </tr>
                    ) : (
                      weeklySummary.map((row) => (
                        <tr key={row.startDate} className="hover:bg-[#FBFBFA]">
                          <td className="py-3 font-mono text-[#111111]">{row.label}</td>
                          <td className="py-3 text-right font-mono text-[#346538]">
                            +{formatCurrency(row.income)}
                          </td>
                          <td className="py-3 text-right font-mono text-[#9F2F2D]">
                            -{formatCurrency(row.expense)}
                          </td>
                          <td
                            className={`py-3 text-right font-mono ${
                              row.balance >= 0 ? "text-[#111111]" : "text-[#9F2F2D]"
                            }`}
                          >
                            {formatCurrency(row.balance)}
                          </td>
                          <td className="py-3 text-right font-mono text-[#1F6C9F]">
                            {formatCurrency(row.suggestedSavings)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bảng tổng hợp tháng */}
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="font-serif text-2xl font-normal text-[#111111] italic">
                Tổng hợp theo tháng
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] text-[#787774] font-mono tracking-wider uppercase">
                      <th className="pb-3 font-medium">Tháng/Năm</th>
                      <th className="pb-3 text-right font-medium">Tổng thu</th>
                      <th className="pb-3 text-right font-medium">Tổng chi</th>
                      <th className="pb-3 text-right font-medium">Số dư</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA]">
                    {monthlySummary.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[#787774]">
                          Chưa có dữ liệu tháng.
                        </td>
                      </tr>
                    ) : (
                      monthlySummary.map((row) => (
                        <tr key={row.monthKey} className="hover:bg-[#FBFBFA]">
                          <td className="py-3 font-mono text-[#111111]">{row.label}</td>
                          <td className="py-3 text-right font-mono text-[#346538]">
                            +{formatCurrency(row.income)}
                          </td>
                          <td className="py-3 text-right font-mono text-[#9F2F2D]">
                            -{formatCurrency(row.expense)}
                          </td>
                          <td
                            className={`py-3 text-right font-mono ${
                              row.balance >= 0 ? "text-[#111111]" : "text-[#9F2F2D]"
                            }`}
                          >
                            {formatCurrency(row.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Cột phải: Biểu đồ tròn cơ cấu chi tiêu (Chiếm 1/3 không gian) */}
          <div className="space-y-6">
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-normal text-[#111111] italic">
                  Cơ cấu chi tiêu
                </h2>
                <p className="text-xs text-[#787774] mt-1">
                  Tỷ trọng chi tiêu theo từng danh mục
                </p>
              </div>

              {/* Pie Chart Recharts */}
              <div className="h-[240px] w-full relative flex items-center justify-center">
                {mounted ? (
                  categoryBreakdown.length === 0 ? (
                    <div className="text-xs text-[#787774] text-center p-6">
                      Chưa ghi nhận khoản chi tiêu nào để lập cơ cấu biểu đồ.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #EAEAEA",
                            borderRadius: "6px",
                            fontSize: "11px",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          align="center"
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <div className="text-xs font-mono text-[#787774]">Đang chuẩn bị biểu đồ...</div>
                )}
              </div>

              {/* Danh sách cơ cấu chi tiết dưới dạng bảng kê phần trăm */}
              {categoryBreakdown.length > 0 && (
                <div className="border-t border-[#EAEAEA] pt-4 space-y-2.5">
                  <span className="text-[10px] font-mono font-medium text-[#787774] tracking-wider uppercase block">
                    Bảng phân bổ chi tiết
                  </span>
                  <div className="space-y-2 text-xs">
                    {categoryBreakdown.map((item, index) => {
                      const percentage = ((item.value / totalExpense) * 100).toFixed(1);
                      return (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-[#111111]">{item.name}</span>
                          </div>
                          <div className="font-mono text-[#787774] space-x-2">
                            <span>{formatCurrency(item.value)}</span>
                            <span className="font-medium text-[#111111]">({percentage}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
