export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * GET /api/preload
 * Fetches all data needed for the NavDrawer in a single request
 * to eliminate multiple round trips when the user opens any drawer section.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Date ranges
    const from30 = new Date(now);
    from30.setDate(now.getDate() - 30);
    from30.setHours(0, 0, 0, 0);

    // Fetch everything in parallel — one DB round-trip window
    const [categories, transactions, budgets, goals] = await Promise.all([
      // Categories: static-ish data
      prisma.category.findMany({
        where: {
          OR: [{ isDefault: true }, { userId: null }, { userId: user.id }],
        },
        orderBy: { name: "asc" },
      }),

      // Last 30 days of transactions (covers drawer Transactions panel)
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: { gte: from30, lte: now },
        },
        orderBy: { date: "desc" },
        include: { category: true },
        take: 200, // cap to avoid huge payloads
      }),

      // Current month budgets
      prisma.budget.findMany({
        where: { userId: user.id, month: currentMonth, year: currentYear },
        include: { category: true },
      }),

      // All savings goals
      prisma.savingsGoal.findMany({
        where: { userId: user.id },
        orderBy: { title: "asc" },
      }),
    ]);

    return NextResponse.json(
      { categories, transactions, budgets, goals },
      {
        headers: {
          // Allow browser to use stale data for 10s while revalidating in background
          "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
        },
      }
    );
  } catch (error: any) {
    console.error("Lỗi GET /api/preload:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
