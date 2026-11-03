'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, request, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await request<{ token: string }>('/login', {
        method: 'POST',
        body: { email, password },
      });

      setToken(response.data.token);
      router.replace('/orders');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal login, coba lagi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-7 shadow-sm"
        onSubmit={handleSubmit}
      >
        <h1 className="mb-5 text-lg font-semibold">Masuk</h1>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </div>
      </form>
    </div>
  );
}
