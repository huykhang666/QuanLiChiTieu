# DI Veo — Quản Lý Chi Tiêu
### Bản kế hoạch dự án (Project Plan)

> **DI Veo** — chơi chữ từ "đi vèo" (tiền đi vèo một cái là hết). App giúp sinh viên/người thu nhập không cố định nắm được tiền đang "đi vèo" đi đâu, và giữ lại được bao nhiêu.

---

## 1. Tổng quan

| | |
|---|---|
| **Tên app** | DI Veo — Quản Lý Chi Tiêu |
| **Đối tượng** | Sinh viên, người có thu nhập không cố định (freelance, part-time) |
| **Vấn đề giải quyết** | Không biết tiền đi đâu, không có thói quen ghi chép, sợ mất dữ liệu khi lưu local |
| **Nền tảng** | Web app (responsive, dùng tốt trên điện thoại), PWA cài được như app |
| **Chi phí vận hành** | 0đ (dùng free tier Vercel + Supabase) |
| **Giai đoạn hiện tại** | MVP (giai đoạn 1) |

---

## 2. Tech Stack

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | Deploy free trên Vercel, frontend + API route chung 1 project |
| Ngôn ngữ | **TypeScript** | An toàn kiểu dữ liệu, ít bug khi sửa sau này |
| Database | **Supabase (Postgres)** | Free tier 500MB, có sẵn Auth + Realtime |
| Auth | **Supabase Auth** (Email/Password + Google) | Không cần tự viết hệ thống đăng nhập |
| ORM | **Prisma** | Quản lý schema, migration rõ ràng, dễ đọc |
| UI | **Tailwind CSS + shadcn/ui** | Component sẵn, tùy biến nhanh |
| Biểu đồ | **Recharts** | Pie chart theo danh mục, line/bar chart theo tuần-tháng |
| State (client) | **Zustand** hoặc React Context | Nhẹ, đủ dùng cho app quy mô này |
| Form & validate | **React Hook Form + Zod** | Validate input tiền, ngày tháng chắc chắn |
| Hosting | **Vercel** (Hobby — free) | Auto deploy khi push GitHub |
| PWA | **next-pwa** | Cài lên màn hình chính điện thoại, dùng như app native |

---

## 3. Kiến trúc hệ thống

```
┌─────────────┐        HTTPS         ┌──────────────────┐
│   Browser    │ ───────────────────▶ │  Next.js (Vercel) │
│ (điện thoại/ │ ◀─────────────────── │  - Pages (UI)      │
│   laptop)    │                      │  - API Routes      │
└─────────────┘                      └─────────┬─────────┘
                                                │ Prisma / Supabase JS SDK
                                                ▼
                                      ┌──────────────────┐
                                      │  Supabase          │
                                      │  - Postgres DB     │
                                      │  - Auth             │
                                      └──────────────────┘
```

Dữ liệu luôn nằm trên Supabase (cloud) → xóa cache trình duyệt, đổi máy, cài lại app đều **không mất dữ liệu**, chỉ cần đăng nhập lại.

---

## 4. Thiết kế Database (Prisma schema, rút gọn)

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  displayName   String?
  createdAt     DateTime  @default(now())
  transactions  Transaction[]
  budgets       Budget[]
  savingsGoals  SavingsGoal[]
}

model Category {
  id        String   @id @default(uuid())
  name      String   // Ăn uống, Café/Xăng/Nhớt, Tiền nhà, Tiết kiệm, Lặt vặt...
  type      String   // "income" | "expense"
  icon      String?  // tên icon hiển thị
  isDefault Boolean  @default(true) // danh mục mặc định hay user tự tạo
  transactions Transaction[]
}

model Transaction {
  id          String   @id @default(uuid())
  userId      String
  categoryId  String
  amount      Int      // đơn vị: VNĐ
  type        String   // "income" | "expense"
  note        String?
  date        DateTime // ngày phát sinh giao dịch
  isRecurring Boolean  @default(false)
  createdAt   DateTime @default(now())

  user     User     @relation(fields: [userId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])
}

model Budget {
  id         String   @id @default(uuid())
  userId     String
  categoryId String
  month      Int
  year       Int
  limit      Int      // hạn mức chi tiêu tháng đó cho danh mục
  user       User     @relation(fields: [userId], references: [id])
}

model SavingsGoal {
  id           String   @id @default(uuid())
  userId       String
  title        String   // VD: "Mua laptop"
  targetAmount Int
  currentAmount Int     @default(0)
  deadline     DateTime?
  user         User     @relation(fields: [userId], references: [id])
}
```

> Bảng **Tổng kết ngày/tuần** trong ý tưởng gốc không cần lưu riêng — sẽ được **tính động** bằng câu truy vấn SUM theo ngày/tuần từ bảng `Transaction`, tránh dữ liệu bị lệch khi sửa/xóa giao dịch cũ.

---

## 5. Danh sách trang (Routes)

| Route | Mô tả |
|---|---|
| `/` | Landing giới thiệu app (chưa đăng nhập) |
| `/login`, `/register` | Đăng nhập / đăng ký |
| `/dashboard` | Trang chính: tổng thu-chi hôm nay, tuần này, biểu đồ nhanh |
| `/transactions` | Danh sách toàn bộ giao dịch, filter theo ngày/danh mục, thêm/sửa/xóa |
| `/transactions/new` | Form thêm giao dịch nhanh (tối ưu thao tác ít bước nhất) |
| `/summary` | Tương ứng Sheet 2 gốc: tổng hợp theo tuần/tháng, % tiết kiệm |
| `/budgets` | Đặt hạn mức chi tiêu theo danh mục |
| `/goals` | Mục tiêu tiết kiệm |
| `/settings` | Quản lý danh mục, thông tin tài khoản |

---

## 6. API Endpoints (Next.js Route Handlers)

```
POST   /api/transactions          Tạo giao dịch mới
GET    /api/transactions          Lấy danh sách (query: from, to, categoryId)
PATCH  /api/transactions/:id      Sửa giao dịch
DELETE /api/transactions/:id      Xóa giao dịch

