export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// Helper lấy ngày thứ Hai của tuần chứa date
function getStartOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  // Nếu là Chủ nhật (0) thì trừ 6 ngày, nếu không thì lấy ngày hiện tại trừ (day - 1)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0]; // Định dạng YYYY-MM-DD (Thứ Hai)
}

// GET /api/summary/reports - Thống kê động báo cáo tuần/tháng
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Vui lòng đăng nhập." },
        { status: 401 }
      );
    }

    // Lấy thông tin cài đặt tỷ lệ tiết kiệm
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    const savingsRate = dbUser?.savingsRate ?? 25;
    const rateMultiplier = savingsRate / 100;

    // Lấy toàn bộ giao dịch của user
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    // 1. Phân nhóm theo tuần (Thứ Hai -> Chủ Nhật)
    const weeklyGroups: { [key: string]: { income: number; expense: number } } = {};
    for (const t of transactions) {
      const weekKey = getStartOfWeek(new Date(t.date));
      if (!weeklyGroups[weekKey]) {
        weeklyGroups[weekKey] = { income: 0, expense: 0 };
      }
      if (t.type === "income") {
        weeklyGroups[weekKey].income += t.amount;
      } else {
        weeklyGroups[weekKey].expense += t.amount;
      }
    }

    const weeklySummary = Object.entries(weeklyGroups)
      .map(([weekStart, stats]) => {
        const balance = stats.income - stats.expense;
        // Tiết kiệm đề xuất = savingsRate % số dư dương
        const suggestedSavings = balance <= 0 ? 0 : Math.round(balance * rateMultiplier);

        const startDate = new Date(weekStart);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        const format = (d: Date) =>
          `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

        return {
          label: `${format(startDate)} - ${format(endDate)}`,
          startDate: weekStart,
          income: stats.income,
          expense: stats.expense,
          balance,
          suggestedSavings,
        };
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate)); // Tuần mới nhất xếp trước

    // 2. Phân nhóm theo tháng (YYYY-MM)
    const monthlyGroups: { [key: string]: { income: number; expense: number } } = {};
    for (const t of transactions) {
      const d = new Date(t.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = { income: 0, expense: 0 };
      }
      if (t.type === "income") {
        monthlyGroups[monthKey].income += t.amount;
      } else {
        monthlyGroups[monthKey].expense += t.amount;
      }
    }

    const monthlySummary = Object.entries(monthlyGroups)
      .map(([monthKey, stats]) => {
        const [year, month] = monthKey.split("-");
        return {
          label: `Tháng ${month}/${year}`,
          monthKey,
          income: stats.income,
          expense: stats.expense,
          balance: stats.income - stats.expense,
        };
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey)); // Tháng mới nhất xếp trước

    // 3. Phân tích chi tiêu theo danh mục (Pie Chart) - Chỉ tính loại chi tiêu (expense)
    const categoryGroups: { [key: string]: number } = {};
    for (const t of transactions) {
      if (t.type === "expense" && t.category) {
        const catName = t.category.name;
        categoryGroups[catName] = (categoryGroups[catName] || 0) + t.amount;
      }
    }

    const categoryBreakdown = Object.entries(categoryGroups)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value); // Danh mục chi tiêu nhiều nhất xếp trước

    return NextResponse.json({
      weeklySummary,
      monthlySummary,
      categoryBreakdown,
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/summary/reports:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
