export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/budgets - Lấy ngân sách tháng hiện tại
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
    const now = new Date();
    const month = searchParams.get("month") ? Number(searchParams.get("month")) : now.getMonth() + 1;
    const year = searchParams.get("year") ? Number(searchParams.get("year")) : now.getFullYear();

    const budgets = await prisma.budget.findMany({
      where: {
        userId: user.id,
        month,
        year,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(budgets);
  } catch (error: any) {
    console.error("Lỗi GET /api/budgets:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}

// POST /api/budgets - Thiết lập hoặc cập nhật hạn mức ngân sách
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
    const { categoryId, month, year, limit } = body;

    if (!categoryId || !month || !year || limit === undefined || limit < 0) {
      return NextResponse.json(
        { error: "Dữ liệu đầu vào không hợp lệ." },
        { status: 400 }
      );
    }

    // Tìm xem ngân sách đã tồn tại chưa
    const existing = await prisma.budget.findFirst({
      where: {
        userId: user.id,
        categoryId,
        month,
        year,
      },
    });

    if (existing) {
      // Cập nhật hạn mức mới
      const updated = await prisma.budget.update({
        where: { id: existing.id },
        data: { limit: Number(limit) },
      });
      return NextResponse.json(updated);
    } else {
      // Tạo mới ngân sách
      const created = await prisma.budget.create({
        data: {
          userId: user.id,
          categoryId,
          month: Number(month),
          year: Number(year),
          limit: Number(limit),
        },
      });
      return NextResponse.json(created, { status: 201 });
    }
  } catch (error: any) {
    console.error("Lỗi POST /api/budgets:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
