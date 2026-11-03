'use client';

import { useEffect, useState } from 'react';
import { ApiError, request, type ApiMeta } from '@/lib/api';
import { formatRupiah } from '@/lib/format';
import type { Product } from '@/lib/types';

export default function ProductsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<ApiMeta>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');

    request<Product[]>(`/products?page=${page}&per_page=10&search=${encodeURIComponent(search)}`)
      .then((response) => {
        if (!active) return;

        setProducts(response.data);
        setMeta(response.meta);
      })
      .catch((err) => {
        if (!active) return;

        setError(err instanceof ApiError ? err.message : 'Gagal memuat produk');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, search]);

  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.per_page)) : 1;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Produk</h1>
        <p className="text-sm text-slate-500">Daftar produk beserta harga dan stok terkini.</p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <input
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Cari nama atau kode produk"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
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
              <th className="px-2 py-2.5 text-left font-semibold">Kode</th>
              <th className="px-2 py-2.5 text-left font-semibold">Nama</th>
              <th className="px-2 py-2.5 text-right font-semibold">Harga</th>
              <th className="px-2 py-2.5 text-right font-semibold">Stok</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-slate-100 last:border-0">
                <td className="px-2 py-2.5 font-mono">{product.product_code}</td>
                <td className="px-2 py-2.5">{product.name}</td>
                <td className="px-2 py-2.5 text-right">{formatRupiah(product.price)}</td>
                <td className="px-2 py-2.5 text-right">{product.stock}</td>
              </tr>
            ))}

            {!loading && products.length === 0 && (
              <tr>
                <td className="px-2 py-8 text-center text-slate-500" colSpan={4}>
                  Produk tidak ditemukan
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td className="px-2 py-8 text-center text-slate-500" colSpan={4}>
                  Memuat produk...
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
