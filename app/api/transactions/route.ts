import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/transactions?from=&to=&categoryId=
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

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    // Ép buộc lọc theo userId của user đang đăng nhập từ session
    const whereClause: any = {
      userId: user.id,
      categoryId,
    };

    if (from || to) {
      whereClause.date = {};
      if (from) {
        whereClause.date.gte = new Date(from);
      }
      if (to) {
        whereClause.date.lte = new Date(`${to}T23:59:59.999Z`);
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      include: { category: true },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error("Lỗi GET /api/transactions:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}

// POST /api/transactions
export async function POST(req: NextRequest) {
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

    const body = await req.json();

    // Lưu giao dịch ép buộc gán userId là ID của user đang đăng nhập
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: body.categoryId,
        amount: body.amount,
        type: body.type,
        note: body.note,
        date: new Date(body.date),
        isRecurring: body.isRecurring ?? false,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi POST /api/transactions:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
