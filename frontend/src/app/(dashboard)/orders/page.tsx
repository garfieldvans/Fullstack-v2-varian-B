'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, request, type ApiMeta } from '@/lib/api';
import { formatDateTime, formatRupiah } from '@/lib/format';
import type { OrderStatus, OrderSummary } from '@/lib/types';

const badgeStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

const filterInput =
  'rounded-md border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

export default function OrdersPage() {
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [meta, setMeta] = useState<ApiMeta>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), per_page: '10' });

    if (status) params.set('status', status);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    setLoading(true);
    setError('');

    try {
      const response = await request<OrderSummary[]>(`/orders?${params.toString()}`);

      setOrders(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat order');
    } finally {
      setLoading(false);
    }
  }, [page, status, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(order: OrderSummary, action: 'pay' | 'cancel') {
    setActingOn(order.id);
    setError('');

    try {
      await request(`/orders/${order.id}/${action}`, { method: 'PATCH' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengubah status order');
    } finally {
      setActingOn('');
    }
  }

  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.per_page)) : 1;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Order</h1>
          <p className="text-sm text-slate-500">Riwayat order beserta status terakhirnya.</p>
        </div>

        <Link
          className="rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          href="/orders/new"
        >
          Buat Order
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-3">
          <select
            className={filterInput}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua status</option>
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <input
            className={filterInput}
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />

          <input
            className={filterInput}
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
        </div>

        {error && (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="px-2 py-2.5 text-left font-semibold">Nomor</th>
              <th className="px-2 py-2.5 text-left font-semibold">Pelanggan</th>
              <th className="px-2 py-2.5 text-left font-semibold">Tanggal</th>
              <th className="px-2 py-2.5 text-right font-semibold">Item</th>
              <th className="px-2 py-2.5 text-right font-semibold">Total</th>
              <th className="px-2 py-2.5 text-left font-semibold">Status</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-100 last:border-0">
                <td className="px-2 py-2.5 font-mono">
                  <Link className="text-blue-600 hover:underline" href={`/orders/${order.id}`}>
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-2 py-2.5">{order.customer.name}</td>
                <td className="px-2 py-2.5">{formatDateTime(order.created_at)}</td>
                <td className="px-2 py-2.5 text-right">{order.item_count}</td>
                <td className="px-2 py-2.5 text-right">{formatRupiah(order.total)}</td>
                <td className="px-2 py-2.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyles[order.status]}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex justify-end gap-2">
                    {order.status === 'PENDING' && (
                      <button
                        className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        type="button"
                        onClick={() => updateStatus(order, 'pay')}
                        disabled={actingOn === order.id}
                      >
                        Bayar
                      </button>
                    )}

                    {order.status !== 'CANCELLED' && (
                      <button
                        className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        type="button"
                        onClick={() => updateStatus(order, 'cancel')}
                        disabled={actingOn === order.id}
                      >
                        Batalkan
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!loading && orders.length === 0 && (
              <tr>
                <td className="px-2 py-8 text-center text-slate-500" colSpan={7}>
                  Belum ada order yang cocok dengan filter
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td className="px-2 py-8 text-center text-slate-500" colSpan={7}>
                  Memuat order...
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-end gap-3 text-sm">
          <button
            className="rounded-md border border-slate-300 px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
          >
            Sebelumnya
          </button>

          <span className="text-slate-500">
            Halaman {page} dari {totalPages}
          </span>

          <button
            className="rounded-md border border-slate-300 px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= totalPages}
          >
            Berikutnya
          </button>
        </div>
      </section>
    </main>
  );
}
