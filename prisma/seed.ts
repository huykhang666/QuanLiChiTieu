import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultCategories = [
  { name: "Ăn uống", type: "expense", icon: "utensils" },
  { name: "Café / Xăng / Nhớt", type: "expense", icon: "fuel" },
  { name: "Tiền nhà", type: "expense", icon: "home" },
  { name: "Tiết kiệm", type: "expense", icon: "piggy-bank" },
  { name: "Chi tiêu lặt vặt", type: "expense", icon: "shopping-bag" },
  { name: "Thu nhập", type: "income", icon: "wallet" },
];

async function main() {
  for (const category of defaultCategories) {
    await prisma.category.create({ data: { ...category, isDefault: true } });
  }
  console.log(`Đã tạo ${defaultCategories.length} danh mục mặc định.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
