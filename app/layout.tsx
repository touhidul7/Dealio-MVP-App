import './globals.css';
import type { Metadata } from 'next';
import { ToastProvider } from '@/components/toast-provider';
import { ToastQueryListener } from '@/components/toast-query-listener';

export const metadata: Metadata = {
  title: 'Dealio Marketplace MVP',
  description: 'Internal marketplace and buyer matching engine'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
        <ToastQueryListener />
        <ToastProvider />
      </body>
    </html>
  );
}
