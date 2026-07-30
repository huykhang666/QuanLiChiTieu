"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";

interface Category { id: string; name: string; type: string; icon: string; }

interface EntryItem {
  id: string; // local temp id
  amount: number;
  type: "income" | "expense";
  categoryId: string;
  categoryName: string;
  date: string;
  note: string;
}

const ICONS: { [k: string]: React.ReactNode } = {
  utensils: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H7v6a3 3 0 003 3h4a3 3 0 003-3V5z" /></svg>,
  fuel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 2v3M10 2v3" /></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v11a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  "piggy-bank": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 4H3M21 12h-2M12 3v2M12 19v2" /></svg>,
  "shopping-bag": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12V8H6a2 2 0 01-2-2 2 2 0 012-2h12v4M4 6v12a2 2 0 002 2h14v-4M20 12a2 2 0 000 4h.01" /></svg>,
};

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " đ";
const today = () => new Date().toISOString().split("T")[0];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QuickAddModal({ open, onClose, onSuccess }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Current entry form state
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  // Queue of entries to save
  const [queue, setQueue] = useState<EntryItem[]>([]);

  // Save state
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const filtered = categories.filter((c) => c.type === type);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    };
    init();
  }, []);

  useEffect(() => {
    if (open) {
      resetForm();
      setQueue([]);
      setSuccess(false);
      setTimeout(() => amountRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const resetForm = () => {
    setAmount("");
    setCategoryId("");
    setDate(today());
    setNote("");
    setFormError("");
    setType("expense");
  };

  const resetFormKeepDate = () => {
    setAmount("");
    setCategoryId("");
    setNote("");
    setFormError("");
    // Keep type and date for convenience
  };

  const handleAddToQueue = () => {
    const amountNum = Number(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0 || !Number.isInteger(amountNum)) {
      setFormError("Nhập số tiền hợp lệ (số nguyên dương).");
      return;
    }
    if (!categoryId) {
      setFormError("Vui lòng chọn danh mục.");
      return;
    }
    setFormError("");
    const cat = categories.find((c) => c.id === categoryId);
    const newEntry: EntryItem = {
      id: `${Date.now()}-${Math.random()}`,
      amount: amountNum,
      type,
      categoryId,
      categoryName: cat?.name || "",
      date,
      note,
    };
    setQueue((prev) => [...prev, newEntry]);
    resetFormKeepDate();
    setTimeout(() => amountRef.current?.focus(), 50);
  };

  const handleRemoveFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSaveAll = async () => {
    if (!userId) return;
    // Also add current form entry if filled
    let finalQueue = [...queue];
    const amountNum = Number(amount);
    if (amount && !isNaN(amountNum) && amountNum > 0 && categoryId) {
      const cat = categories.find((c) => c.id === categoryId);
      finalQueue = [...finalQueue, {
        id: `${Date.now()}-current`,
        amount: amountNum,
        type,
        categoryId,
        categoryName: cat?.name || "",
        date,
        note,
      }];
    }

    if (finalQueue.length === 0) {
      setFormError("Chưa có mục nào để lưu.");
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        finalQueue.map((entry) =>
          fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: entry.amount,
              type: entry.type,
              categoryId: entry.categoryId,
              date: entry.date,
              note: entry.note,
              userId,
            }),
          })
        )
      );
      setSuccess(true);
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 1200);
    } catch {
      setFormError("Có lỗi xảy ra khi lưu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const totalItems = queue.length + (amount && categoryId ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — wider to fit queue */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F0F0EE] shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Ghi chép nhanh</h2>
            <p className="text-xs text-[#787774] mt-0.5">Thêm nhiều mục rồi lưu 1 lần</p>
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
            <p className="text-base font-bold text-[#111111]">Đã lưu {queue.length} giao dịch!</p>
            <p className="text-sm text-[#787774] mt-1">Tất cả đã được ghi chép thành công.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 min-h-0">
            {/* Queue list */}
            {queue.length > 0 && (
              <div className="px-5 pt-4 space-y-2">
                <p className="text-[10px] font-bold text-[#787774] uppercase tracking-wider">Danh sách chờ lưu ({queue.length} mục)</p>
                {queue.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between bg-[#F7F6F3] rounded-xl px-3.5 py-2.5 border border-[#EAEAEA]">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        entry.type === "expense" ? "bg-[#FEF2F2] text-[#9F2F2D]" : "bg-[#F0FDF4] text-[#16A34A]"
                      }`}>
                        {entry.type === "expense" ? "Chi" : "Thu"}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-[#111111]">{entry.categoryName}</p>
                        {entry.note && <p className="text-[10px] text-[#787774]">{entry.note}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold tabular-nums ${entry.type === "expense" ? "text-[#9F2F2D]" : "text-[#16A34A]"}`}>
                        {entry.type === "expense" ? "−" : "+"}{fmt(entry.amount)}
                      </span>
                      <button
                        onClick={() => handleRemoveFromQueue(entry.id)}
                        className="p-1 rounded-full hover:bg-[#EAEAEA] text-[#BABABA] hover:text-[#9F2F2D] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <div className="h-px bg-[#F0F0EE] mt-1" />
              </div>
            )}

            {/* Entry form */}
            <div className="px-5 pt-4 pb-5 space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); setCategoryId(""); }}
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
                    ref={amountRef}
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddToQueue(); } }}
                    className="w-full px-4 py-3 text-2xl font-bold border border-[#EAEAEA] rounded-xl bg-[#FBFBFA] text-[#111111] focus:outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/10 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#787774] font-medium">đ</span>
                </div>
              </div>

              {/* Category grid */}
              <div>
                <label className="text-xs font-semibold text-[#787774] uppercase tracking-wide">Danh mục</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {filtered.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
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
              </div>

              {/* Date + Note */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#787774] uppercase tracking-wide">Ngày</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border border-[#EAEAEA] rounded-lg bg-[#FBFBFA] text-sm text-[#111111] focus:outline-none focus:border-[#16A34A] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#787774] uppercase tracking-wide">Ghi chú</label>
                  <input
                    type="text"
                    placeholder="Tuỳ chọn..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddToQueue(); } }}
                    className="w-full mt-1.5 px-3 py-2 border border-[#EAEAEA] rounded-lg bg-[#FBFBFA] text-sm text-[#111111] focus:outline-none focus:border-[#16A34A] transition-colors"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-[#FDEBEC] border border-[#FAD1D3] rounded-lg text-xs text-[#9F2F2D]">{formError}</div>
              )}

              {/* Add to queue button */}
              <button
                type="button"
                onClick={handleAddToQueue}
                className="w-full py-2.5 border-2 border-dashed border-[#16A34A]/40 text-[#16A34A] text-sm font-semibold rounded-xl hover:bg-[#F0FDF4] hover:border-[#16A34A] transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Thêm mục khác
              </button>
            </div>
          </div>
        )}

        {/* Footer — Save all button */}
        {!success && (
          <div className="px-5 pb-5 pt-3 border-t border-[#F0F0EE] shrink-0">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || totalItems === 0}
              className="w-full py-3.5 bg-[#16A34A] text-white text-sm font-bold rounded-xl hover:bg-[#14803d] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(22,163,74,0.3)]"
            >
              {saving ? (
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {saving
                ? "Đang lưu..."
                : totalItems > 0
                  ? `Lưu tất cả ${totalItems} giao dịch`
                  : "Lưu tất cả"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
