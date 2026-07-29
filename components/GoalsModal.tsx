"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
}

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GoalsModal({ isOpen, onClose, onSuccess }: GoalsModalProps) {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [contributions, setContributions] = useState<{ [goalId: string]: string }>({});

  const supabase = createClient();

  const loadGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Không thể tải danh sách mục tiêu.");
      setGoals(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadGoals();
    }
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreating(true);
    try {
      const targetNum = Number(newTarget);
      if (!newTitle) throw new Error("Vui lòng nhập tiêu đề mục tiêu.");
      if (isNaN(targetNum) || targetNum <= 0 || !Number.isInteger(targetNum)) {
        throw new Error("Số tiền mục tiêu phải là số nguyên dương.");
      }
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          targetAmount: targetNum,
          deadline: newDeadline || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gặp lỗi khi tạo mục tiêu.");
      }
      const createdGoal = await res.json();
      setGoals((prev) => [createdGoal, ...prev]);
      setNewTitle("");
      setNewTarget("");
      setNewDeadline("");
      onSuccess();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleContribute = async (goal: SavingsGoal) => {
    const amountStr = contributions[goal.id] || "";
    const amountNum = Number(amountStr);

    if (isNaN(amountNum) || amountNum <= 0 || !Number.isInteger(amountNum)) {
      alert("Vui lòng nhập số tiền tích lũy hợp lệ.");
      return;
    }

    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount: goal.currentAmount + amountNum }),
      });
      if (!res.ok) throw new Error("Lỗi khi cập nhật.");
      const updated = await res.json();
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setContributions((prev) => ({ ...prev, [goal.id]: "" }));
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Không thể thực hiện tích lũy.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mục tiêu này?")) return;
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setGoals((prev) => prev.filter((g) => g.id !== id));
      onSuccess();
    } catch {
      alert("Không thể xóa mục tiêu.");
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " đ";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-[#121211] border border-[#EAEAEA] dark:border-[#2F2F2D] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FBFBFA] dark:bg-[#1C1C1A] border-b border-[#EAEAEA] dark:border-[#2F2F2D] shrink-0">
          <h3 className="text-lg font-bold text-[#111111] dark:text-[#F5F5F0]">Mục tiêu tiết kiệm</h3>
          <button onClick={onClose} className="text-sm font-medium text-[#787774] hover:text-[#111111] dark:hover:text-[#F5F5F0]">
            Đóng
          </button>
        </div>

        {/* Layout Split scrollable */}
        <div className="overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          
          {/* List of Goals */}
          <div className="flex-1 space-y-4">
            <h4 className="text-xs font-bold text-[#787774] uppercase tracking-wider">Danh sách mục tiêu</h4>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <svg className="animate-spin h-5 w-5 text-[#16A34A]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : goals.length === 0 ? (
              <p className="text-xs text-[#787774] text-center py-8">Chưa có mục tiêu tiết kiệm.</p>
            ) : (
              <div className="space-y-4">
                {goals.map((g) => {
                  const pct = Math.min(100, Math.round(g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0));
                  return (
                    <div key={g.id} className="p-4 border border-[#EAEAEA] dark:border-[#2F2F2D] rounded-xl space-y-3 bg-[#FBFBFA] dark:bg-[#1C1C1A]">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h5 className="text-sm font-bold text-[#111111] dark:text-[#F5F5F0]">{g.title}</h5>
                          <span className="text-[10px] text-[#787774] font-mono block">
                            Hạn chót: {g.deadline ? new Date(g.deadline).toLocaleDateString("vi-VN") : "Không hạn chót"}
                          </span>
                        </div>
                        <button onClick={() => handleDelete(g.id)} className="text-[10px] font-bold text-[#9F2F2D] hover:underline">Xóa</button>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-[#787774] font-semibold">
                          <span>{fmt(g.currentAmount)}</span>
                          <span>{pct}% của {fmt(g.targetAmount)}</span>
                        </div>
                        <div className="h-1.5 bg-[#EAEAEA] dark:bg-[#2F2F2D] rounded-full overflow-hidden">
                          <div className="bg-[#16A34A] h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {/* Contribution */}
                      <div className="flex gap-2 items-center justify-end pt-1">
                        <input
                          type="number"
                          placeholder="+ 50k"
                          className="w-24 px-2 py-1 border border-[#EAEAEA] dark:border-[#2F2F2D] rounded-lg bg-white dark:bg-[#121211] font-mono text-[10px] text-right text-[#111111] dark:text-[#F5F5F0] focus:outline-none"
                          value={contributions[g.id] || ""}
                          onChange={(e) => setContributions((prev) => ({ ...prev, [g.id]: e.target.value }))}
                        />
                        <button
                          onClick={() => handleContribute(g)}
                          className="px-2.5 py-1 bg-[#16A34A] text-white text-[10px] font-bold rounded-lg hover:bg-[#14803d] active:scale-[0.98]"
                        >
                          Cộng
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Goal Form */}
          <form onSubmit={handleCreate} className="w-full md:w-64 border-t md:border-t-0 md:border-l border-[#EAEAEA] dark:border-[#2F2F2D] pt-4 md:pt-0 md:pl-6 space-y-4 shrink-0">
            <h4 className="text-xs font-bold text-[#787774] uppercase tracking-wider">Tạo mục tiêu mới</h4>
            
            <div className="space-y-1">
              <label htmlFor="modalGoalTitle" className="text-[10px] font-semibold text-[#787774] uppercase">Tiêu đề</label>
              <input
                id="modalGoalTitle"
                type="text"
                required
                placeholder="Mua máy tính..."
                className="w-full px-3 py-2 border border-[#EAEAEA] dark:border-[#2F2F2D] rounded-xl bg-[#FBFBFA] dark:bg-[#1C1C1A] text-xs text-[#111111] dark:text-[#F5F5F0] focus:outline-none"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="modalGoalTarget" className="text-[10px] font-semibold text-[#787774] uppercase">Số tiền cần đạt</label>
              <input
                id="modalGoalTarget"
                type="number"
                required
                placeholder="0"
                className="w-full px-3 py-2 border border-[#EAEAEA] dark:border-[#2F2F2D] rounded-xl bg-[#FBFBFA] dark:bg-[#1C1C1A] font-mono text-xs text-[#111111] dark:text-[#F5F5F0] focus:outline-none"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="modalGoalDeadline" className="text-[10px] font-semibold text-[#787774] uppercase">Hạn chót</label>
              <input
                id="modalGoalDeadline"
                type="date"
                className="w-full px-3 py-2 border border-[#EAEAEA] dark:border-[#2F2F2D] rounded-xl bg-[#FBFBFA] dark:bg-[#1C1C1A] text-xs text-[#111111] dark:text-[#F5F5F0] focus:outline-none"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </div>

            {formError && (
              <p className="text-[10px] text-[#9F2F2D]">{formError}</p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 bg-[#16A34A] text-white text-xs font-bold rounded-xl hover:bg-[#14803d] active:scale-[0.98] transition-all"
            >
              {creating ? "Đang tạo..." : "Thiết lập mục tiêu"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
