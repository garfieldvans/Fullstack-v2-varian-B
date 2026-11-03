import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Order App',
  description: 'Kelola produk, pelanggan, dan order',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-800 antialiased">{children}</body>
    </html>
  );
}
