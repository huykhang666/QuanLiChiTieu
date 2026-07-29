import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// PATCH /api/goals/[id] - Cập nhật mục tiêu tiết kiệm
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const id = params.id;

    // Kiểm tra tồn tại và quyền sở hữu
    const existing = await prisma.savingsGoal.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Mục tiêu tiết kiệm không tồn tại." },
        { status: 404 }
      );
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. Bạn không có quyền thao tác trên mục tiêu này." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, targetAmount, currentAmount, deadline } = body;

    const updatedGoal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        title: title ?? undefined,
        targetAmount: targetAmount !== undefined ? Number(targetAmount) : undefined,
        currentAmount: currentAmount !== undefined ? Number(currentAmount) : undefined,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
      },
    });

    return NextResponse.json(updatedGoal);
  } catch (error: any) {
    console.error("Lỗi PATCH /api/goals/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}

// DELETE /api/goals/[id] - Xóa mục tiêu tiết kiệm
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const id = params.id;

    // Kiểm tra tồn tại và quyền sở hữu
    const existing = await prisma.savingsGoal.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Mục tiêu tiết kiệm không tồn tại." },
        { status: 404 }
      );
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. Bạn không có quyền xóa mục tiêu này." },
        { status: 403 }
      );
    }

    await prisma.savingsGoal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa mục tiêu tiết kiệm thành công." });
  } catch (error: any) {
    console.error("Lỗi DELETE /api/goals/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
