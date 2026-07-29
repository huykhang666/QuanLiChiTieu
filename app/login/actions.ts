"use server";

import { prisma } from "@/lib/prisma";

export async function syncUserInDb(email: string, userId: string, displayName?: string) {
  try {
    // Kiểm tra xem user đã tồn tại trong DB chưa
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      // Nếu chưa, tạo mới user
      await prisma.user.create({
        data: {
          id: userId,
          email: email,
          displayName: displayName || email.split("@")[0],
        },
      });
      return { success: true, message: "Đồng bộ người dùng thành công." };
    }
    
    return { success: true, message: "Người dùng đã tồn tại." };
  } catch (error: any) {
    console.error("Lỗi khi đồng bộ user:", error);
    return { success: false, error: error.message || "Lỗi đồng bộ cơ sở dữ liệu." };
  }
}
