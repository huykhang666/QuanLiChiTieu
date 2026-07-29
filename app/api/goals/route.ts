import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/goals - Lấy danh sách mục tiêu tiết kiệm
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

    const goals = await prisma.savingsGoal.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        title: "asc",
      },
    });

    return NextResponse.json(goals);
  } catch (error: any) {
    console.error("Lỗi GET /api/goals:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}

// POST /api/goals - Tạo mục tiêu tiết kiệm mới
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
    const { title, targetAmount, deadline } = body;

    if (!title || targetAmount === undefined || Number(targetAmount) <= 0) {
      return NextResponse.json(
        { error: "Dữ liệu đầu vào không hợp lệ." },
        { status: 400 }
      );
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        userId: user.id,
        title,
        targetAmount: Number(targetAmount),
        currentAmount: 0,
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi POST /api/goals:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
