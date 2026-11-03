import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const products = [
  { productCode: 'PRD-001', name: 'Hydrococo 150ml', price: 8000, stock: 40 },
  { productCode: 'PRD-002', name: 'Hydrococo 250ml', price: 11000, stock: 35 },
  { productCode: 'PRD-003', name: 'Teh Botol Sosro 350ml', price: 5000, stock: 60 },
  { productCode: 'PRD-004', name: 'Aqua 600ml', price: 4000, stock: 100 },
  { productCode: 'PRD-005', name: 'Coca Cola 390ml', price: 6500, stock: 50 },
  { productCode: 'PRD-006', name: 'Indomie Goreng', price: 3500, stock: 120 },
  { productCode: 'PRD-007', name: 'Indomie Soto', price: 3500, stock: 90 },
  { productCode: 'PRD-008', name: 'Chitato Sapi Panggang 68g', price: 12000, stock: 45 },
  { productCode: 'PRD-009', name: 'Oreo Original 133g', price: 9500, stock: 30 },
  { productCode: 'PRD-010', name: 'Beng Beng 20g', price: 2500, stock: 200 },
  { productCode: 'PRD-011', name: 'Pepsodent 190g', price: 14500, stock: 25 },
  { productCode: 'PRD-012', name: 'Lifebuoy Sabun 75g', price: 4500, stock: 80 },
  { productCode: 'PRD-013', name: 'Rinso Anti Noda 770g', price: 22000, stock: 18 },
  { productCode: 'PRD-014', name: 'Kapal Api Special 165g', price: 13000, stock: 40 },
  { productCode: 'PRD-015', name: 'Ultra Milk Coklat 250ml', price: 7000, stock: 55 },
];

const customers = [
  { name: 'Andi Pratama', email: 'andi.pratama@example.com', phone: '081234567001', address: 'Jl. Merdeka No. 12, Jakarta' },
  { name: 'Siti Rahayu', email: 'siti.rahayu@example.com', phone: '081234567002', address: 'Jl. Kebon Jeruk No. 8, Bandung' },
  { name: 'Budi Santoso', email: 'budi.santoso@example.com', phone: '081234567003', address: 'Jl. Diponegoro No. 45, Surabaya' },
  { name: 'Dewi Lestari', email: 'dewi.lestari@example.com', phone: '081234567004', address: 'Jl. Gajah Mada No. 21, Semarang' },
  { name: 'Rizky Maulana', email: 'rizky.maulana@example.com', phone: '081234567005', address: 'Jl. Sudirman No. 90, Yogyakarta' },
  { name: 'Putri Andini', email: 'putri.andini@example.com', phone: '081234567006', address: 'Jl. Ahmad Yani No. 3, Medan' },
  { name: 'Agus Setiawan', email: 'agus.setiawan@example.com', phone: '081234567007', address: 'Jl. Pahlawan No. 17, Makassar' },
  { name: 'Maya Sari', email: 'maya.sari@example.com', phone: '081234567008', address: 'Jl. Melati No. 33, Denpasar' },
  { name: 'Fajar Nugroho', email: 'fajar.nugroho@example.com', phone: '081234567009', address: 'Jl. Cempaka No. 5, Malang' },
  { name: 'Nadia Permata', email: 'nadia.permata@example.com', phone: '081234567010', address: 'Jl. Kenanga No. 14, Palembang' },
];

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin Toko',
      passwordHash,
    },
  });

  await prisma.product.createMany({ data: products });
  await prisma.customer.createMany({ data: customers });

  console.log(`Seeder selesai: 1 admin, ${products.length} produk, ${customers.length} pelanggan`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
