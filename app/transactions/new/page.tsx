"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

// Định nghĩa Zod schema validate
const transactionSchema = z.object({
  amount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ required_error: "Vui lòng nhập số tiền." })
      .int("Số tiền phải là số nguyên.")
      .positive("Số tiền phải lớn hơn 0.")
  ),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục."),
  date: z.string().min(1, "Vui lòng chọn ngày giao dịch."),
  note: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  isDefault: boolean;
}

// Map các icon danh mục sang SVG
const IconMap: { [key: string]: React.ReactNode } = {
  utensils: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5v6a3 3 0 01-3 3h-4a3 3 0 01-3-3V5M7 2v3M10 2v3M13 2v3M17 2v3" />
    </svg>
  ),
  fuel: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 2v3M10 2v3M14 2v3" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v11a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  "piggy-bank": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 4H3M21 12h-2M12 3v2M12 19v2" />
    </svg>
  ),
  "shopping-bag": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12V8H6a2 2 0 01-2-2 2 2 0 012-2h12v4M4 6v12a2 2 0 002 2h14v-4M20 12a2 2 0 000 4h.01" />
    </svg>
  ),
};

export default function NewTransactionPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const amountRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Đăng ký form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      amount: undefined,
      categoryId: "",
      date: new Date().toISOString().split("T")[0],
      note: "",
    },
  });

  const selectedType = watch("type");
  const selectedCategoryId = watch("categoryId");

  // Load user và categories
  useEffect(() => {
    const initPage = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.push("/login");
          return;
        }
        setUserId(data.user.id);

        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Không thể tải danh sách danh mục.");
        const catData = await res.json();
        setCategories(catData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router, supabase.auth]);

  // Tự động focus vào ô nhập số tiền khi load xong
  useEffect(() => {
    if (!loading && amountRef.current) {
      amountRef.current.focus();
    }
  }, [loading]);

  // Lọc danh mục theo loại (expense / income)
  const filteredCategories = categories.filter((c) => c.type === selectedType);

  // Khi đổi type, reset categoryId để tránh lệch dữ liệu
  const handleTypeChange = (type: "expense" | "income") => {
    setValue("type", type);
    setValue("categoryId", "");
  };

  const onSubmit = async (values: TransactionFormValues) => {
    if (!userId) return;
    setSubmitting(false);
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          userId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi khi lưu giao dịch.");
      }

      router.push("/transactions");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi lưu giao dịch.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFBFA]">
        <div className="text-sm font-mono text-[#787774]">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBFBFA] py-12 px-6 sm:px-8">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <Link
            href="/transactions"
            className="inline-flex items-center text-xs font-mono text-[#787774] hover:text-[#111111] transition-colors mb-4"
          >
            ← Trở lại danh sách
          </Link>
          <h1 className="font-serif text-3.5xl font-normal tracking-tight text-[#111111] italic">
            Ghi chép mới
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white border border-[#EAEAEA] rounded-xl p-6 sm:p-8">
          {/* Loại giao dịch: Chi tiêu / Thu nhập */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#787774] tracking-wide uppercase">
              Loại giao dịch
            </label>
            <div className="flex border border-[#EAEAEA] rounded-md overflow-hidden bg-[#FBFBFA]">
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  selectedType === "expense"
                    ? "bg-[#111111] text-white"
                    : "text-[#787774] hover:bg-[#EAEAEA]"
                }`}
                onClick={() => handleTypeChange("expense")}
              >
                Chi tiêu (Expense)
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  selectedType === "income"
                    ? "bg-[#111111] text-white"
                    : "text-[#787774] hover:bg-[#EAEAEA]"
                }`}
                onClick={() => handleTypeChange("income")}
              >
                Thu nhập (Income)
              </button>
            </div>
          </div>

          {/* Nhập số tiền */}
          <div className="space-y-2">
            <label htmlFor="amount" className="text-xs font-medium text-[#787774] tracking-wide uppercase">
              Số tiền (VNĐ)
            </label>
            <div className="relative">
              <input
                id="amount"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                className="w-full px-4 py-3 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-lg font-mono text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                {...register("amount")}
                ref={(e) => {
                  register("amount").ref(e);
                  (amountRef as any).current = e;
                }}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-[#9F2F2D]">{errors.amount.message}</p>
            )}
          </div>

          {/* Chọn danh mục nhanh (Grid) */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#787774] tracking-wide uppercase">
              Danh mục
            </label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => field.onChange(cat.id)}
                      className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all ${
                        selectedCategoryId === cat.id
                          ? "border-[#111111] bg-[#F7F6F3] text-[#111111]"
                          : "border-[#EAEAEA] bg-white text-[#787774] hover:bg-[#FBFBFA] hover:text-[#111111]"
                      }`}
                    >
                      <div className="mb-1">{IconMap[cat.icon] || IconMap.utensils}</div>
                      <span className="text-[11px] font-medium leading-none">{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            />
            {errors.categoryId && (
              <p className="text-xs text-[#9F2F2D]">{errors.categoryId.message}</p>
            )}
          </div>

          {/* Ngày giao dịch & Ghi chú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="date" className="text-xs font-medium text-[#787774] tracking-wide uppercase">
                Ngày giao dịch
              </label>
              <input
                id="date"
                type="date"
                className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                {...register("date")}
              />
              {errors.date && (
                <p className="text-xs text-[#9F2F2D]">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="text-xs font-medium text-[#787774] tracking-wide uppercase">
                Ghi chú
              </label>
              <input
                id="note"
                type="text"
                placeholder="Mua sắm, cà phê..."
                className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                {...register("note")}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[#FDEBEC] border border-[#FAD1D3] rounded-md text-xs text-[#9F2F2D]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#111111] text-white text-sm font-medium rounded-md hover:bg-[#333333] transition-colors focus:outline-none disabled:opacity-50 active:scale-[0.98] transform duration-150 flex justify-center items-center font-sans uppercase tracking-wider"
          >
            {submitting ? (
              <svg className="animate-spin -ml-1 mr-3 h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              "Ghi chép giao dịch"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
