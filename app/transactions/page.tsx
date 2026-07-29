"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import * as z from "zod";
import ThemeToggle from "@/components/ThemeToggle";

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  isDefault: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  note: string | null;
  date: string;
  categoryId: string;
  category: {
    name: string;
    icon: string;
  };
}

// Map các icon danh mục sang SVG (đồng bộ với trang thêm mới)
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

export default function TransactionsListPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // States bộ lọc
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // States chỉnh sửa / xóa
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // Khởi tạo thông tin người dùng và load danh mục lọc
  useEffect(() => {
    const initPage = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.push("/login");
          return;
        }
        setUserId(data.user.id);

        const resCat = await fetch("/api/categories");
        if (resCat.ok) {
          const catData = await resCat.json();
          setCategories(catData);
        }
      } catch (err: any) {
        console.error("Lỗi khi load trang:", err);
      }
    };

    initPage();
  }, [router, supabase.auth]);

  // Load danh sách giao dịch dựa trên bộ lọc
  useEffect(() => {
    if (!userId) return;

    const fetchTransactions = async () => {
      try {
        let url = `/api/transactions?userId=${userId}`;
        if (fromDate) url += `&from=${fromDate}`;
        if (toDate) url += `&to=${toDate}`;
        if (selectedCategory) url += `&categoryId=${selectedCategory}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Không thể tải danh sách giao dịch.");
        const tData = await res.json();
        setTransactions(tData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [userId, fromDate, toDate, selectedCategory]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này? Hành động này không thể hoàn tác.")) return;
    setIsDeletingId(id);

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Lỗi khi xóa giao dịch.");

      // Xóa thành công, cập nhật state tại chỗ
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi khi xóa.");
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleUpdateSuccess = (updatedT: Transaction) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedT.id ? { ...t, ...updatedT, category: categories.find(c => c.id === updatedT.categoryId) || t.category } : t))
    );
    setEditingTransaction(null);
  };

  // Format số tiền VNĐ dạng dấu chấm cách hàng nghìn
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
  };

  // Format ngày tháng DD/MM/YYYY
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setSelectedCategory("");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFBFA]">
        <div className="text-sm font-mono text-[#787774]">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBFBFA] py-16 px-6 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#EAEAEA] pb-6">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs font-mono text-[#787774] hover:text-[#111111] transition-colors mb-2"
            >
              ← Bảng điều khiển
            </Link>
            <h1 className="font-serif text-4xl font-normal tracking-tight text-[#111111] italic">
              Lịch sử giao dịch
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/transactions/new"
              className="px-4 py-2.5 bg-[#111111] text-white text-xs font-medium rounded-md hover:bg-[#333333] transition-colors focus:outline-none inline-block active:scale-[0.98] transform duration-150 font-sans tracking-wide uppercase"
            >
              + Ghi chép mới
            </Link>
          </div>
        </header>

        {/* Bộ lọc (Filters Section) */}
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="filterFrom" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                Từ ngày
              </label>
              <input
                id="filterFrom"
                type="date"
                className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-xs text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="filterTo" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                Đến ngày
              </label>
              <input
                id="filterTo"
                type="date"
                className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-xs text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="filterCategory" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                Danh mục
              </label>
              <select
                id="filterCategory"
                className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-xs text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === "income" ? "Thu" : "Chi"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(fromDate || toDate || selectedCategory) && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#787774] hover:text-[#9F2F2D] font-mono border-b border-[#787774] pb-0.5 whitespace-nowrap transition-colors"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-[#FDEBEC] border border-[#FAD1D3] rounded-md text-sm text-[#9F2F2D]">
            {error}
          </div>
        )}

        {/* Danh sách giao dịch */}
        <div className="bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <p className="text-sm text-[#787774] font-sans">
                Không tìm thấy giao dịch nào phù hợp với bộ lọc.
              </p>
              <Link
                href="/transactions/new"
                className="inline-block text-xs font-mono text-[#111111] border-b border-[#111111] pb-0.5 hover:text-[#333333] hover:border-[#333333] transition-colors"
              >
                Ghi chép giao dịch mới ngay →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#EAEAEA]">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center justify-between p-4 sm:p-5 hover:bg-[#FBFBFA] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon đại diện */}
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#F7F6F3] text-[#111111] border border-[#EAEAEA]">
                      {IconMap[t.category?.icon] || IconMap.utensils}
                    </div>

                    <div>
                      <div className="text-sm font-medium text-[#111111]">
                        {t.category?.name || "Không xác định"}
                      </div>
                      {t.note && (
                        <div className="text-xs text-[#787774] mt-0.5 font-sans leading-none">
                          {t.note}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right space-y-1">
                      <div
                        className={`text-sm font-mono font-medium ${
                          t.type === "expense" ? "text-[#9F2F2D]" : "text-[#346538]"
                        }`}
                      >
                        {t.type === "expense" ? "-" : "+"} {formatCurrency(t.amount)}
                      </div>
                      <div className="text-[10px] font-mono text-[#787774]">
                        {formatDate(t.date)}
                      </div>
                    </div>

                    {/* Nút Sửa / Xóa (Ẩn ở mobile và hiển thị nổi bật hơn ở hover trên desktop) */}
                    <div className="flex items-center gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingTransaction(t)}
                        className="text-xs font-medium text-[#111111] hover:underline"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={isDeletingId === t.id}
                        className="text-xs font-medium text-[#9F2F2D] hover:underline disabled:opacity-50"
                      >
                        {isDeletingId === t.id ? "Đang xóa" : "Xóa"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Chỉnh Sửa Giao Dịch */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          categories={categories}
          onClose={() => setEditingTransaction(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </main>
  );
}

// Subcomponent Modal Chỉnh sửa
interface EditModalProps {
  transaction: Transaction;
  categories: Category[];
  onClose: () => void;
  onSuccess: (updatedT: Transaction) => void;
}

function EditTransactionModal({ transaction, categories, onClose, onSuccess }: EditModalProps) {
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [type, setType] = useState<"income" | "expense">(transaction.type);
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [date, setDate] = useState(transaction.date.split("T")[0]);
  const [note, setNote] = useState(transaction.note || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Validate bằng Zod client-side
  const validateForm = () => {
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !Number.isInteger(parsedAmount)) {
      throw new Error("Số tiền phải là số nguyên dương.");
    }
    if (!categoryId) {
      throw new Error("Vui lòng chọn danh mục.");
    }
    if (!date) {
      throw new Error("Vui lòng chọn ngày giao dịch.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      validateForm();

      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          type,
          categoryId,
          date,
          note,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gặp lỗi khi lưu chỉnh sửa.");
      }

      const updatedData = await res.json();
      onSuccess(updatedData);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white border border-[#EAEAEA] rounded-xl overflow-hidden shadow-sm">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FBFBFA] border-b border-[#EAEAEA]">
          <h3 className="font-serif text-xl font-normal text-[#111111] italic">
            Chỉnh sửa ghi chép
          </h3>
          <button onClick={onClose} className="text-xs text-[#787774] hover:text-[#111111] font-mono">
            Đóng [ESC]
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Loại giao dịch */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
              Loại giao dịch
            </label>
            <div className="flex border border-[#EAEAEA] rounded-md overflow-hidden bg-[#FBFBFA]">
              <button
                type="button"
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                  type === "expense" ? "bg-[#111111] text-white" : "text-[#787774] hover:bg-[#EAEAEA]"
                }`}
                onClick={() => {
                  setType("expense");
                  setCategoryId("");
                }}
              >
                Chi tiêu
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                  type === "income" ? "bg-[#111111] text-white" : "text-[#787774] hover:bg-[#EAEAEA]"
                }`}
                onClick={() => {
                  setType("income");
                  setCategoryId("");
                }}
              >
                Thu nhập
              </button>
            </div>
          </div>

          {/* Số tiền */}
          <div className="space-y-1.5">
            <label htmlFor="editAmount" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
              Số tiền (VNĐ)
            </label>
            <input
              id="editAmount"
              type="number"
              required
              className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] font-mono text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Chọn danh mục */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
              Danh mục
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-0.5">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex flex-col items-center justify-center p-2.5 border rounded-lg transition-all ${
                    categoryId === cat.id
                      ? "border-[#111111] bg-[#F7F6F3] text-[#111111]"
                      : "border-[#EAEAEA] bg-white text-[#787774] hover:bg-[#FBFBFA]"
                  }`}
                >
                  <div className="mb-0.5 scale-90">{IconMap[cat.icon] || IconMap.utensils}</div>
                  <span className="text-[10px] font-medium">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ngày & Ghi chú */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="editDate" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                Ngày giao dịch
              </label>
              <input
                id="editDate"
                type="date"
                required
                className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-xs text-[#111111] focus:outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="editNote" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                Ghi chú
              </label>
              <input
                id="editNote"
                type="text"
                className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-xs text-[#111111] focus:outline-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[#FDEBEC] border border-[#FAD1D3] rounded-md text-xs text-[#9F2F2D]">
              {error}
            </div>
          )}

          {/* Nút hành động */}
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
