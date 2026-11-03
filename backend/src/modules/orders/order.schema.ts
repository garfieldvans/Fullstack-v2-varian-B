import { z } from 'zod';

const orderItemSchema = z.object({
  product_id: z.string().min(1, 'Produk wajib dipilih'),
  quantity: z
    .number()
    .int('Jumlah harus bilangan bulat')
    .min(1, 'Jumlah minimal 1'),
});

export const createOrderSchema = z.object({
  customer_id: z.string().min(1, 'Pelanggan wajib dipilih'),
  items: z.array(orderItemSchema).min(1, 'Order minimal berisi satu produk'),
});

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED'], 'Status tidak valid').optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
});

export const orderIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
