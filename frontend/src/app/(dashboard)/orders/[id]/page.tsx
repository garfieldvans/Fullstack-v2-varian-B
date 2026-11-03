'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, request } from '@/lib/api';
import { formatDateTime, formatRupiah } from '@/lib/format';
import type { OrderDetail, OrderStatus } from '@/lib/types';

const badgeStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await request<OrderDetail>(`/orders/${orderId}`);

      setOrder(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(action: 'pay' | 'cancel') {
    setActing(true);
    setError('');

    try {
      const response = await request<OrderDetail>(`/orders/${orderId}/${action}`, {
        method: 'PATCH',
      });

      setOrder(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengubah status order');
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-sm text-slate-500">Memuat order...</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error || 'Order tidak ditemukan'}
        </p>
        <Link className="text-blue-600 hover:underline" href="/orders">
          Kembali ke daftar order
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-mono text-xl font-semibold">{order.order_number}</h1>
          <p className="text-sm text-slate-500">Dibuat {formatDateTime(order.created_at)}</p>
        </div>

        <Link
          className="rounded-md border border-slate-300 px-3.5 py-2 text-sm hover:bg-slate-50"
          href="/orders"
        >
          Kembali
        </Link>
      </div>

      {error && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-2 py-2.5 text-left font-semibold">Produk</th>
                <th className="px-2 py-2.5 text-right font-semibold">Qty</th>
                <th className="px-2 py-2.5 text-right font-semibold">Harga</th>
                <th className="px-2 py-2.5 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-2.5">
                    <span className="font-mono text-slate-500">{item.product_code}</span> {item.name}
                  </td>
                  <td className="px-2 py-2.5 text-right">{item.quantity}</td>
                  <td className="px-2 py-2.5 text-right">{formatRupiah(item.unit_price)}</td>
                  <td className="px-2 py-2.5 text-right">{formatRupiah(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-sm text-slate-500">Total</span>
            <strong className="text-lg">{formatRupiah(order.total)}</strong>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-slate-500">Status</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyles[order.status]}`}>
              {order.status}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-slate-500">Pelanggan</span>
            <span>{order.customer.name}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-slate-500">Email</span>
            <span>{order.customer.email ?? '-'}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-slate-500">Telepon</span>
            <span>{order.customer.phone ?? '-'}</span>
          </div>

          <div className="mt-4 flex gap-2">
            {order.status === 'PENDING' && (
              <button
                className="rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                type="button"
                onClick={() => updateStatus('pay')}
                disabled={acting}
              >
                Bayar
              </button>
            )}

            {order.status !== 'CANCELLED' && (
              <button
                className="rounded-md bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                type="button"
                onClick={() => updateStatus('cancel')}
                disabled={acting}
              >
                Batalkan
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