GET    /api/summary/weekly        Tổng thu-chi theo tuần
GET    /api/summary/monthly       Tổng thu-chi theo tháng

GET    /api/categories            Danh sách danh mục
POST   /api/categories            Tạo danh mục mới

GET    /api/budgets               Lấy ngân sách tháng hiện tại
POST   /api/budgets               Đặt/cập nhật ngân sách

GET    /api/goals                 Danh sách mục tiêu tiết kiệm
POST   /api/goals                 Tạo mục tiêu mới
PATCH  /api/goals/:id             Cập nhật số tiền đã tiết kiệm
```

---

## 7. Logic nghiệp vụ chính

**Công thức tiết kiệm tuần** (theo ý tưởng gốc):
```
tổng_thu_tuần = SUM(transactions.amount WHERE type = 'income' AND date IN tuần đó)
tổng_chi_tuần = SUM(transactions.amount WHERE type = 'expense' AND date IN tuần đó)
số_dư_tuần    = tổng_thu_tuần - tổng_chi_tuần

nếu số_dư_tuần <= 0:
    tiết_kiệm_đề_xuất = 0
ngược lại:
    tiết_kiệm_đề_xuất = số_dư_tuần * tỉ_lệ_tiết_kiệm   // mặc định 25%, cho phép chỉnh trong Settings
```

**Danh mục mặc định khi user đăng ký** (seed sẵn theo ý tưởng gốc):
1. Ăn uống
2. Café / Xăng / Nhớt
3. Tiền nhà
4. Tiết kiệm
5. Chi tiêu lặt vặt
6. Thu nhập (lương, học bổng, freelance...)

---

## 8. Lộ trình phát triển

### Giai đoạn 1 — MVP (mục tiêu: dùng được cho bản thân)
- [ ] Setup Next.js + Supabase + Prisma, deploy Vercel
- [ ] Đăng nhập/đăng ký (Supabase Auth)
- [ ] Thêm/sửa/xóa giao dịch thu-chi theo ngày
- [ ] Trang Dashboard: tổng hôm nay, biểu đồ tuần
- [ ] Trang Tổng hợp theo tuần + tính % tiết kiệm tự động
- [ ] Danh mục mặc định (Ăn uống, Café/Xăng/Nhớt, Tiền nhà, Tiết kiệm, Lặt vặt)

### Giai đoạn 2 — Nâng cao trải nghiệm
- [ ] Đặt ngân sách theo danh mục + cảnh báo khi gần vượt
- [ ] Chi tiêu định kỳ (tiền nhà, tiền mạng tự động lặp mỗi tháng)
- [ ] Mục tiêu tiết kiệm (savings goal) có thanh tiến độ
- [ ] Biểu đồ pie chart tỷ trọng chi tiêu theo danh mục
- [ ] Xuất báo cáo Excel/PDF theo tháng

### Giai đoạn 3 — Tiện ích
- [ ] PWA — cài lên màn hình chính điện thoại
- [ ] Nhắc nhở nhập chi tiêu cuối ngày (push notification)
- [ ] Chế độ tối (dark mode)
- [ ] Cho phép tự tạo danh mục riêng
- [ ] Đồng bộ nhiều thiết bị (đã có sẵn nhờ dùng DB cloud từ đầu)

---

## 9. Định hướng thiết kế UI

- **Bảng màu**: Xanh navy đậm (#1B2A4A) làm nền/chữ chính — cảm giác tin cậy; điểm nhấn vàng đồng (#F2A93B) cho số tiền dương/thu nhập; xanh ngọc (#2FBF9F) cho tiết kiệm/tăng trưởng; đỏ cam nhẹ (#E1594F) cho chi tiêu vượt ngân sách.
- **Font**: Chữ số/số tiền dùng font đơn giản, rõ ràng (Inter hoặc Manrope) để đọc số nhanh — đây là app "nhìn phát hiểu" chứ không phải app đọc nội dung dài.
- **Nguyên tắc**: Mỗi lần mở app, việc **thêm 1 giao dịch mới phải làm được trong tối đa 3 chạm** (mở app → chọn loại → nhập số tiền) vì sinh viên hay lười ghi chép.

---

## 10. Rủi ro & lưu ý

| Rủi ro | Cách xử lý |
|---|---|
| Free tier Supabase giới hạn 500MB | Với app cá nhân ghi vài dòng/ngày, đủ dùng nhiều năm |
| Vercel Hobby giới hạn băng thông | Không đáng lo với app cá nhân, ít traffic |
| Quên ghi chép hằng ngày | Thêm tính năng nhắc nhở ở Giai đoạn 3 |
| Thu nhập không cố định làm số liệu tuần "âm" | Đã xử lý trong công thức: tiết kiệm = 0 nếu tuần đó âm |
| Mất dữ liệu khi đổi máy | Không còn là vấn đề vì dữ liệu nằm trên Supabase, không phải localStorage |

---

## 11. Bước tiếp theo (đề xuất)

1. Khởi tạo project Next.js + kết nối Supabase
2. Dựng schema Prisma và chạy migration
3. Làm màn hình đăng nhập + thêm giao dịch trước tiên (tính năng lõi nhất)
4. Sau đó mới tới Dashboard/biểu đồ

---

*File này là bản kế hoạch sống — cập nhật lại khi có thay đổi ý tưởng hoặc hoàn thành mốc nào đó (tick vào checklist ở mục 8).*
