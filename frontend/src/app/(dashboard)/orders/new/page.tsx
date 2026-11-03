'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError, request } from '@/lib/api';
import { formatRupiah } from '@/lib/format';
import type { Customer, OrderDetail, Product } from '@/lib/types';

type Row = {
  key: number;
  productId: string;
  quantity: number;
};

const field = 'w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1';
const normalField = `${field} border-slate-300 focus:border-blue-500 focus:ring-blue-500`;
const invalidField = `${field} border-red-400 focus:border-red-500 focus:ring-red-500`;

export default function NewOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [rows, setRows] = useState<Row[]>([{ key: 1, productId: '', quantity: 1 }]);
  const [nextKey, setNextKey] = useState(2);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    Promise.all([request<Customer[]>('/customers'), request<Product[]>('/products?per_page=100')])
      .then(([customerResponse, productResponse]) => {
        setCustomers(customerResponse.data);
        setProducts(productResponse.data);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat data');
      })
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const product = products.find((item) => item.id === row.productId);

        return product ? sum + product.price * row.quantity : sum;
      }, 0),
    [rows, products],
  );

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [...current, { key: nextKey, productId: '', quantity: 1 }]);
    setNextKey((current) => current + 1);
  }

  function removeRow(key: number) {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.key !== key)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setCustomerError('');
    setRowErrors({});

    if (rows.some((row) => !row.productId)) {
      setError('Pilih produk untuk setiap baris');
      return;
    }

    setSubmitting(true);

    try {
      const response = await request<OrderDetail>('/orders', {
        method: 'POST',
        body: {
          customer_id: customerId,
          items: rows.map((row) => ({ product_id: row.productId, quantity: row.quantity })),
        },
      });

      router.push(`/orders/${response.data.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setCustomerError((err.errors.customer_id ?? []).join(', '));

        const errors: Record<number, string> = {};

        Object.entries(err.errors).forEach(([fieldName, messages]) => {
          const match = fieldName.match(/^items\.(\d+)\./);

          if (match) {
            errors[Number(match[1])] = messages.join(', ');
          }
        });

        setRowErrors(errors);
      } else {
        setError('Gagal membuat order');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Buat Order</h1>
        <p className="text-sm text-slate-500">Harga dan total dihitung otomatis oleh server.</p>
      </div>

      <form className="space-y-6 rounded-lg border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="customer">
            Pelanggan
          </label>
          <select
            id="customer"
            className={`${customerError ? invalidField : normalField} max-w-sm`}
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            disabled={loading}
            required
          >
            <option value="">Pilih pelanggan</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          {customerError && <p className="mt-1 text-xs text-red-600">{customerError}</p>}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">Produk</p>

          {rows.map((row, index) => {
            const product = products.find((item) => item.id === row.productId);

            return (
              <div key={row.key} className="mb-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_100px_130px_90px]">
                  <select
                    className={rowErrors[index] ? invalidField : normalField}
                    value={row.productId}
                    onChange={(event) => updateRow(row.key, { productId: event.target.value })}
                    disabled={loading}
                  >
                    <option value="">Pilih produk</option>
                    {products.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.product_code} - {item.name} (stok {item.stock})
                      </option>
                    ))}
                  </select>

                  <input
                    className={rowErrors[index] ? invalidField : normalField}
                    type="number"
                    min={1}
                    max={5}
                    value={row.quantity}
                    onChange={(event) =>
                      updateRow(row.key, { quantity: Number(event.target.value) })
                    }
                  />

                  <div className="self-center text-right text-sm text-slate-500">
                    {formatRupiah(product ? product.price * row.quantity : 0)}
                  </div>

                  <button
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
                    type="button"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length === 1}
                  >
                    Hapus
                  </button>
                </div>

                {rowErrors[index] && <p className="mt-1 text-xs text-red-600">{rowErrors[index]}</p>}
              </div>
            );
          })}

          <button
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-50"
            type="button"
            onClick={addRow}
          >
            Tambah produk
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-sm text-slate-500">Total</span>
          <strong className="text-lg">{formatRupiah(total)}</strong>
        </div>

        <div>
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            type="submit"
            disabled={submitting || loading}
          >
            {submitting ? 'Menyimpan...' : 'Simpan Order'}
          </button>
        </div>
      </form>
    </main>
  );
}
