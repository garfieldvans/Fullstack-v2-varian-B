import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Nama pelanggan wajib diisi'),
  email: z.string().trim().email('Format email tidak valid').optional(),
  phone: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
