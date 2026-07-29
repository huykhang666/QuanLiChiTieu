"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase";

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

const IconMap: { [key: string]: React.ReactNode } = {
  utensils: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5v6a3 3 0 01-3 3h-4a3 3 0 01-3-3V5M7 2v3M10 2v3M13 2v3M17 2v3" />
    </svg>
  ),
  fuel: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 2v3M10 2v3M14 2v3" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v11a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  "piggy-bank": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 4H3M21 12h-2M12 3v2M12 19v2" />
    </svg>
  ),
  "shopping-bag": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12V8H6a2 2 0 01-2-2 2 2 0 012-2h12v4M4 6v12a2 2 0 002 2h14v-4M20 12a2 2 0 000 4h.01" />
    </svg>
  ),
};

interface QuickRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickRecordModal({ isOpen, onClose, onSuccess }: QuickRecordModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const supabase = createClient();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
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

  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      try {
        setError(null);
        setLoading(true);
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setError("Vui lòng đăng nhập lại.");
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
    loadData();
  }, [isOpen, supabase.auth]);

  useEffect(() => {
    if (isOpen && !loading) {
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, loading]);

  const filteredCategories = categories.filter((c) => c.type === selectedType);

  const handleTypeChange = (type: "expense" | "income") => {
    setValue("type", type);
    setValue("categoryId", "");
  };

  const onSubmit = async (values: TransactionFormValues) => {
    if (!userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gặp lỗi khi lưu giao dịch.");
      }
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
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
          <h3 className="text-lg font-bold text-[#111111] dark:text-[#F5F5F0]">Ghi chép nhanh</h3>
          <button onClick={onClose} className="text-sm font-medium text-[#787774] hover:text-[#111111] dark:hover:text-[#F5F5F0]">
            Đóng
          </button>
        </div>

        {/* Form Body */}
        {loading ? (
          <div className="p-8 flex justify-center items-center">
            <svg className="animate-spin h-6 w-6 text-[#16A34A]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-[#FDEBEC] dark:bg-[#2A1E1E] border border-[#FAD1D3] dark:border-[#523A3A] rounded-xl text-xs text-[#9F2F2D] dark:text-[#F2A1A1]">
                {error}
              </div>
            )}

            {/* Type selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#787774] uppercase tracking-wider">Loại</span>
              <div className="flex border border-[#EAEAEA] dark:border-[#2F2F2D] rounded-xl overflow-hidden bg-[#FBFBFA] dark:bg-[#1C1C1A]">
                <button
                  type="button"
                  onClick={() => handleTypeChange("expense")}
                  className={`flex-1 py-2.5 text-xs font-bold transition-all ${
                    selectedType === "expense"
                      ? "bg-[#16A34A] text-white"
                      : "text-[#787774] hover:bg-[#F0F0EE] dark:hover:bg-[#252523]"
                  }`}
                >
                  Chi tiêu
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("income")}
                  className={`flex-1 py-2.5 text-xs font-bold transition-all ${
                    selectedType === "income"
                      ? "bg-[#16A34A] text-white"
                      : "text-[#787774] hover:bg-[#F0F0EE] dark:hover:bg-[#252523]"
                  }`}
                >
                  Thu nhập
                </button>
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <label htmlFor="amount" className="text-xs font-semibold text-[#787774] uppercase tracking-wider">Số tiền (VNĐ)</label>
              <input
                id="amount"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                className="w-full px-4 py-3 border border-[#EAEAEA] dark:border-[#2F2F2D] rounded-xl bg-[#FBFBFA] dark:bg-[#1C1C1A] text-[#111111] dark:text-[#F5F5F0] text-xl font-bold focus:outline-none focus:border-[#16A34A] dark:focus:border-[#16A34A]"
                {...register("amount")}
                ref={(e) => {
                  register("amount").ref(e);
                  amountInputRef.current = e;
                }}
              />
              {errors.amount && <p className="text-xs text-[#9F2F2D]">{errors.amount.message}</p>}
            </div>

            {/* Categories Selection */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#787774] uppercase tracking-wider">Danh mục</span>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => field.onChange(cat.id)}
                        className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                          selectedCategoryId === cat.id
                            ? "border-[#16A34A] bg-[#EDF7F2] dark:bg-[#1A3A2B]/40 text-[#16A34A]"
                            : "border-[#EAEAEA] dark:border-[#2F2F2D] bg-white dark:bg-[#121211] text-[#787774] hover:bg-[#FBFBFA] dark:hover:bg-[#1C1C1A]"
                        }`}
                      >
                        <div className="mb-1">{IconMap[cat.icon] || IconMap.utensils}</div>
                        <span className="text-xs font-bold leading-none">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.categoryId && <p className="text-xs text-[#9F2F2D]">{errors.categoryId.message}</p>}
            </div>

            {/* Date & Note */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="date" className="text-[10px] font-semibold text-[#787774] uppercase">Ngày</label>
                <input
                  id="date"
                  type="date"
                  className="w-full px-3 py-2 border border-[#EAEAEA] dark:border-[#2F2F2D] rounded-xl bg-[#FBFBFA] dark:bg-[#1C1C1A] text-xs text-[#111111] dark:text-[#F5F5F0] focus:outline-none"
                  {...register("date")}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="note" className="text-[10px] font-semibold text-[#787774] uppercase">Ghi chú</label>
                <input
                  id="note"
                  type="text"
                  placeholder="Ăn trưa, xăng..."
                  className="w-full px-3 py-2 border border-[#EAEAEA] dark:border-[#2F2F2D] rounded-xl bg-[#FBFBFA] dark:bg-[#1C1C1A] text-xs text-[#111111] dark:text-[#F5F5F0] focus:outline-none"
                  {...register("note")}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#16A34A] text-white text-sm font-bold rounded-xl hover:bg-[#14803d] active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(22,163,74,0.35)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang ghi...
                </>
              ) : (
                "Lưu ghi chép"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
