"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  isDefault: boolean;
}

// Icon list options for custom category creation
const ICON_OPTIONS = [
  { value: "wallet", label: "Ví tiền (wallet)" },
  { value: "shopping-bag", label: "Túi mua sắm (shopping-bag)" },
  { value: "utensils", label: "Ăn uống (utensils)" },
  { value: "fuel", label: "Xăng dầu (fuel)" },
  { value: "home", label: "Nhà cửa (home)" },
  { value: "piggy-bank", label: "Heo đất (piggy-bank)" },
];

export default function SettingsPage() {
  const [savingsRate, setSavingsRate] = useState("25");
  const [displayName, setDisplayName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states tạo danh mục
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState("expense");
  const [newCatIcon, setNewCatIcon] = useState("wallet");

  // Status messages
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [catSuccess, setCatSuccess] = useState<string | null>(null);
  const [catError, setCatError] = useState<string | null>(null);

  const [savingSettings, setSavingSettings] = useState(false);
  const [creatingCat, setCreatingCat] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchSettingsAndCategories = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.push("/login");
          return;
        }

        const [resSettings, resCat] = await Promise.all([
          fetch("/api/user/settings"),
          fetch("/api/categories"),
        ]);

        if (!resSettings.ok || !resCat.ok) {
          throw new Error("Không thể tải cấu hình cài đặt.");
        }

        const settingsData = await resSettings.json();
        const catData = await resCat.json();

        setSavingsRate(settingsData.savingsRate.toString());
        setDisplayName(settingsData.displayName || "");
        setCategories(catData);
      } catch (err: any) {
        setSettingsError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettingsAndCategories();
  }, [router, supabase.auth]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);
    setSavingSettings(true);

    try {
      const rateNum = Number(savingsRate);
      if (isNaN(rateNum) || rateNum < 0 || rateNum > 100 || !Number.isInteger(rateNum)) {
        throw new Error("Tỷ lệ tiết kiệm phải là số nguyên từ 0 đến 100.");
      }

      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          savingsRate: rateNum,
          displayName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gặp lỗi khi lưu cài đặt.");
      }

      setSettingsSuccess("Đã cập nhật cấu hình cài đặt hệ thống thành công.");
      router.refresh();
    } catch (err: any) {
      setSettingsError(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    setCatSuccess(null);
    setCreatingCat(true);

    try {
      if (!newCatName.trim()) {
        throw new Error("Vui lòng nhập tên danh mục.");
      }

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          type: newCatType,
          icon: newCatIcon,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gặp lỗi khi tạo danh mục.");
      }

      const createdCat = await res.json();
      setCategories((prev) => [...prev, createdCat]);
      setCatSuccess(`Đã tạo danh mục tự chọn "${createdCat.name}" thành công.`);
      setNewCatName("");
    } catch (err: any) {
      setCatError(err.message);
    } finally {
      setCreatingCat(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFBFA]">
        <div className="text-sm font-mono text-[#787774]">Đang tải cài đặt hệ thống...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBFBFA] py-16 px-6 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <header className="border-b border-[#EAEAEA] pb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-mono text-[#787774] hover:text-[#111111] transition-colors mb-2"
          >
            ← Bảng điều khiển
          </Link>
          <h1 className="font-serif text-4xl font-normal tracking-tight text-[#111111] italic">
            Cài đặt hệ thống
          </h1>
          <p className="text-xs text-[#787774] mt-1 font-mono">
            Tùy chỉnh tỷ lệ tích lũy và quản lý danh mục thu chi
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Cột trái: Cài đặt tỷ lệ tiết kiệm */}
          <div className="space-y-6">
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-normal text-[#111111] italic">
                  Cài đặt chung
                </h2>
                <p className="text-xs text-[#787774] mt-1">
                  Cấu hình hiển thị và tỷ lệ tích lũy của bạn
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="displayName" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                    Tên hiển thị
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    placeholder="Chưa thiết lập"
                    className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="savingsRate" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                    Tỷ lệ tiết kiệm đề xuất (%)
                  </label>
                  <div className="relative">
                    <input
                      id="savingsRate"
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] font-mono text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                      value={savingsRate}
                      onChange={(e) => setSavingsRate(e.target.value)}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[#787774] font-mono pointer-events-none">
                      %
                    </span>
                  </div>
                  <p className="text-[10px] text-[#787774] leading-relaxed">
                    Tỷ lệ này được sử dụng để tự động tính toán mức trích lập tiết kiệm đề xuất dựa trên số dư tuần và tháng.
                  </p>
                </div>

                {settingsError && (
                  <div className="p-3 bg-[#FDEBEC] border border-[#FAD1D3] rounded-md text-xs text-[#9F2F2D]">
                    {settingsError}
                  </div>
                )}

                {settingsSuccess && (
                  <div className="p-3 bg-[#EDF3EC] border border-[#D1E5CF] rounded-md text-xs text-[#346538]">
                    {settingsSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full py-2.5 bg-[#111111] text-white text-xs font-medium rounded-md hover:bg-[#333333] transition-colors focus:outline-none disabled:opacity-50 active:scale-[0.98] transform duration-150 font-sans tracking-wide uppercase"
                >
                  {savingSettings ? "Đang lưu..." : "Lưu cài đặt"}
                </button>
              </form>
            </div>
          </div>

          {/* Cột phải: Quản lý danh mục tự chọn */}
          <div className="space-y-6">
            {/* Form tạo danh mục */}
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-normal text-[#111111] italic">
                  Danh mục tự chọn
                </h2>
                <p className="text-xs text-[#787774] mt-1">
                  Tạo thêm danh mục thu nhập hoặc chi tiêu riêng
                </p>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="catName" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                    Tên danh mục
                  </label>
                  <input
                    id="catName"
                    type="text"
                    required
                    placeholder="Ví dụ: Học tập, Sách vở..."
                    className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="catType" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                      Loại danh mục
                    </label>
                    <select
                      id="catType"
                      className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-xs text-[#111111] focus:outline-none"
                      value={newCatType}
                      onChange={(e) => setNewCatType(e.target.value)}
                    >
                      <option value="expense">Chi tiêu (-)</option>
                      <option value="income">Thu nhập (+)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="catIcon" className="text-[10px] font-medium text-[#787774] tracking-wide uppercase">
                      Biểu tượng (Icon)
                    </label>
                    <select
                      id="catIcon"
                      className="w-full px-3 py-2 border border-[#EAEAEA] rounded-md bg-[#FBFBFA] text-xs text-[#111111] focus:outline-none"
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                    >
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {catError && (
                  <div className="p-3 bg-[#FDEBEC] border border-[#FAD1D3] rounded-md text-xs text-[#9F2F2D]">
                    {catError}
                  </div>
                )}

                {catSuccess && (
                  <div className="p-3 bg-[#EDF3EC] border border-[#D1E5CF] rounded-md text-xs text-[#346538]">
                    {catSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={creatingCat}
                  className="w-full py-2.5 bg-[#111111] text-white text-xs font-medium rounded-md hover:bg-[#333333] transition-colors focus:outline-none disabled:opacity-50 active:scale-[0.98] transform duration-150 font-sans tracking-wide uppercase"
                >
                  {creatingCat ? "Đang tạo..." : "Thêm danh mục"}
                </button>
              </form>
            </div>

            {/* Danh sách danh mục hiện có */}
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 sm:p-8 space-y-4">
              <span className="text-[10px] font-mono font-medium text-[#787774] tracking-wider uppercase block">
                Danh sách danh mục hiện tại
              </span>
              <div className="max-h-60 overflow-y-auto divide-y divide-[#EAEAEA]">
                {categories.map((cat) => (
                  <div key={cat.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-[#111111] font-medium">{cat.name}</span>
                      <span className="text-[9px] font-mono text-[#787774] uppercase">
                        ({cat.type === "income" ? "Thu nhập" : "Chi tiêu"})
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        cat.isDefault
                          ? "bg-[#F7F6F3] text-[#787774]"
                          : "bg-[#EDF3EC] text-[#346538] border border-[#D1E5CF]"
                      }`}
                    >
                      {cat.isDefault ? "Mặc định" : "Tự tạo"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
