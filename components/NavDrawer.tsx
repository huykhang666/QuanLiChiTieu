"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";
import { createClient } from "@/lib/supabase";

/* ─── Types ─── */
type DrawerSection = "transactions" | "summary" | "budgets" | "goals" | "settings";

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
}

interface Transaction {
  id: string; amount: number; type: "income" | "expense";
  date: string; note: string | null; categoryId: string;
  category?: { name: string; icon: string };
}

interface Budget {
  id: string; limit: number; categoryId: string;
  category: { name: string }; spent?: number;
}

interface Goal {
  id: string; title: string; targetAmount: number; currentAmount: number; deadline: string | null;
}

interface PreloadedData {
  categories: Category[];
  transactions: Transaction[];
  budgets: any[];
  goals: Goal[];
}

interface Props {
  section: DrawerSection | null;
  onClose: () => void;
  preloadedData?: PreloadedData | null;
  onDataMutated?: () => void;
}

const SECTION_LABELS: Record<DrawerSection, string> = {
  transactions: "Quản lý Giao dịch",
  summary: "Báo cáo chi tiết",
  budgets: "Hạn mức Chi tiêu",
  goals: "Mục tiêu Tiết kiệm",
  settings: "Cấu hình Cài đặt",
};

const TABS: { section: DrawerSection; label: string }[] = [
  { section: "transactions", label: "Giao dịch" },
  { section: "summary",      label: "Báo cáo" },
  { section: "budgets",      label: "Hạn mức" },
  { section: "goals",        label: "Mục tiêu" },
  { section: "settings",     label: "Cài đặt" },
];

const COLORS = ["#16A34A", "#E1594F", "#2563EB", "#D97706", "#7C3AED", "#4B5563"];

/* ─── Helpers ─── */
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " đ";
const fmtDate = (s: string) => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
};

const Spinner = () => (
  <div className="flex justify-center py-12">
    <svg className="animate-spin w-6 h-6 text-[#16A34A]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  </div>
);

/** Skeleton list for instant perceived performance */
const SkeletonList = () => (
  <div className="space-y-2 py-2">
    {[1,2,3,4,5].map(i => (
      <div key={i} className="flex items-center gap-3 p-3.5 border border-[#F0F0EE] rounded-xl animate-pulse">
        <div className="w-9 h-9 rounded-xl bg-[#F0F0EE]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-[#F0F0EE] rounded w-1/3" />
          <div className="h-2.5 bg-[#F0F0EE] rounded w-1/2" />
        </div>
        <div className="h-4 bg-[#F0F0EE] rounded w-20" />
      </div>
    ))}
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <div className="py-12 text-center">
    <p className="text-sm text-[#787774] font-medium">{text}</p>
  </div>
);

