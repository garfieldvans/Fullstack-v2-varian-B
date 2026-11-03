# Order App

Aplikasi order sederhana dengan dua service terpisah:

- `backend/` — REST API: Fastify 5, Prisma 6, PostgreSQL, zod, Vitest.
- `frontend/` — Next.js 16 (App Router), React 19, Tailwind CSS 4.

Aturan bisnis yang dipakai adalah **Varian B (Batas Pembelian)**: maksimal 5 unit per produk dalam satu order dan maksimal 3 order `PENDING` per pelanggan.

## Prasyarat

- Node.js 20 atau lebih baru
- Docker (untuk PostgreSQL)

## Setup

Enam perintah dari clone sampai aplikasi berjalan. Perintah 5 dan 6 dijalankan di dua terminal berbeda.

```bash
git clone <url-repo> && cd <nama-repo>
docker run -d --name orders-db -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=orders_dev postgres:17-alpine
cd backend && cp .env.example .env && npm install && npm run db:migrate && npm run db:seed
cd ../frontend && cp .env.example .env.local && npm install
cd ../backend && npm run dev
cd ../frontend && npm run dev
```

Backend berjalan di `http://localhost:3001`, frontend di `http://localhost:3000`.

File `.env` dan `.env.local` tidak ikut ter-commit. Contoh nilainya ada di `backend/.env.example` dan `frontend/.env.example`.

## Akun seeder

| Email               | Password   |
| ------------------- | ---------- |
| `admin@example.com` | `admin123` |

Seeder (`backend/prisma/seed.ts`) juga mengisi 15 produk dan 10 pelanggan.

## Menjalankan test

Test memakai database terpisah (`orders_test`) supaya data development tidak tersentuh.

```bash
docker exec orders-db psql -U postgres -c 'CREATE DATABASE orders_test'
cd backend && npm test
```

Database test hanya perlu dibuat sekali. Migrasinya dijalankan otomatis lewat `backend/test/global-setup.ts`, dan setiap test membersihkan lalu mengisi ulang data sendiri (`backend/test/order.test.ts`). Alamat database test bisa diganti lewat variabel `TEST_DATABASE_URL`.

Cakupan test: order sukses, stok tidak cukup, pembatalan mengembalikan stok, transisi status yang tidak valid, aturan varian B (batas 5 unit dan batas 3 order `PENDING`), akses tanpa token, serta dua order bersamaan yang memperebutkan stok terakhir.

## Alur `POST /api/orders`

1. **Route** — `backend/src/modules/orders/order.routes.ts` menerima request. Semua route order berada di grup yang memasang `preHandler: authenticate` (`backend/src/plugins/auth.ts`), jadi request tanpa token JWT langsung ditolak `401`.
2. **Validasi bentuk body** — `backend/src/modules/orders/order.schema.ts` memeriksa `customer_id` dan daftar `items`. `parseInput()` di `backend/src/shared/http.ts` mengubah error zod menjadi `422` dengan kunci per field, misalnya `items.1.quantity`.
3. **Service** — `createOrder()` di `backend/src/modules/orders/order.service.ts` menjalankan seluruh proses dalam satu `prisma.$transaction`:
   - Lock baris pelanggan dengan `SELECT id FROM "Customer" WHERE id = $1 FOR UPDATE`. Pelanggan tidak ada → `404`; pelanggan yang sama tidak bisa membuat order paralel melewati batas.
   - Hitung order berstatus `PENDING` milik pelanggan. Sudah 3 → `422` pada `customer_id`.
   - Jumlahkan kuantitas per produk (dua baris produk yang sama ikut dihitung) dan tolak kalau lebih dari 5 unit → `422` pada `items.{i}.quantity`.
   - Ambil produk dari database, lalu kurangi stok secara atomik dengan `updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })`. Kalau `count` bernilai 0 berarti stok sudah diambil request lain → `422` "Stok tidak mencukupi" dan transaksi dibatalkan.
   - Buat `order_number` berformat `INV-YYYYMMDD-XXXX` di `nextOrderNumber()`, dilindungi `pg_advisory_xact_lock` per tanggal agar dua order di hari yang sama tidak mendapat nomor yang sama.
   - Harga satuan dan subtotal diambil dari data produk saat itu (client tidak mengirim harga), lalu `total` dijumlahkan di server.
   - Simpan order beserta item-nya dengan `tx.order.create()`.
4. **Response** — `respond()` mengembalikan `201` dengan format `{ success, message, data }`.

Kalau salah satu langkah gagal, seluruh transaksi di-rollback sehingga stok tidak berkurang dan tidak ada order setengah jadi yang tersimpan.
