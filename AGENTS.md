# DI Veo — Quản Lý Chi Tiêu

Ngữ cảnh dự án cho AI agent (Antigravity, hoặc bất kỳ agent nào hỗ trợ AGENTS.md).

## Dự án này là gì
Web app quản lý thu-chi cá nhân cho sinh viên/người thu nhập không cố định.
Chi tiết đầy đủ về nghiệp vụ, database schema, lộ trình: xem `plan.md` ở thư mục gốc.

## Tech stack (bám sát, không tự ý đổi)
- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth) — không dùng localStorage để lưu dữ liệu người dùng
- Prisma làm ORM, schema ở `prisma/schema.prisma`
- Recharts cho biểu đồ
- React Hook Form + Zod cho validate form
- Deploy: Vercel (Hobby/free tier)

## Quy ước code
- Toàn bộ số tiền lưu dạng số nguyên (đơn vị VNĐ), không dùng float.
- Danh mục mặc định khi seed: Ăn uống, Café/Xăng/Nhớt, Tiền nhà, Tiết kiệm, Chi tiêu lặt vặt, Thu nhập.
- Công thức tiết kiệm tuần: nếu (thu - chi) tuần đó <= 0 thì tiết kiệm đề xuất = 0, ngược lại = (thu - chi) * tỉ_lệ (mặc định 25%, chỉnh được trong Settings).
- Ưu tiên tính toán tổng hợp tuần/tháng bằng query động (SUM), không lưu số liệu tổng hợp cứng vào bảng riêng — tránh lệch dữ liệu khi sửa/xóa giao dịch.
- Thêm 1 giao dịch mới phải làm được trong tối đa 3 thao tác chạm/click.

## Skills đã cài
- `.agents/skills/minimalist-ui/` — phong cách thiết kế editorial, gọn gàng kiểu Notion/Linear, dùng khi code bất kỳ giao diện nào cho app này (Dashboard, Transactions, Settings...).

## Việc cần làm tiếp theo (theo plan.md, Giai đoạn 1)
1. Kết nối Supabase (điền `.env` từ `.env.example`)
2. Chạy `npx prisma migrate dev` để tạo bảng theo `prisma/schema.prisma`
3. Làm màn hình đăng nhập/đăng ký (Supabase Auth)
4. Làm form thêm giao dịch (`app/transactions`)
5. Làm Dashboard tổng hợp tuần (`app/dashboard`)
