# DI Veo — Quản Lý Chi Tiêu

Khung project khởi tạo sẵn theo `plan.md`. Xem `AGENTS.md` để biết ngữ cảnh dự án dành cho AI agent.

## Mở bằng Antigravity

1. Giải nén, mở thư mục `di-veo/` bằng Google Antigravity.
2. Agent sẽ tự đọc `AGENTS.md` (ngữ cảnh dự án) và skill trong `.agents/skills/minimalist-ui/` khi bạn nhờ code giao diện.
3. Cài dependency:
   ```bash
   npm install
   ```
4. Tạo project trên [supabase.com](https://supabase.com) (free tier), copy 3 giá trị vào file `.env` (dựa theo `.env.example`):
   ```bash
   cp .env.example .env
   ```
5. Tạo bảng trong database theo schema Prisma:
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```
6. Chạy dev server:
   ```bash
   npm run dev
   ```
7. Khi sẵn sàng, deploy: import repo vào [vercel.com](https://vercel.com), nhớ set 3 biến môi trường ở bước 4 trong Vercel Project Settings > Environment Variables.

## Việc cần làm tiếp
Xem mục 8 "Lộ trình phát triển" trong `plan.md`. Bắt đầu từ trang đăng nhập (`app/login`) và form thêm giao dịch (`app/transactions`) — đây là 2 tính năng lõi.
