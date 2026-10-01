export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// POST /api/wallet/adjust - Điều chỉnh số tiền hiện có của ví
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
    const { targetBalance, note } = body;

    if (targetBalance === undefined || typeof targetBalance !== "number" || isNaN(targetBalance)) {
      return NextResponse.json(
        { error: "Vui lòng nhập số tiền hợp lệ." },
        { status: 400 }
      );
    }

    // 1. Tính toán số dư hiện tại từ toàn bộ giao dịch tích lũy
    const [totalIncomeAgg, totalExpenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId: user.id, type: "income" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId: user.id, type: "expense" },
        _sum: { amount: true },
      }),
    ]);

    const currentIncome = totalIncomeAgg._sum.amount ?? 0;
    const currentExpense = totalExpenseAgg._sum.amount ?? 0;
    const currentBalance = currentIncome - currentExpense;

    const diff = targetBalance - currentBalance;

    if (diff === 0) {
      return NextResponse.json({
        success: true,
        message: "Số dư hiện tại đã khớp với số tiền bạn nhập.",
        newBalance: targetBalance,
      });
    }

    if (diff > 0) {
      // Số tiền mới lớn hơn số dư hiện tại -> Tạo giao dịch thu nhập bù vào
      let category = await prisma.category.findFirst({
        where: {
          type: "income",
          OR: [{ userId: user.id }, { isDefault: true }, { userId: null }],
        },
      });

      if (!category) {
        // Tạo nhanh danh mục nếu chưa có
        category = await prisma.category.create({
          data: {
            name: "Thu nhập",
            type: "income",
            icon: "wallet",
            userId: user.id,
            isDefault: false,
          },
        });
      }

      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          categoryId: category.id,
          amount: diff,
          type: "income",
          note: note?.trim() || "Điều chỉnh số dư ví",
          date: new Date(),
        },
        include: { category: true },
      });

      return NextResponse.json({
        success: true,
        message: "Đã cập nhật số tiền hiện có thành công.",
        newBalance: targetBalance,
        diff,
        transaction,
      });
    } else {
      // Số tiền mới nhỏ hơn số dư hiện tại -> Tạo giao dịch chi tiêu điều chỉnh
      const expenseAmount = Math.abs(diff);

      let category = await prisma.category.findFirst({
        where: {
          type: "expense",
          OR: [{ userId: user.id }, { isDefault: true }, { userId: null }],
        },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            name: "Chi tiêu lặt vặt",
            type: "expense",
            icon: "shopping-bag",
            userId: user.id,
            isDefault: false,
          },
        });
      }

      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          categoryId: category.id,
          amount: expenseAmount,
          type: "expense",
          note: note?.trim() || "Điều chỉnh số dư ví",
          date: new Date(),
        },
        include: { category: true },
      });

      return NextResponse.json({
        success: true,
        message: "Đã cập nhật số tiền hiện có thành công.",
        newBalance: targetBalance,
        diff,
        transaction,
      });
    }
  } catch (error: any) {
    console.error("Lỗi POST /api/wallet/adjust:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
