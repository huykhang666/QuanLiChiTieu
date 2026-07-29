"use client";

import { useEffect, useState } from "react";
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

const IconMap: { [key: string]: React.ReactNode } = {
  utensils: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5v6a3 3 0 01-3 3h-4a3 3 0 01-3-3V5M7 2v3M10 2v3M13 2v3M17 2v3" />
    </svg>
  ),
  fuel: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 2v3M10 2v3M14 2v3" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v11a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  "piggy-bank": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 4H3M21 12h-2M12 3v2M12 19v2" />
    </svg>
  ),
  "shopping-bag": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12V8H6a2 2 0 01-2-2 2 2 0 012-2h12v4M4 6v12a2 2 0 002 2h14v-4M20 12a2 2 0 000 4h.01" />
    </svg>
  ),
};

interface BudgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BudgetsModal({ isOpen, onClose, onSuccess }: BudgetsModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [limits, setLimits] = useState<{ [categoryId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    if (!isOpen) return;
    const loadBudgets = async () => {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;

        const [resCat, resBud] = await Promise.all([
          fetch("/api/categories"),
          fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`),
        ]);

        if (!resCat.ok || !resBud.ok) throw new Error("Không thể tải cấu hình hạn mức.");

        const catData = await resCat.json();
        const budData = await resBud.json();

        const expenseCats = catData.filter((c: Category) => c.type === "expense");
        setCategories(expenseCats);

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
    loadBudgets();
  }, [isOpen, supabase.auth, currentMonth, currentYear]);

  const handleInputChange = (categoryId: string, val: string) => {
    setLimits((prev) => ({ ...prev, [categoryId]: val }));
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      for (const [catId, val] of Object.entries(limits)) {
        const limitNum = Number(val);
        if (isNaN(limitNum) || limitNum < 0 || !Number.isInteger(limitNum)) {
          const catName = categories.find((c) => c.id === catId)?.name || "Danh mục";
          throw new Error(`Hạn mức của danh mục "${catName}" phải là số nguyên không âm.`);
        }
      }

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
          if (!res.ok) throw new Error();
          return res.json();
        })
      );

      await Promise.all(savePromises);
      setSuccess("Đã lưu cấu hình ngân sách hạn mức thành công.");
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi lưu hạn mức.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#121211] border border-[#EAEAEA] dark:border-[#2F2F2D] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FBFBFA] dark:bg-[#1C1C1A] border-b border-[#EAEAEA] dark:border-[#2F2F2D]">
          <h3 className="text-lg font-bold text-[#111111] dark:text-[#F5F5F0]">Hạn mức chi tiêu</h3>
          <button onClick={onClose} className="text-sm font-medium text-[#787774] hover:text-[#111111] dark:hover:text-[#F5F5F0]">
            Đóng
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-8 flex justify-center items-center">
            <svg className="animate-spin h-6 w-6 text-[#16A34A]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <p className="text-xs text-[#787774] dark:text-[#A8A8A2] font-semibold uppercase tracking-wider mb-2">
              Tháng {currentMonth}/{currentYear}
            </p>

            <div className="divide-y divide-[#EAEAEA] dark:divide-[#2F2F2D] max-h-[300px] overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div key={cat.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F7F6F3] dark:bg-[#1C1C1A] text-[#111111] dark:text-[#F5F5F0] border border-[#EAEAEA] dark:border-[#2F2F2D]">
                      {IconMap[cat.icon] || IconMap.utensils}
                    </div>
                    <span className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F0]">{cat.name}</span>
                  </div>

                  <div className="w-32 relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      className="w-full px-3 py-1.5 border border-[#EAEAEA] dark:border-[#2F2F2D] rounded-xl bg-[#FBFBFA] dark:bg-[#1C1C1A] font-mono text-xs text-right text-[#111111] dark:text-[#F5F5F0] focus:outline-none"
                      value={limits[cat.id] || "0"}
                      onChange={(e) => handleInputChange(cat.id, e.target.value)}
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-[#787774] font-mono pointer-events-none">đ</span>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-[#FDEBEC] dark:bg-[#2A1E1E] border border-[#FAD1D3] dark:border-[#523A3A] rounded-xl text-xs text-[#9F2F2D] dark:text-[#F2A1A1]">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-[#EDF3EC] dark:bg-[#1E2A1E] border border-[#D1E5CF] dark:border-[#3A523A] rounded-xl text-xs text-[#346538] dark:text-[#A1F2A1]">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#16A34A] text-white text-sm font-bold rounded-xl hover:bg-[#14803d] active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(22,163,74,0.35)] disabled:opacity-50 flex items-center justify-center"
            >
              {submitting ? "Đang lưu..." : "Lưu hạn mức chi tiêu"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
