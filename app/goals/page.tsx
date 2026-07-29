"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
}

export default function SavingsGoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states tạo mục tiêu mới
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Quick contribute states (lưu số tiền cộng thêm theo goal.id)
  const [contributions, setContributions] = useState<{ [goalId: string]: string }>({});

  // Edit states
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.push("/login");
          return;
        }

        const res = await fetch("/api/goals");
        if (!res.ok) throw new Error("Không thể tải danh sách mục tiêu.");
        const goalData = await res.json();
        setGoals(goalData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [router, supabase.auth]);

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

      // Reset form
      setNewTitle("");
      setNewTarget("");
      setNewDeadline("");
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
      alert("Vui lòng nhập số tiền tích lũy hợp lệ (số nguyên dương).");
      return;
    }

    const nextAmount = goal.currentAmount + amountNum;

    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentAmount: nextAmount,
        }),
      });

      if (!res.ok) throw new Error("Gặp lỗi khi cập nhật số tiền.");

      const updated = await res.json();
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));

      // Xóa input
      setContributions((prev) => ({ ...prev, [goal.id]: "" }));
    } catch (err: any) {
      alert(err.message || "Không thể thực hiện tích lũy.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mục tiêu này?")) return;

    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gặp lỗi khi xóa mục tiêu.");

      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err: any) {
      alert(err.message || "Không thể xóa mục tiêu.");
    }
  };

  const handleUpdateSuccess = (updatedGoal: SavingsGoal) => {
    setGoals((prev) => prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)));
    setEditingGoal(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Không có hạn chót";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFBFA]">
        <div className="text-sm font-mono text-[#787774]">Đang tải danh sách mục tiêu...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBFBFA] py-16 px-6 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <header className="border-b border-[#EAEAEA] pb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-mono text-[#787774] hover:text-[#111111] transition-colors mb-2"
          >
            ← Bảng điều khiển
          </Link>
          <h1 className="font-serif text-4xl font-normal tracking-tight text-[#111111] italic">
            Mục tiêu tiết kiệm
          </h1>
          <p className="text-xs text-[#787774] mt-1 font-mono">
            Đặt mục tiêu và tích lũy từng ngày để đạt được kế hoạch mua sắm
          </p>
        </header>

        {error && (
          <div className="p-4 bg-[#FDEBEC] border border-[#FAD1D3] rounded-md text-sm text-[#9F2F2D]">
            {error}
          </div>
        )}

        {/* Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cột Trái: Danh sách mục tiêu (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {goals.length === 0 ? (
              <div className="bg-white border border-[#EAEAEA] rounded-xl p-12 text-center text-sm text-[#787774]">
                Bạn chưa thiết lập mục tiêu tiết kiệm nào. Hãy tạo mục tiêu đầu tiên ở cột bên phải.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {goals.map((goal) => {
                  const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                  const formattedPercent = Math.min(Math.round(percent), 100);

                  return (
                    <div key={goal.id} className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-4">
                      {/* Tiêu đề & Hạn chót */}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-serif text-2xl font-normal text-[#111111]">
                            {goal.title}
                          </h3>
                          <span className="text-[10px] font-mono text-[#787774] block mt-0.5">
                            Hạn chót: {formatDate(goal.deadline)}
                          </span>
                        </div>

                        {/* Sửa / Xóa */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingGoal(goal)}
                            className="text-xs text-[#787774] hover:text-[#111111] hover:underline"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(goal.id)}
                            className="text-xs text-[#9F2F2D] hover:underline"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      {/* Tiến độ và số tiền */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline text-xs font-mono text-[#787774]">
                          <span>
                            Đã tích lũy:{" "}
                            <strong className="text-[#346538] font-medium">
                              {formatCurrency(goal.currentAmount)}
                            </strong>
                          </span>
                          <span>Mục tiêu: {formatCurrency(goal.targetAmount)}</span>
                        </div>

                        {/* Thanh tiến độ */}
                        <div className="flex items-center gap-4">
                          <div className="flex-1 bg-[#EAEAEA] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#346538] h-full rounded-full transition-all duration-300"
                              style={{ width: `${formattedPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-medium text-[#111111] w-8 text-right">
                            {formattedPercent}%
                          </span>
                        </div>
                      </div>

                      {/* Form cộng tiền tích lũy thủ công */}
                      <div className="pt-3 border-t border-[#EAEAEA] flex items-center justify-between gap-4">
                        <span className="text-[10px] font-mono font-medium text-[#787774] tracking-wider uppercase">
                          Tích lũy thủ công
                        </span>

                        <div className="flex gap-2 w-48">
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="+ 100.000"
                            className="w-full px-2.5 py-1 border border-[#EAEAEA] rounded bg-[#FBFBFA] font-mono text-xs text-right text-[#111111] focus:outline-none focus:border-[#111111]"
                            value={contributions[goal.id] || ""}
                            onChange={(e) =>
                              setContributions((prev) => ({
                                ...prev,
                                [goal.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() => handleContribute(goal)}
                            className="px-3 py-1 bg-[#111111] text-white text-[10px] font-medium rounded hover:bg-[#333333] transition-colors focus:outline-none whitespace-nowrap active:scale-[0.98]"
                          >
                            Cộng
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cột Phải: Form Tạo mục tiêu mới (1/3) */}
          <div className="space-y-6">
            <form onSubmit={handleCreate} className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-4">
              <div>
                <h2 className="font-serif text-2xl font-normal text-[#111111] italic">
                  Tạo mục tiêu mới
                </h2>
                <p className="text-xs text-[#787774] mt-1">
                  Thiết lập kế hoạch tài chính cho tương lai
                </p>
              </div>

              {/* Tiêu đề */}
              <div className="space-y-1.5">
                <label htmlFor="title" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                  Tiêu đề
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  placeholder="Ví dụ: Mua Macbook Pro"
                  className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-xs text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              {/* Số tiền cần đạt */}
              <div className="space-y-1.5">
                <label htmlFor="target" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                  Số tiền mục tiêu (VNĐ)
                </label>
                <input
                  id="target"
                  type="number"
                  required
                  placeholder="0"
                  className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] font-mono text-xs text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                />
              </div>

              {/* Hạn chót */}
              <div className="space-y-1.5">
                <label htmlFor="deadline" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                  Hạn chót
                </label>
                <input
                  id="deadline"
                  type="date"
                  className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-xs text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
              </div>

              {formError && (
                <div className="p-3 bg-[#FDEBEC] border border-[#FAD1D3] rounded-md text-xs text-[#9F2F2D]">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 bg-[#111111] text-white text-xs font-medium rounded-md hover:bg-[#333333] transition-colors focus:outline-none disabled:opacity-50 active:scale-[0.98] transform duration-150 font-sans tracking-wide uppercase"
              >
                {creating ? "Đang tạo..." : "Thiết lập mục tiêu"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal chỉnh sửa mục tiêu */}
      {editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </main>
  );
}

// Subcomponent Modal Chỉnh sửa
interface EditModalProps {
  goal: SavingsGoal;
  onClose: () => void;
  onSuccess: (updatedGoal: SavingsGoal) => void;
}

function EditGoalModal({ goal, onClose, onSuccess }: EditModalProps) {
  const [title, setTitle] = useState(goal.title);
  const [targetAmount, setTargetAmount] = useState(goal.targetAmount.toString());
  const [currentAmount, setCurrentAmount] = useState(goal.currentAmount.toString());
  const [deadline, setDeadline] = useState(goal.deadline ? goal.deadline.split("T")[0] : "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const targetNum = Number(targetAmount);
      const currentNum = Number(currentAmount);

      if (!title) throw new Error("Vui lòng nhập tiêu đề.");
      if (isNaN(targetNum) || targetNum <= 0 || !Number.isInteger(targetNum)) {
        throw new Error("Số tiền mục tiêu phải là số nguyên dương.");
      }
      if (isNaN(currentNum) || currentNum < 0 || !Number.isInteger(currentNum)) {
        throw new Error("Số tiền tích lũy phải là số nguyên không âm.");
      }

      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          targetAmount: targetNum,
          currentAmount: currentNum,
          deadline: deadline || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gặp lỗi khi lưu.");
      }

      const updated = await res.json();
      onSuccess(updated);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white border border-[#EAEAEA] rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FBFBFA] border-b border-[#EAEAEA]">
          <h3 className="font-serif text-xl font-normal text-[#111111] italic">
            Chỉnh sửa mục tiêu
          </h3>
          <button onClick={onClose} className="text-xs text-[#787774] hover:text-[#111111] font-mono">
            Đóng [ESC]
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="editGoalTitle" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
              Tiêu đề
            </label>
            <input
              id="editGoalTitle"
              type="text"
              required
              className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-sm text-[#111111] focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="editGoalCurrent" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                Đã tích lũy (VNĐ)
              </label>
              <input
                id="editGoalCurrent"
                type="number"
                required
                className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] font-mono text-sm text-[#111111] focus:outline-none"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="editGoalTarget" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                Mục tiêu (VNĐ)
              </label>
              <input
                id="editGoalTarget"
                type="number"
                required
                className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] font-mono text-sm text-[#111111] focus:outline-none"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="editGoalDeadline" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
              Hạn chót
            </label>
            <input
              id="editGoalDeadline"
              type="date"
              className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-xs text-[#111111] focus:outline-none"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-[#FDEBEC] border border-[#FAD1D3] rounded-md text-xs text-[#9F2F2D]">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-[#EAEAEA] rounded-md text-xs font-medium text-[#787774] hover:bg-[#FBFBFA] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-[#111111] text-white text-xs font-medium rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              {submitting ? "Đang lưu..." : "Cập nhật"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
