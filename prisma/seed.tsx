import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Fungsi untuk menghasilkan SKU 13 digit angka random
function generateRandomSKU(): string {
  return Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
}

async function main() {
  // ========== USER ADMIN & KASIR (sesuai permintaan) ==========
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

  console.log("User admin dan kasir telah dibuat.");

  // ========== 50 PRODUK DENGAN SKU RANDOM 13 DIGIT & HARGA REAL ==========
  const productsData = [
    { name: "Gula Pasir 1kg", price: 16500, stock: 50 },
    { name: "Minyak Goreng 2L", price: 42600, stock: 40 },
    { name: "Beras Premium 5kg", price: 75000, stock: 30 },
    { name: "Tepung Terigu 1kg", price: 13500, stock: 60 },
    { name: "Telur Ayam 1 tray", price: 45000, stock: 25 },
    { name: "Bawang Merah 1kg", price: 65000, stock: 20 },
    { name: "Bawang Putih 1kg", price: 48000, stock: 20 },
    { name: "Cabai Rawit Merah 1kg", price: 60000, stock: 15 },
    { name: "Kanzler Sosis Singles 60g", price: 9000, stock: 80 },
    { name: "Indomie Goreng Jumbo", price: 3600, stock: 150 },
    { name: "Mie Sedaap Goreng", price: 3100, stock: 150 },
    { name: "Beras SPHP 5kg", price: 60000, stock: 35 },
    { name: "Garam Bata Cap Kapal 500g", price: 6500, stock: 70 },
    { name: "Sambal Indofood 340g", price: 11600, stock: 45 },
    { name: "Aqua 600ml", price: 4500, stock: 100 },
    { name: "Teh Botol Sosro 350ml", price: 4500, stock: 80 },
    { name: "Frisian Flag UHT 250ml", price: 8500, stock: 60 },
    { name: "Good Day Latte 216ml", price: 13900, stock: 40 },
    { name: "Milku Susu Stroberi 200ml", price: 3300, stock: 90 },
    { name: "Adem Sari Ching Ku 320ml", price: 6200, stock: 55 },
    { name: "Susu Bendera UHT 250ml", price: 8000, stock: 65 },
    { name: "Teh Pucuk Harum 350ml", price: 4500, stock: 85 },
    { name: "Kapal Api Kopi Bubuk 50g", price: 16000, stock: 40 },
    { name: "Tiga Sapi KKM 390g", price: 12500, stock: 45 },
    { name: "Chitato Keripik Kentang 68g", price: 10500, stock: 70 },
    { name: "Potabee Potato Chips 68g", price: 9900, stock: 70 },
    { name: "Qtela Keripik Singkong 180g", price: 14200, stock: 55 },
    { name: "Piattos Sambal Geprek 75g", price: 13900, stock: 45 },
    { name: "SilverQueen Almond 62g", price: 12900, stock: 60 },
    { name: "Astor Wafer Stick 330g", price: 24900, stock: 40 },
    { name: "Pringles Original 102g", price: 22500, stock: 40 },
    { name: "Beng-Beng Share It 10x9.5g", price: 11500, stock: 65 },
    { name: "Taro Net 65g", price: 7200, stock: 80 },
    { name: "Rebo Kuaci Bunga Matahari 150g", price: 9200, stock: 75 },
    { name: "Pulpen Joyko GP-265", price: 2500, stock: 100 },
    { name: "Pensil 2B", price: 3000, stock: 80 },
    { name: "Penghapus Joyko", price: 3500, stock: 70 },
    { name: "Penggaris Plastik 30cm", price: 5000, stock: 60 },
    { name: "Buku Tulis Sidu 38 lembar", price: 4500, stock: 90 },
    { name: "Spidol Permanen Hitam", price: 12000, stock: 45 },
    { name: "Kertas HVS A4 1 rim", price: 55000, stock: 20 },
    { name: "Stapler Kenko Mini", price: 25000, stock: 25 },
    { name: "Map Plastik", price: 8000, stock: 70 },
    { name: "Marker Stabilo Boss", price: 18000, stock: 35 },
    { name: "Sunsilk Shampoo 320ml", price: 33900, stock: 45 },
    { name: "Pasta Gigi Pepsodent 190g", price: 20900, stock: 50 },
    { name: "Sabun Mandi Dove Cair 400ml", price: 23900, stock: 40 },
    { name: "Deterjen So Klin 1.5kg", price: 23500, stock: 40 },
    { name: "Pewangi Royale 500ml", price: 13500, stock: 50 },
    { name: "Sabun Cuci Piring Sunlight 400ml", price: 11500, stock: 60 },
  ];

  for (const product of productsData) {
    const sku = generateRandomSKU(); // 13 digit random
    await prisma.product.upsert({
      where: { sku },
      update: {
        name: product.name,
        price: product.price,
        stock: product.stock,
        description: `${product.name} - Harga Rp ${product.price.toLocaleString()}`,
      },
      create: {
        sku,
        name: product.name,
        price: product.price,
        stock: product.stock,
        description: `${product.name} - Harga Rp ${product.price.toLocaleString()}`,
      },
    });
  }

  console.log(" 50 produk dengan SKU 13 digit random telah ditambahkan.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });