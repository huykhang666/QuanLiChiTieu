export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/user/settings - Lấy cài đặt cá nhân của user
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

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    return NextResponse.json({
      savingsRate: dbUser?.savingsRate ?? 25,
      displayName: dbUser?.displayName || "",
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/user/settings:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}

// PATCH /api/user/settings - Cập nhật cài đặt cá nhân (tỷ lệ tiết kiệm, tên hiển thị)
export async function PATCH(req: NextRequest) {
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
    const { savingsRate, displayName } = body;

    const updateData: any = {};

    if (savingsRate !== undefined) {
      const rate = Number(savingsRate);
      if (isNaN(rate) || rate < 0 || rate > 100 || !Number.isInteger(rate)) {
        return NextResponse.json(
          { error: "Tỷ lệ tiết kiệm phải là số nguyên từ 0 đến 100." },
          { status: 400 }
        );
      }
      updateData.savingsRate = rate;
    }

    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({
      savingsRate: updatedUser.savingsRate,
      displayName: updatedUser.displayName,
    });
  } catch (error: any) {
    console.error("Lỗi PATCH /api/user/settings:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
