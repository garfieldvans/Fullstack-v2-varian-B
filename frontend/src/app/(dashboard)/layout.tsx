'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearToken, getToken } from '@/lib/api';

const navItem = 'pb-1 text-sm text-slate-500 hover:text-slate-800';
const navItemActive = 'border-b-2 border-blue-600 pb-1 text-sm text-slate-900';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getToken()) {
      setReady(true);
      return;
    }

    router.replace('/login');
  }, [router]);

  if (!ready) {
    return null;
  }

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
          <span className="text-[15px] font-semibold">Order App</span>

          <nav className="flex flex-1 gap-5">
            <Link
              className={pathname.startsWith('/products') ? navItemActive : navItem}
              href="/products"
            >
              Produk
            </Link>
            <Link className={pathname.startsWith('/orders') ? navItemActive : navItem} href="/orders">
              Order
            </Link>
          </nav>

          <button
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-50"
            type="button"
            onClick={handleLogout}
          >
            Keluar
          </button>
        </div>
      </header>

      {children}
    </div>
  );
}
