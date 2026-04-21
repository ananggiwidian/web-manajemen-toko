import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@tokoku.com" },
    update: {},
    create: {
      email: "admin@tokoku.com",
      name: "Administrator",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // Kasir
  const kasirPassword = await bcrypt.hash("kasir123", 10);
  await prisma.user.upsert({
    where: { email: "kasir@tokoku.com" },
    update: {},
    create: {
      email: "kasir@tokoku.com",
      name: "Kasir Utama",
      password: kasirPassword,
      role: "KASIR",
    },
  });

  console.log("Seed selesai! User admin dan kasir telah dibuat.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });