export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// PATCH /api/transactions/[id] - Cập nhật giao dịch
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
    
    // Kiểm tra sự tồn tại và quyền sở hữu giao dịch
    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Giao dịch không tồn tại." },
        { status: 404 }
      );
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. Bạn không có quyền chỉnh sửa giao dịch này." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount: body.amount,
        type: body.type,
        categoryId: body.categoryId,
        note: body.note,
        date: body.date ? new Date(body.date) : undefined,
        isRecurring: body.isRecurring ?? undefined,
      },
    });

    return NextResponse.json(updatedTransaction);
  } catch (error: any) {
    console.error("Lỗi khi cập nhật giao dịch:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[id] - Xóa giao dịch
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

    // Kiểm tra sự tồn tại và quyền sở hữu giao dịch
    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Giao dịch không tồn tại." },
        { status: 404 }
      );
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. Bạn không có quyền xóa giao dịch này." },
        { status: 403 }
      );
    }

    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa giao dịch thành công." });
  } catch (error: any) {
    console.error("Lỗi khi xóa giao dịch:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
