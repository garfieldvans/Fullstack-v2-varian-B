import { z } from 'zod';

export const productSchema = z.object({
  product_code: z.string().trim().min(1, 'Kode produk wajib diisi'),
  name: z.string().trim().min(1, 'Nama produk wajib diisi'),
  price: z.number().positive('Harga harus lebih dari 0'),
  stock: z.number().int('Stok harus bilangan bulat').min(0, 'Stok tidak boleh negatif'),
});

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