/* ─────────────────────────────────────────
   1. TRANSACTIONS PANEL (With Editing / Filtering / Deleting)
───────────────────────────────────────── */
function TransactionsPanel({ initialCategories, initialTransactions, onMutated }: {
  initialCategories: Category[];
  initialTransactions: Transaction[];
  onMutated?: () => void;
}) {
  const [items, setItems] = useState<Transaction[]>(initialTransactions);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(initialTransactions.length === 0 && initialCategories.length === 0);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedCat, setSelectedCat] = useState("");

  // Edit / Delete states
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      let url = "/api/transactions?";
      if (fromDate) url += `&from=${fromDate}`;
      if (toDate) url += `&to=${toDate}`;
      if (selectedCat) url += `&categoryId=${selectedCat}`;

      const res = await fetch(url);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch {}
    finally { setLoading(false); }
  };

  // Only re-fetch from server when filter changes (not on mount if we have preloaded data)
  const isFiltered = fromDate || toDate || selectedCat;
  useEffect(() => {
    if (!isFiltered && initialTransactions.length > 0) {
      // Use in-memory filter on preloaded data
      let filtered = initialTransactions;
      setItems(filtered);
      setLoading(false);
      return;
    }
    if (isFiltered || initialTransactions.length === 0) {
      setLoading(true);
      fetchTransactions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, selectedCat]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems(prev => prev.filter(t => t.id !== id));
        onMutated?.();
      }
    } catch {}
    finally { setDeletingId(null); }
  };

  if (loading) return <SkeletonList />;

  return (
    <div className="space-y-4">
      {/* Filtering row */}
      <div className="grid grid-cols-3 gap-2 bg-[#F7F6F3] p-3 rounded-xl">
        <div>
          <label className="text-[10px] font-bold text-[#787774] uppercase">Từ ngày</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="w-full mt-1 px-2.5 py-1.5 border border-[#E4E4E2] rounded-lg text-xs bg-white focus:outline-none focus:border-[#16A34A]"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#787774] uppercase">Đến ngày</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="w-full mt-1 px-2.5 py-1.5 border border-[#E4E4E2] rounded-lg text-xs bg-white focus:outline-none focus:border-[#16A34A]"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#787774] uppercase">Danh mục</label>
          <select
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="w-full mt-1 px-2 py-1.5 border border-[#E4E4E2] rounded-lg text-xs bg-white focus:outline-none focus:border-[#16A34A]"
          >
            <option value="">Tất cả</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions list */}
      {!items.length ? (
        <Empty text="Không tìm thấy giao dịch nào phù hợp." />
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {items.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-3.5 border border-[#F0F0EE] rounded-xl bg-white hover:border-[#16A34A]/30 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                  tx.type === "income" ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-[#FEF2F2] text-[#9F2F2D]"
                }`}>
                  {tx.category?.name?.slice(0,1) || "G"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#111111]">{tx.category?.name}</p>
                    <span className="text-[10px] text-[#787774]">{fmtDate(tx.date)}</span>
                  </div>
                  {tx.note && <p className="text-xs text-[#787774] mt-0.5">{tx.note}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold tabular-nums ${tx.type === "income" ? "text-[#16A34A]" : "text-[#9F2F2D]"}`}>
                  {tx.type === "income" ? "+" : "−"}{fmt(tx.amount)}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingItem(tx)}
                    className="p-1 hover:bg-[#F7F6F3] rounded text-[#787774] hover:text-[#111111]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    className="p-1 hover:bg-[#FEF2F2] rounded text-[#BABABA] hover:text-[#9F2F2D]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingItem && (
        <EditTransactionModal
          item={editingItem}
          categories={categories}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            fetchTransactions();
            onMutated?.();
          }}
        />
      )}
    </div>
  );
}

