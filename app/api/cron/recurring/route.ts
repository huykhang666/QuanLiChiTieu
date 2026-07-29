import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cron/recurring - Chạy Cron Job xử lý chi tiêu định kỳ hàng tháng
export async function GET(req: NextRequest) {
  // Xác thực nếu chạy ở production (Vercel Cron Job gửi header x-vercel-cron)
  if (
    process.env.NODE_ENV === "production" &&
    req.headers.get("x-vercel-cron") !== "true"
  ) {
    return NextResponse.json(
      { error: "Unauthorized. Yêu cầu chạy qua Vercel Cron Job." },
      { status: 401 }
    );
  }

  try {
    const today = new Date();
    // Lấy tất cả các giao dịch được thiết lập lặp lại
    const recurringTransactions = await prisma.transaction.findMany({
      where: { isRecurring: true },
    });

    let createdCount = 0;

    for (const t of recurringTransactions) {
      // Ngày của tháng tiếp theo
      let nextDate = new Date(t.date);
      nextDate.setMonth(nextDate.getMonth() + 1);

      // Chạy vòng lặp tháng-tới-tháng cho đến hôm nay (hỗ trợ tự bù giao dịch nếu Cron bị trễ)
      while (nextDate <= today) {
        const year = nextDate.getFullYear();
        const month = nextDate.getMonth();

        // Kiểm tra xem giao dịch tháng đó đã được tạo ra chưa
        const existingChild = await prisma.transaction.findFirst({
          where: {
            userId: t.userId,
            categoryId: t.categoryId,
            amount: t.amount,
            type: t.type,
            isRecurring: true,
            date: {
              gte: new Date(year, month, 1),
              lte: new Date(year, month, 31, 23, 59, 59, 999),
            },
          },
        });

        if (!existingChild) {
          // Sao chép giao dịch sang ngày tương ứng ở tháng tiếp theo
          await prisma.transaction.create({
            data: {
              userId: t.userId,
              categoryId: t.categoryId,
              amount: t.amount,
              type: t.type,
              note: t.note ? `${t.note} (Định kỳ)` : "Giao dịch định kỳ",
              date: new Date(nextDate),
              isRecurring: true,
            },
          });
          createdCount++;
        }

        // Tăng thêm 1 tháng cho vòng lặp tiếp theo
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã quét và xử lý thành công. Tạo thêm ${createdCount} giao dịch định kỳ mới.`,
    });
  } catch (error: any) {
    console.error("Lỗi Cron Job chi tiêu định kỳ:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
