"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase";

const schema = z.object({
  amount: z.preprocess(
    (v) => (v === "" ? undefined : Number(v)),
    z.number({ required_error: "Nhập số tiền." }).int().positive("Phải > 0")
  ),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().min(1, "Chọn danh mục."),
  date: z.string().min(1),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Category { id: string; name: string; type: string; icon: string; }

const ICONS: { [k: string]: React.ReactNode } = {
  utensils: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H7v6a3 3 0 003 3h4a3 3 0 003-3V5z" /></svg>,
  fuel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 2v3M10 2v3" /></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v11a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  "piggy-bank": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 4H3M21 12h-2M12 3v2M12 19v2" /></svg>,
  "shopping-bag": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12V8H6a2 2 0 01-2-2 2 2 0 012-2h12v4M4 6v12a2 2 0 002 2h14v-4M20 12a2 2 0 000 4h.01" /></svg>,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QuickAddModal({ open, onClose, onSuccess }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        type: "expense",
        amount: undefined,
        categoryId: "",
        date: new Date().toISOString().split("T")[0],
        note: "",
      },
    });

  const type = watch("type");
  const categoryId = watch("categoryId");
  const filtered = categories.filter((c) => c.type === type);

  // Load user + categories once
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    };
    init();
  }, []);

  // Focus amount when opened
  useEffect(() => {
    if (open) {
      setSuccess(false);
      setSubmitError(null);
      reset({ type: "expense", amount: undefined, categoryId: "", date: new Date().toISOString().split("T")[0], note: "" });
      setTimeout(() => amountRef.current?.focus(), 150);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const onSubmit = async (values: FormValues) => {
    if (!userId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, userId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Lỗi lưu giao dịch.");
      }
      setSuccess(true);
      setTimeout(() => { onClose(); onSuccess?.(); }, 900);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F0F0EE]">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Ghi chép nhanh</h2>
            <p className="text-xs text-[#787774] mt-0.5">Thêm giao dịch trong vài giây</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F7F6F3] flex items-center justify-center hover:bg-[#EAEAEA] transition-colors">
            <svg className="w-4 h-4 text-[#787774]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="w-14 h-14 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-semibold text-[#111111]">Đã lưu!</p>
            <p className="text-sm text-[#787774] mt-1">Giao dịch đã được ghi chép thành công.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
            {/* Type toggle */}
            <div className="flex gap-2">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setValue("type", t); setValue("categoryId", ""); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${
                    type === t
                      ? t === "expense"
                        ? "bg-[#9F2F2D] text-white border-[#9F2F2D]"
                        : "bg-[#16A34A] text-white border-[#16A34A]"
                      : "bg-white text-[#787774] border-[#EAEAEA] hover:border-[#111111]"
                  }`}
                >
                  {t === "expense" ? "Chi tiêu" : "Thu nhập"}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-[#787774] uppercase tracking-wide">Số tiền (VNĐ)</label>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  className="w-full px-4 py-3 text-2xl font-bold border border-[#EAEAEA] rounded-xl bg-[#FBFBFA] text-[#111111] focus:outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/10 transition-all"
                  {...register("amount")}
                  ref={(e) => { register("amount").ref(e); (amountRef as any).current = e; }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#787774] font-medium">đ</span>
              </div>
              {errors.amount && <p className="text-xs text-[#9F2F2D] mt-1">{errors.amount.message}</p>}
            </div>

            {/* Category grid */}
            <div>
              <label className="text-xs font-semibold text-[#787774] uppercase tracking-wide">Danh mục</label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {filtered.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => field.onChange(cat.id)}
                        className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                          categoryId === cat.id
                            ? "border-[#16A34A] bg-[#F0FDF4] text-[#16A34A]"
                            : "border-[#EAEAEA] bg-white text-[#787774] hover:border-[#BABABA]"
                        }`}
                      >
                        {ICONS[cat.icon] || ICONS.utensils}
                        <span className="leading-tight text-center">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.categoryId && <p className="text-xs text-[#9F2F2D] mt-1">{errors.categoryId.message}</p>}
            </div>

            {/* Date + Note */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#787774] uppercase tracking-wide">Ngày</label>
                <input
                  type="date"
                  className="w-full mt-1.5 px-3 py-2 border border-[#EAEAEA] rounded-lg bg-[#FBFBFA] text-sm text-[#111111] focus:outline-none focus:border-[#16A34A] transition-colors"
                  {...register("date")}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#787774] uppercase tracking-wide">Ghi chú</label>
                <input
                  type="text"
                  placeholder="Tuỳ chọn..."
                  className="w-full mt-1.5 px-3 py-2 border border-[#EAEAEA] rounded-lg bg-[#FBFBFA] text-sm text-[#111111] focus:outline-none focus:border-[#16A34A] transition-colors"
                  {...register("note")}
                />
              </div>
            </div>

            {submitError && (
              <div className="p-3 bg-[#FDEBEC] border border-[#FAD1D3] rounded-lg text-xs text-[#9F2F2D]">{submitError}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#16A34A] text-white text-sm font-bold rounded-xl hover:bg-[#14803d] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(22,163,74,0.3)]"
            >
              {submitting ? (
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Lưu giao dịch
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
