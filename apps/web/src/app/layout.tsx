import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '持ち物管理 - Family Inventory',
  description: '家族で共有する持ち物管理システム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={notoSansJP.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
