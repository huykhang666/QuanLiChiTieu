"use client";

import { useState, useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess?: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " đ";

export default function AdjustBalanceModal({ open, onClose, currentBalance, onSuccess }: Props) {
  const [targetStr, setTargetStr] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTargetStr(currentBalance >= 0 ? currentBalance.toString() : "0");
      setNote("");
      setError(null);
    }
  }, [open, currentBalance]);

  if (!open) return null;

  const targetAmount = parseInt(targetStr.replace(/\D/g, ""), 10) || 0;
  const diff = targetAmount - currentBalance;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setTargetStr(raw);
  };

  const handleQuickAdd = (add: number) => {
    const next = targetAmount + add;
    setTargetStr(next.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/wallet/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetBalance: targetAmount,
          note: note.trim() || "Điều chỉnh số dư ví",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể cập nhật số dư ví.");
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Điều chỉnh số tiền hiện có
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cập nhật số tiền thực tế đang có trong ví hoặc tài khoản
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Current balance display */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Số dư hiện tại trên app:</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{fmt(currentBalance)}</span>
          </div>

          {/* New target balance input */}
          <div className="space-y-1.5">
            <label htmlFor="targetBalance" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Số tiền thực tế mới (VNĐ) <span className="text-emerald-600">*</span>
            </label>
            <div className="relative">
              <input
                id="targetBalance"
                type="text"
                required
                autoFocus
                value={targetStr ? new Intl.NumberFormat("vi-VN").format(targetAmount) : ""}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full px-4 py-3 text-lg font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all text-right pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                đ
              </span>
            </div>
          </div>

          {/* Quick presets */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Cộng thêm nhanh:</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[100000, 500000, 1000000, 5000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="py-1.5 px-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-300"
                >
                  +{val >= 1000000 ? `${val / 1000000}Tr` : `${val / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Difference indicator */}
          <div className="p-3 rounded-xl border text-xs leading-relaxed transition-all">
            {diff === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">
                Số tiền nhập vào bằng với số dư hiện tại (không có thay đổi).
              </p>
            ) : diff > 0 ? (
              <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                Tăng thêm <strong>+{fmt(diff)}</strong> (Hệ thống sẽ tự động ghi nhận một khoản thu nhập bù vào ví).
              </p>
            ) : (
              <p className="text-red-500 dark:text-red-400 font-medium">
                Giảm bớt <strong>−{fmt(Math.abs(diff))}</strong> (Hệ thống sẽ ghi nhận một khoản chi tiêu điều chỉnh ví).
              </p>
            )}
          </div>

          {/* Note input */}
          <div className="space-y-1.5">
            <label htmlFor="adjustNote" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ghi chú (tùy chọn)
            </label>
            <input
              id="adjustNote"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Đếm lại tiền trong ví, Nhận lương chưa ghi..."
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-400"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl transition-all shadow-md shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang lưu...
                </>
              ) : (
                "Cập nhật số dư"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
