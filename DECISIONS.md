# Keputusan Teknis

## Stok dan transaksi order

Saya mengurangi stok di dalam satu transaksi database bersama proses pembuatan order. Di `backend/src/modules/orders/order.service.ts`, `createOrder()` memakai `tx.product.updateMany()` dengan syarat stok harus masih cukup (`stock >= quantity`), lalu mengurangi stok secara langsung. Jika tidak ada baris yang berubah, order ditolak dengan status `422`.

Cara ini menangani dua pembeli yang meminta stok terakhir pada waktu bersamaan: database hanya mengizinkan satu update yang memenuhi syarat stok. Request lainnya ditolak, jadi stok tidak menjadi minus. Jika ada item lain yang gagal, transaksi membatalkan semua pengurangan stok sebelumnya.

Saya juga mengunci baris pelanggan lewat `lockCustomer()` sebelum menghitung jumlah order `PENDING`. Ini mencegah dua request untuk pelanggan yang sama melewati batas tiga order pending. Pembatalan di `cancelOrder()` juga mengubah status dan mengembalikan stok dalam satu transaksi agar stok tidak dikembalikan dua kali.

Test di `backend/test/order.test.ts` mengirim dua request bersamaan saat stok tersisa satu. Test memastikan satu request berhasil, satu ditolak, dan stok akhir tetap nol. Jika kelak stok dapat diubah dari layanan lain atau SQL langsung, saya akan menambahkan constraint database `CHECK (stock >= 0)` dan test tambahan untuk transaksi multi-produk serta pembatalan bersamaan.

## Susunan kode

Saya memisahkan `backend/` dan `frontend/` agar API dan aplikasi web punya dependensi serta perintah masing-masing. Backend mengelompokkan kode berdasarkan fitur di `backend/src/modules/`: route menerima request, schema memvalidasi data dengan Zod, dan service menjalankan aturan bisnis serta query database. Contohnya, `order.service.ts` menangani stok, total, status, dan nomor order.

Fungsi umum ditempatkan terpisah: `backend/src/shared/http.ts` mengatur format response dan error; `backend/src/plugins/auth.ts` mengatur JWT; `backend/src/app.ts` memasang route dan penanganan error; sedangkan `backend/src/server.ts` menjalankan server. Skema, migrasi, dan seed ada di `backend/prisma/`; test ada di `backend/test/`.

Frontend memakai Next.js App Router di `frontend/src/app/`. Layout `(dashboard)` memeriksa token dan menampilkan navigasi. `frontend/src/lib/api.ts` menangani request API dan token; `types.ts` serta `format.ts` dipakai bersama oleh halaman.

Struktur ini cukup untuk kebutuhan sekarang. Saya belum menambah lapisan repository karena saat ini lapisan itu hanya akan membungkus pemanggilan Prisma. Jika fitur dan aturan bisnis bertambah, saya akan memisahkan alur bisnis yang dipakai banyak tempat, menyamakan kontrak API antara frontend dan backend, serta menambah hak akses dan test sesuai kebutuhan. Repository baru saya tambahkan jika memang membantu pengujian atau mendukung lebih dari satu sumber data.

## Temuan saat meninjau kode

Saya menemukan bahwa filter tanggal order hanya diperiksa bentuk teksnya. Di `backend/src/modules/orders/order.schema.ts`, regex memastikan format `YYYY-MM-DD`, tetapi tidak memastikan tanggalnya benar-benar ada. Jadi nilai seperti `2026-99-99` bisa lolos.

Setelah itu, `listOrders()` di `backend/src/modules/orders/order.service.ts` mengubah nilai tersebut menjadi objek `Date` dan mengirimkannya ke Prisma. Tanggal tidak valid dapat menyebabkan error server, bukan respons validasi `422`.

Masalah ini bisa diperiksa dengan request terautentikasi berikut:

```text
GET /api/orders?date_from=2026-99-99
```

Saya menyimpulkan masalah ini dengan mengikuti alur validasi, konversi tanggal, lalu query database. Ini temuan dari analisis kode, bukan klaim bahwa saya pernah mengalami insiden tersebut. Perbaikannya adalah memvalidasi tanggal kalender di schema dan menambah test untuk tanggal valid, tanggal kabisat, serta tanggal yang tidak mungkin.

## Hal yang masih perlu diperbaiki

- **Belum ada idempotency key.** Retry `POST /api/orders` setelah timeout dapat membuat order duplikat. Saya akan menyimpan key unik dan mengaitkannya dengan order yang dibuat.
- **Halaman produk hanya untuk melihat data.** API bisa menambah dan mengubah produk, tetapi frontend belum punya form-nya. Saya akan menambahkannya jika pengelolaan produk lewat UI diperlukan.
- **Daftar pelanggan belum bisa dicari atau dipaginasi.** Saat data bertambah, mengirim semua pelanggan sekaligus akan kurang efisien. Tambahkan pencarian dan pagination.
- **Belum ada pembatasan hak akses berdasarkan peran.** Semua pengguna yang memiliki token dapat memakai endpoint yang sama. Tambahkan peran jika aplikasi mulai memiliki jenis pengguna berbeda.
- **Pengaturan keamanan masih berorientasi development.** Token disimpan di `localStorage`, JWT memiliki secret fallback, dan CORS menerima semua origin. Sebelum deployment publik, wajibkan secret yang kuat dan batasi origin. Tinjau juga penggunaan cookie `HttpOnly` serta perlindungan CSRF.
- **Test lebih banyak mencakup alur order.** Tambahkan test untuk login gagal, validasi produk dan pelanggan, serta filter tanggal.
- **Nomor order dihitung dari nomor yang sudah ada hari itu.** `nextOrderNumber()` memakai advisory lock sehingga pembuatan nomor berurutan untuk skala sekarang. Jika volume meningkat, gunakan counter harian dan tentukan penanganan saat format empat digit mencapai batas.

Seed di `backend/prisma/seed.ts` menghapus order, pelanggan, produk, dan pengguna sebelum membuat data contoh. Karena itu, jalankan seed hanya pada database lokal atau database sementara.