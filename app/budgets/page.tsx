"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
}

interface Budget {
  id: string;
  categoryId: string;
  limit: number;
}

// Map các icon danh mục sang SVG (đồng bộ với các trang khác)
const IconMap: { [key: string]: React.ReactNode } = {
  utensils: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5v6a3 3 0 01-3 3h-4a3 3 0 01-3-3V5M7 2v3M10 2v3M13 2v3M17 2v3" />
    </svg>
  ),
  fuel: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 2v3M10 2v3M14 2v3" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v11a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  "piggy-bank": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 4H3M21 12h-2M12 3v2M12 19v2" />
    </svg>
  ),
  "shopping-bag": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12V8H6a2 2 0 01-2-2 2 2 0 012-2h12v4M4 6v12a2 2 0 002 2h14v-4M20 12a2 2 0 000 4h.01" />
    </svg>
  ),
};

export default function BudgetsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [limits, setLimits] = useState<{ [categoryId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    const initPage = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.push("/login");
          return;
        }

        // Tải danh mục và ngân sách song song
        const [resCat, resBud] = await Promise.all([
          fetch("/api/categories"),
          fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`),
        ]);

        if (!resCat.ok || !resBud.ok) {
          throw new Error("Không thể tải thông tin cấu hình ngân sách.");
        }

        const catData = await resCat.json();
        const budData = await resBud.json();

        // Chỉ lấy danh mục chi tiêu (expense) để đặt ngân sách
        const expenseCats = catData.filter((c: Category) => c.type === "expense");
        setCategories(expenseCats);

        // Nạp hạn mức ngân sách hiện có vào state
        const initialLimits: { [categoryId: string]: string } = {};
        expenseCats.forEach((c: Category) => {
          const budget = budData.find((b: Budget) => b.categoryId === c.id);
          initialLimits[c.id] = budget ? budget.limit.toString() : "0";
        });
        setLimits(initialLimits);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router, supabase.auth, currentMonth, currentYear]);

  const handleInputChange = (categoryId: string, val: string) => {
    setLimits((prev) => ({
      ...prev,
      [categoryId]: val,
    }));
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      // Validate các số nhập vào
      for (const [catId, val] of Object.entries(limits)) {
        const limitNum = Number(val);
        if (isNaN(limitNum) || limitNum < 0 || !Number.isInteger(limitNum)) {
          const catName = categories.find((c) => c.id === catId)?.name || "Danh mục";
          throw new Error(`Hạn mức của danh mục "${catName}" phải là số nguyên không âm.`);
        }
      }

      // Lưu hạn mức song song cho toàn bộ danh mục
      const savePromises = Object.entries(limits).map(([categoryId, val]) =>
        fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId,
            month: currentMonth,
            year: currentYear,
            limit: Number(val),
          }),
        }).then((res) => {
          if (!res.ok) throw new Error("Gặp lỗi trong quá trình lưu hạn mức.");
          return res.json();
        })
      );

      await Promise.all(savePromises);
      setSuccess(`Đã lưu cấu hình ngân sách Tháng ${currentMonth}/${currentYear} thành công.`);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi lưu hạn mức ngân sách.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFBFA]">
        <div className="text-sm font-mono text-[#787774]">Đang tải dữ liệu hạn mức...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBFBFA] py-16 px-6 sm:px-8">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-mono text-[#787774] hover:text-[#111111] transition-colors mb-4"
          >
            ← Bảng điều khiển
          </Link>
          <h1 className="font-serif text-3.5xl font-normal tracking-tight text-[#111111] italic">
            Hạn mức chi tiêu
          </h1>
          <p className="text-xs text-[#787774] mt-1 font-mono">
            Đặt ngân sách hàng tháng cho từng danh mục (Tháng {currentMonth}/{currentYear})
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6 bg-white border border-[#EAEAEA] rounded-xl p-6 sm:p-8">
          <div className="divide-y divide-[#EAEAEA]">
            {categories.map((cat) => (
              <div key={cat.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F7F6F3] text-[#111111] border border-[#EAEAEA]">
                    {IconMap[cat.icon] || IconMap.utensils}
                  </div>
                  <span className="text-sm font-medium text-[#111111]">{cat.name}</span>
                </div>

                <div className="w-36 relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] font-mono text-sm text-right text-[#111111] focus:outline-none focus:border-[#111111]"
                    value={limits[cat.id] || "0"}
                    onChange={(e) => handleInputChange(cat.id, e.target.value)}
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-[#787774] font-mono pointer-events-none">
                    đ
                  </span>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-[#FDEBEC] border border-[#FAD1D3] rounded-md text-xs text-[#9F2F2D]">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-[#EDF3EC] border border-[#D1E5CF] rounded-md text-xs text-[#346538]">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#111111] text-white text-xs font-medium rounded-md hover:bg-[#333333] transition-colors focus:outline-none disabled:opacity-50 active:scale-[0.98] transform duration-150 flex justify-center items-center font-sans uppercase tracking-wider"
          >
            {submitting ? "Đang lưu..." : "Lưu hạn mức"}
          </button>
        </form>
      </div>
    </main>
  );
}
