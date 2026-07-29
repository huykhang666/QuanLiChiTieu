export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/categories - Lấy danh mục mặc định + tự chọn của user
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const whereClause: any = {
      OR: [
        { isDefault: true },
        { userId: null },
      ],
    };

    if (user) {
      whereClause.OR.push({ userId: user.id });
    }

    const categories = await prisma.category.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("Lỗi khi lấy danh mục:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}

// POST /api/categories - Tạo danh mục tự chọn mới cho user
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
    const { name, type, icon } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ tên và loại danh mục." },
        { status: 400 }
      );
    }

    if (type !== "income" && type !== "expense") {
      return NextResponse.json(
        { error: "Loại danh mục không hợp lệ." },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        type,
        icon: icon || "wallet",
        isDefault: false,
        userId: user.id,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi POST /api/categories:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