interface EditTxProps {
  item: Transaction; categories: Category[];
  onClose: () => void; onSuccess: () => void;
}
function EditTransactionModal({ item, categories, onClose, onSuccess }: EditTxProps) {
  const [amount, setAmount] = useState(item.amount.toString());
  const [type, setType] = useState<"income" | "expense">(item.type);
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [date, setDate] = useState(item.date.split("T")[0]);
  const [note, setNote] = useState(item.note || "");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amount);
    if (isNaN(val) || val <= 0) { setErr("Số tiền phải lớn hơn 0"); return; }
    if (!categoryId) { setErr("Chọn danh mục"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: val, type, categoryId, date, note }),
      });
      if (res.ok) onSuccess();
      else setErr("Có lỗi xảy ra");
    } catch { setErr("Lỗi kết nối"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4">
        <h3 className="text-base font-bold text-[#111111]">Chỉnh sửa giao dịch</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex gap-2">
            {(["expense", "income"] as const).map(t => (
              <button
                key={t} type="button" onClick={() => { setType(t); setCategoryId(""); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border ${
                  type === t ? "bg-[#16A34A] text-white border-[#16A34A]" : "bg-white text-[#787774] border-[#E4E4E2]"
                }`}
              >
                {t === "expense" ? "Chi tiêu" : "Thu nhập"}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#787774] uppercase">Số tiền</label>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[#E4E4E2] rounded-lg text-sm focus:outline-none focus:border-[#16A34A]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#787774] uppercase">Danh mục</label>
            <select
              value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[#E4E4E2] rounded-lg text-sm focus:outline-none"
            >
              <option value="">Chọn danh mục</option>
              {categories.filter(c => c.type === type).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#787774] uppercase">Ngày</label>
              <input
                type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#E4E4E2] rounded-lg text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#787774] uppercase">Ghi chú</label>
              <input
                type="text" value={note} onChange={e => setNote(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#E4E4E2] rounded-lg text-sm focus:outline-none"
              />
            </div>
          </div>

          {err && <p className="text-xs text-[#9F2F2D]">{err}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2 border border-[#E4E4E2] rounded-xl text-sm font-semibold hover:bg-[#F7F6F3]"
            >
              Hủy
            </button>
            <button
              type="submit" disabled={submitting}
              className="flex-1 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-semibold hover:bg-[#14803d]"
            >
              {submitting ? "Đang lưu..." : "Cập nhật"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   2. SUMMARY & REPORTS PANEL (With PieChart & Excel Export)
───────────────────────────────────────── */
function SummaryPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReports = () => {
    fetch("/api/summary/reports")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const fromStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const toStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const res = await fetch(`/api/transactions?from=${fromStr}&to=${toStr}`);
      if (!res.ok) throw new Error("Không có giao dịch.");
      const list = await res.json();

      if (!list.length) {
        alert("Tháng này chưa có giao dịch để xuất!");
        return;
      }

      const excelRows = list.map((t: any) => ({
        "Ngày": fmtDate(t.date),
        "Danh mục": t.category?.name || "Khác",
        "Loại": t.type === "income" ? "Thu nhập" : "Chi tiêu",
        "Số tiền (đ)": t.amount,
        "Ghi chú": t.note || "",
      }));

      const ws = XLSX.utils.json_to_sheet(excelRows);
      ws["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 30 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Giao dịch");
      XLSX.writeFile(wb, `Bao_cao_thang_${currentMonth + 1}_${currentYear}.xlsx`);
    } catch {
      alert("Xuất excel thất bại!");
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!data) return <Empty text="Không tải được dữ liệu báo cáo." />;

  const pieData = data.categoryBreakdown || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Visual Report */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#111111]">Biểu đồ phân bổ chi tiêu</h4>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A] text-white text-xs font-bold rounded-lg hover:bg-[#14803d] shadow-sm transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {exporting ? "Đang xuất..." : "Xuất File Excel"}
          </button>
        </div>

        {pieData.length === 0 ? (
          <div className="h-[200px] border border-dashed border-[#E4E4E2] rounded-xl flex items-center justify-center text-xs text-[#787774]">
            Chưa có số liệu chi tiêu
          </div>
        ) : (
          <div className="h-[210px] w-full bg-[#F7F6F3] rounded-xl p-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2}
                >
                  {pieData.map((_: any, idx: number) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(v: number) => fmt(v)} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl">
          <p className="text-xs text-[#16A34A] font-bold">Gợi ý tiết kiệm tuần này</p>
          <p className="text-2xl font-bold text-[#16A34A] mt-1">{fmt(data.weeklySummary?.[0]?.suggestedSavings || 0)}</p>
        </div>
      </div>

      {/* Dynamic Summary Rows */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-[#111111]">Lịch sử Báo cáo</h4>
        <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
          {data.weeklySummary?.slice(0, 4).map((w: any) => (
            <div key={w.label} className="p-3.5 bg-white border border-[#E4E4E2] rounded-xl space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#111111]">{w.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#F7F6F3] rounded text-[#787774]">Tuần</span>
              </div>
              <div className="grid grid-cols-2 text-xs gap-2 pt-1 border-t border-[#F0F0EE]">
                <p className="text-[#16A34A]">Thu: <strong>{fmt(w.income)}</strong></p>
                <p className="text-[#9F2F2D]">Chi: <strong>{fmt(w.expense)}</strong></p>
                <p className="col-span-2 text-xs font-semibold text-[#111111]">Số dư: {fmt(w.balance)}</p>
              </div>
            </div>
          ))}

          {data.monthlySummary?.slice(0, 3).map((m: any) => (
            <div key={m.label} className="p-3.5 bg-[#F7F6F3] border border-[#E4E4E2] rounded-xl space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#111111]">{m.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-white rounded text-[#16A34A] font-bold">Tháng</span>
              </div>
              <div className="grid grid-cols-3 text-xs gap-1 pt-1 border-t border-[#E4E4E2]">
                <div>
                  <span className="text-[9px] text-[#787774]">Thu</span>
                  <p className="font-bold text-[#16A34A]">{fmt(m.income)}</p>
                </div>
                <div>
                  <span className="text-[9px] text-[#787774]">Chi</span>
                  <p className="font-bold text-[#9F2F2D]">{fmt(m.expense)}</p>
                </div>
                <div>
                  <span className="text-[9px] text-[#787774]">Số dư</span>
                  <p className={`font-bold ${m.balance >= 0 ? "text-[#111111]" : "text-[#9F2F2D]"}`}>{fmt(m.balance)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   3. BUDGETS CONFIG PANEL (With Direct Forms)
───────────────────────────────────────── */
function BudgetsPanel({ initialCategories, initialBudgets, onMutated }: {
  initialCategories: Category[];
  initialBudgets: any[];
  onMutated?: () => void;
}) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Initialize from preloaded data directly — no loading state needed
  const expenseCatsInit = initialCategories.filter((c: Category) => c.type === "expense");
  const limitsInit: Record<string, string> = {};
  expenseCatsInit.forEach((c: Category) => {
    const matched = initialBudgets.find((b: any) => b.categoryId === c.id);
    limitsInit[c.id] = matched ? matched.limit.toString() : "0";
  });

  const [categories, setCategories] = useState<Category[]>(expenseCatsInit);
  const [limits, setLimits] = useState<Record<string, string>>(limitsInit);
  const [loading, setLoading] = useState(expenseCatsInit.length === 0);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const loadData = async () => {
    try {
      const [resCat, resBud] = await Promise.all([
        fetch("/api/categories"),
        fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`),
      ]);
      if (resCat.ok && resBud.ok) {
        const catData = await resCat.json();
        const budData = await resBud.json();
        const expenseCats = catData.filter((c: Category) => c.type === "expense");
        setCategories(expenseCats);
        const initialLimits: Record<string, string> = {};
        expenseCats.forEach((c: Category) => {
          const matched = budData.find((b: any) => b.categoryId === c.id);
          initialLimits[c.id] = matched ? matched.limit.toString() : "0";
        });
        setLimits(initialLimits);
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    // Only fetch if we didn't get preloaded data
    if (expenseCatsInit.length === 0) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrMsg("");
    try {
      const promises = Object.entries(limits).map(([categoryId, val]) => {
        const limitVal = Number(val);
        if (isNaN(limitVal) || limitVal < 0) throw new Error("Giá trị phải lớn hơn hoặc bằng 0");
        return fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId, month: currentMonth, year: currentYear, limit: limitVal }),
        });
      });
      await Promise.all(promises);
      setSuccessMsg("Lưu hạn mức ngân sách thành công!");
      setTimeout(() => setSuccessMsg(""), 3000);
      onMutated?.();
    } catch (err: any) {
      setErrMsg(err.message || "Không thể lưu hạn mức.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-xl mx-auto">
      <div className="bg-[#F7F6F3] p-4 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-xs text-[#787774] font-semibold">Tháng hiện tại</p>
          <p className="text-sm font-bold text-[#111111]">Hạn mức Tháng {currentMonth} / {currentYear}</p>
        </div>
        <button
          type="submit" disabled={saving}
          className="px-5 py-2.5 bg-[#16A34A] text-white text-xs font-bold rounded-xl hover:bg-[#14803d] shadow-[0_2px_8px_rgba(22,163,74,0.3)] transition-all"
        >
          {saving ? "Đang lưu..." : "Lưu hạn mức"}
        </button>
      </div>

      {successMsg && <p className="text-xs text-[#16A34A] font-semibold bg-[#F0FDF4] p-3 rounded-lg border border-[#BBF7D0]">{successMsg}</p>}
      {errMsg && <p className="text-xs text-[#9F2F2D] font-semibold bg-[#FEF2F2] p-3 rounded-lg border border-[#FCA5A5]">{errMsg}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
        {categories.map(c => (
          <div key={c.id} className="p-4 bg-white border border-[#E4E4E2] rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{c.icon === "utensils" ? "🍽️" : c.icon === "fuel" ? "⛽" : c.icon === "home" ? "🏠" : "🛍️"}</span>
              <p className="text-xs font-bold text-[#111111]">{c.name}</p>
            </div>
            <div className="relative">
              <input
                type="number"
                value={limits[c.id] || "0"}
                onChange={e => {
                  const val = e.target.value;
                  setLimits(prev => ({ ...prev, [c.id]: val }));
                }}
                className="w-32 px-3 py-1.5 border border-[#E4E4E2] rounded-lg text-right text-xs font-bold text-[#111111] focus:outline-none focus:border-[#16A34A]"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#BABABA] pointer-events-none">đ</span>
            </div>
          </div>
        ))}
      </div>
    </form>
  );
}

/* ─────────────────────────────────────────
   4. GOALS SAVINGS PANEL (Create / Contribute / Edit / Delete)
───────────────────────────────────────── */
function GoalsPanel({ initialGoals, onMutated }: {
  initialGoals: Goal[];
  onMutated?: () => void;
}) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [loading, setLoading] = useState(initialGoals.length === 0);

  // Form states
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  // Edit Goal / Contribution state
  const [contributeAmount, setContributeAmount] = useState<Record<string, string>>({});
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const fetchGoals = () => {
    fetch("/api/goals")
      .then(r => r.json())
      .then(d => setGoals(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Only fetch if we didn't receive preloaded goals
    if (initialGoals.length === 0) fetchGoals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr("");
    const targetVal = Number(targetAmount);
    if (!title) { setFormErr("Nhập tiêu đề mục tiêu"); return; }
    if (isNaN(targetVal) || targetVal <= 0) { setFormErr("Số tiền mục tiêu phải lớn hơn 0"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, targetAmount: targetVal, deadline: deadline || null }),
      });
      if (res.ok) {
        setTitle(""); setTargetAmount(""); setDeadline("");
        fetchGoals();
        onMutated?.();
      } else {
        setFormErr("Lỗi tạo mục tiêu.");
      }
    } catch {
      setFormErr("Lỗi kết nối.");
    } finally { setSaving(false); }
  };

  const handleDeposit = async (g: Goal) => {
    const depVal = Number(contributeAmount[g.id] || "0");
    if (isNaN(depVal) || depVal <= 0) {
      alert("Nhập số tiền hợp lệ!");
      return;
    }
    try {
      const res = await fetch(`/api/goals/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount: g.currentAmount + depVal }),
      });
      if (res.ok) {
        setContributeAmount(prev => ({ ...prev, [g.id]: "" }));
        fetchGoals();
        onMutated?.();
      }
    } catch {
      alert("Lỗi khi nộp tiền tiết kiệm.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn muốn xóa mục tiêu này?")) return;
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (res.ok) { fetchGoals(); onMutated?.(); }
    } catch {}
  };

  if (loading) return <Spinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Create Section */}
      <form onSubmit={handleCreate} className="space-y-4 bg-[#F7F6F3] p-5 rounded-2xl h-fit">
        <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wide">Tạo Mục tiêu mới</h4>
        <div>
          <label className="text-[10px] text-[#787774] font-bold">Tiêu đề</label>
          <input
            type="text" placeholder="Mua xe, Mua điện thoại..." value={title} onChange={e => setTitle(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-[#E4E4E2] bg-white rounded-lg text-xs font-semibold focus:outline-none focus:border-[#16A34A]"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#787774] font-bold">Số tiền mong muốn</label>
          <input
            type="number" placeholder="5000000" value={targetAmount} onChange={e => setTargetAmount(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-[#E4E4E2] bg-white rounded-lg text-xs font-bold focus:outline-none focus:border-[#16A34A]"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#787774] font-bold">Hạn chót</label>
          <input
            type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-[#E4E4E2] bg-white rounded-lg text-xs focus:outline-none"
          />
        </div>

        {formErr && <p className="text-xs text-[#9F2F2D]">{formErr}</p>}

        <button
          type="submit" disabled={saving}
          className="w-full py-2.5 bg-[#16A34A] text-white text-xs font-bold rounded-xl hover:bg-[#14803d] shadow-sm transition-all"
        >
          {saving ? "Đang tạo..." : "Thêm mục tiêu"}
        </button>
      </form>

      {/* List goals with progress & contribute inputs */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-[#111111]">Mục tiêu tiết kiệm của bạn</h4>
        {!goals.length ? (
          <Empty text="Chưa có mục tiêu tiết kiệm." />
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {goals.map(g => {
              const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
              return (
                <div key={g.id} className="p-4 bg-white border border-[#E4E4E2] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#111111]">{g.title}</p>
                      {g.deadline && <p className="text-[9px] text-[#BABABA] mt-0.5">Hạn chót: {fmtDate(g.deadline)}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingGoal(g)} className="text-xs text-[#787774] hover:text-[#111111]">Sửa</button>
                      <button onClick={() => handleDelete(g.id)} className="text-xs text-[#BABABA] hover:text-[#9F2F2D]">Xóa</button>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-[#F0F0EE] overflow-hidden">
                      <div className="h-full rounded-full bg-[#16A34A] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-[#787774] font-semibold">
                      <span>Hiện có: {fmt(g.currentAmount)}</span>
                      <span>Mục tiêu: {fmt(g.targetAmount)} ({Math.round(pct)}%)</span>
                    </div>
                  </div>
                  {/* Contribute money input */}
                  <div className="flex gap-2">
                    <input
                      type="number" placeholder="Cộng thêm..."
                      value={contributeAmount[g.id] || ""}
                      onChange={e => setContributeAmount(prev => ({ ...prev, [g.id]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 border border-[#E4E4E2] rounded-lg text-xs focus:outline-none"
                    />
                    <button
                      onClick={() => handleDeposit(g)}
                      className="px-3 py-1.5 bg-[#16A34A] text-white text-xs font-bold rounded-lg hover:bg-[#14803d]"
                    >
                      Lưu tích lũy
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSuccess={() => { setEditingGoal(null); fetchGoals(); }}
        />
      )}
    </div>
  );
}

interface EditGoalProps {
  goal: Goal; onClose: () => void; onSuccess: () => void;
}
function EditGoalModal({ goal, onClose, onSuccess }: EditGoalProps) {
  const [title, setTitle] = useState(goal.title);
  const [target, setTarget] = useState(goal.targetAmount.toString());
  const [current, setCurrent] = useState(goal.currentAmount.toString());
  const [deadline, setDeadline] = useState(goal.deadline ? goal.deadline.split("T")[0] : "");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const tVal = Number(target);
    const cVal = Number(current);
    if (!title) { setErr("Nhập tiêu đề"); return; }
    if (isNaN(tVal) || tVal <= 0) { setErr("Mục tiêu phải lớn hơn 0"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, targetAmount: tVal, currentAmount: cVal, deadline: deadline || null }),
      });
      if (res.ok) onSuccess();
      else setErr("Có lỗi xảy ra");
    } catch { setErr("Lỗi kết nối"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4">
        <h3 className="text-base font-bold text-[#111111]">Chỉnh sửa mục tiêu</h3>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-[#787774] uppercase">Tiêu đề</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#787774] uppercase">Mục tiêu</label>
              <input type="number" value={target} onChange={e => setTarget(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#787774] uppercase">Hiện có</label>
              <input type="number" value={current} onChange={e => setCurrent(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-xs" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#787774] uppercase">Hạn chót</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-xs" />
          </div>

          {err && <p className="text-xs text-[#9F2F2D]">{err}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-xl text-sm font-semibold">Hủy</button>
            <button type="submit" disabled={submitting} className="flex-1 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-semibold">{submitting ? "Đang lưu..." : "Cập nhật"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   5. SETTINGS PANEL (Tỉ lệ tiết kiệm)
───────────────────────────────────────── */
function SettingsPanel() {
  const [rate, setRate] = useState<number>(25);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Biometrics states
  const [bioEnabled, setBioEnabled] = useState(false);
  const [isBioSupported, setIsBioSupported] = useState(false);
  const [bioRegistering, setBioRegistering] = useState(false);

  useEffect(() => {
    fetch("/api/user/settings")
      .then(r => r.json())
      .then(d => setRate(d.savingsRate ?? 25))
      .finally(() => setLoading(false));

    // Check if device supports WebAuthn and if it is enabled locally
    const checkBio = async () => {
      const enabled = localStorage.getItem("bio_auth_enabled") === "true";
      setBioEnabled(enabled);
      const supported = 
        typeof window !== "undefined" && 
        window.PublicKeyCredential && 
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setIsBioSupported(!!supported);
    };
    checkBio();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savingsRate: rate }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const handleToggleBio = async () => {
    if (!bioEnabled) {
      setBioRegistering(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          alert("Vui lòng đăng nhập lại để thực hiện.");
          return;
        }

        // Prompt biometric device enrollment
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "DI Veo", id: window.location.hostname },
            user: {
              id: new TextEncoder().encode(user.id),
              name: user.email!,
              displayName: user.email!,
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            authenticatorSelection: { 
              authenticatorAttachment: "platform", 
              userVerification: "preferred",
              residentKey: "required",
              requireResidentKey: true
            },
            timeout: 60000,
          }
        });

        // Save session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          localStorage.setItem("bio_refresh_token", sessionData.session.refresh_token);
        }
        localStorage.setItem("bio_auth_enabled", "true");
        localStorage.setItem("bio_email", user.email!);
        setBioEnabled(true);
      } catch (err) {
        console.error("Đăng ký vân tay thất bại:", err);
        alert("Thiết bị này không hỗ trợ hoặc bạn đã từ chối xác thực.");
      } finally {
        setBioRegistering(false);
      }
    } else {
      // Disable biometrics
      localStorage.removeItem("bio_auth_enabled");
      localStorage.removeItem("bio_refresh_token");
      localStorage.removeItem("bio_email");
      setBioEnabled(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Biometrics Config card */}
      {isBioSupported && (
        <div className="p-5 bg-white border border-[#E4E4E2] dark:border-slate-700 dark:bg-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Đăng nhập sinh trắc học</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kích hoạt Vân tay / FaceID để mở khóa nhanh trên thiết bị này.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleBio}
              disabled={bioRegistering}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none flex items-center ${
                bioEnabled ? "bg-[#16A34A] justify-end" : "bg-[#E4E4E2] dark:bg-slate-700 justify-start"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md block" />
            </button>
          </div>
        </div>
      )}

      {/* Savings Rate card */}
      <div className="p-5 bg-white border border-[#E4E4E2] rounded-xl space-y-4">
        <div>
          <p className="text-sm font-bold text-[#111111]">Tỉ lệ tiết kiệm đề xuất</p>
          <p className="text-xs text-[#787774] mt-0.5">% số dư dương mỗi tuần được đề xuất để tiết kiệm</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="range" min={0} max={100} step={5}
            value={rate}
            onChange={e => setRate(Number(e.target.value))}
            className="flex-1 accent-[#16A34A] h-2"
          />
          <span className="text-2xl font-bold text-[#16A34A] w-16 text-right">{rate}%</span>
        </div>
        <div className="flex gap-2 pt-1">
          {[10, 20, 25, 30, 50].map(v => (
            <button
              key={v}
              onClick={() => setRate(v)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                rate === v ? "border-[#16A34A] bg-[#F0FDF4] text-[#16A34A]" : "border-[#E4E4E2] text-[#787774] hover:border-[#111111]"
              }`}
            >
              {v}%
            </button>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
            saved
              ? "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]"
              : "bg-[#16A34A] text-white hover:bg-[#14803d] shadow-[0_4px_14px_rgba(22,163,74,0.3)]"
          }`}
        >
          {saved ? "✓ Đã lưu thành công" : saving ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN NAVDRAWER
───────────────────────────────────────── */
export default function NavDrawer({ section: initialSection, onClose, preloadedData, onDataMutated }: Props) {
  const [activeSection, setActiveSection] = useState<DrawerSection>(initialSection ?? "transactions");

  useEffect(() => {
    if (initialSection) setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  if (!initialSection) return null;

  const renderContent = () => {
    const cats = preloadedData?.categories ?? [];
    const txns = preloadedData?.transactions ?? [];
    const buds = preloadedData?.budgets ?? [];
    const gols = preloadedData?.goals ?? [];
    switch (activeSection) {
      case "transactions": return <TransactionsPanel initialCategories={cats} initialTransactions={txns} onMutated={onDataMutated} />;
      case "summary":      return <SummaryPanel />;
      case "budgets":      return <BudgetsPanel initialCategories={cats} initialBudgets={buds} onMutated={onDataMutated} />;
      case "goals":        return <GoalsPanel initialGoals={gols} onMutated={onDataMutated} />;
      case "settings":     return <SettingsPanel />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Bottom sheet — full width, 92vh, max-w-4xl */}
      <div
        className="relative w-full max-w-4xl bg-white rounded-t-2xl shadow-2xl animate-slide-up flex flex-col"
        style={{ height: "92vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-0 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#E4E4E2]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
          <h2 className="text-base font-bold text-[#111111]">{SECTION_LABELS[activeSection]}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F7F6F3] flex items-center justify-center hover:bg-[#EAEAEA] transition-colors">
            <svg className="w-4 h-4 text-[#787774]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex gap-1.5 px-5 pb-3 shrink-0 overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.section}
              onClick={() => setActiveSection(t.section)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeSection === t.section
                  ? "bg-[#16A34A] text-white shadow-sm"
                  : "bg-[#F7F6F3] text-[#787774] hover:text-[#111111] hover:bg-[#EAEAEA]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="h-px bg-[#F0F0EE] mx-5 shrink-0" />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-8 min-h-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
