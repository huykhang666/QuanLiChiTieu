export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { calcSuggestedSavings } from "@/lib/savings";

// GET /api/summary?period=week|month
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Vui lòng đăng nhập." }, { status: 401 });
    }

    const period = req.nextUrl.searchParams.get("period") ?? "week";
    const now = new Date();

    // 1. Hôm nay
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);

    // 2. Tuần này
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day + (day === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // 3. Tháng này
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // 4. Chart 7 ngày gần nhất (nếu period !== "month")
    const start7 = new Date(now); start7.setDate(now.getDate() - 6); start7.setHours(0, 0, 0, 0);

    // Tìm khoảng ngày bao quát tất cả để truy vấn đúng 1 lần (Single Query)
    const globalStart = new Date(Math.min(
      startOfToday.getTime(),
      startOfWeek.getTime(),
      startOfMonth.getTime(),
      start7.getTime()
    ));
    const globalEnd = new Date(Math.max(
      endOfToday.getTime(),
      endOfWeek.getTime(),
      endOfMonth.getTime()
    ));

    // Thực hiện tất cả các truy vấn DB đồng thời (Parallel Batch)
    const [transactions, dbUser, budgets] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: user.id, date: { gte: globalStart, lte: globalEnd } },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
      }),
      prisma.budget.findMany({
        where: { userId: user.id, month: currentMonth, year: currentYear },
        include: { category: true },
      }),
    ]);

    // Phân loại và tính toán dữ liệu trong bộ nhớ (In-memory filter - cực kì nhanh)
    // Hôm nay
    const todayTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startOfToday && d <= endOfToday;
    });
    let todayIncome = 0, todayExpense = 0;
    for (const t of todayTx) { if (t.type === "income") todayIncome += t.amount; else todayExpense += t.amount; }

    // Tuần này
    const weekTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startOfWeek && d <= endOfWeek;
    });
    let weekIncome = 0, weekExpense = 0;
    for (const t of weekTx) { if (t.type === "income") weekIncome += t.amount; else weekExpense += t.amount; }

    // Tháng này
    const monthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startOfMonth && d <= endOfMonth;
    });
    let monthIncome = 0, monthExpense = 0;
    for (const t of monthTx) { if (t.type === "income") monthIncome += t.amount; else monthExpense += t.amount; }

    // Savings rate
    const savingsRate = dbUser?.savingsRate ?? 25;
    const suggestedSavings = calcSuggestedSavings(weekIncome, weekExpense, savingsRate / 100);

    // Chart data
    let chartData: { date: string; income: number; expense: number }[] = [];

    if (period === "month") {
      const weeks: { [key: string]: { income: number; expense: number } } = {};
      const daysInMonth = endOfMonth.getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const weekNum = Math.ceil(i / 7);
        const key = `T${weekNum}`;
        if (!weeks[key]) weeks[key] = { income: 0, expense: 0 };
      }
      for (const t of monthTx) {
        const d = new Date(t.date);
        const weekNum = Math.ceil(d.getDate() / 7);
        const key = `T${weekNum}`;
        if (!weeks[key]) weeks[key] = { income: 0, expense: 0 };
        if (t.type === "income") weeks[key].income += t.amount;
        else weeks[key].expense += t.amount;
      }
      chartData = Object.entries(weeks).map(([date, vals]) => ({ date, ...vals }));
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        chartData.push({
          date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
          income: 0,
          expense: 0,
        });
      }
      const last7Tx = transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= start7 && d <= endOfToday;
      });
      for (const t of last7Tx) {
        const tDate = new Date(t.date);
        const dateKey = `${String(tDate.getDate()).padStart(2, "0")}/${String(tDate.getMonth() + 1).padStart(2, "0")}`;
        const obj = chartData.find((cd) => cd.date === dateKey);
        if (obj) { if (t.type === "income") obj.income += t.amount; else obj.expense += t.amount; }
      }
    }

    // Budget warnings
    const expByCategory: { [key: string]: number } = {};
    for (const t of monthTx) {
      if (t.type === "expense") expByCategory[t.categoryId] = (expByCategory[t.categoryId] || 0) + t.amount;
    }
    const budgetWarnings = [];
    for (const b of budgets) {
      const spent = expByCategory[b.categoryId] || 0;
      const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
      if (pct >= 80) budgetWarnings.push({ categoryId: b.categoryId, categoryName: b.category.name, limit: b.limit, spent, percentage: Math.round(pct) });
    }

    return NextResponse.json({
      today: { income: todayIncome, expense: todayExpense },
      week: { income: weekIncome, expense: weekExpense },
      month: { income: monthIncome, expense: monthExpense },
      suggestedSavings,
      chartData,
      budgetWarnings,
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/summary:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ nội bộ." }, { status: 500 });
  }
}

