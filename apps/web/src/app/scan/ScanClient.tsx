'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { parseBoxIdFromUrl } from '@/lib/qr-utils';

const QrScanner = dynamic(
  () => import('@/components/qr/QrScanner').then((mod) => ({ default: mod.QrScanner })),
  { ssr: false },
);

export default function ScanClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  function handleScan(decodedText: string) {
    const boxId = parseBoxIdFromUrl(decodedText);
    if (boxId) {
      setScanning(false);
      router.push(`/boxes/detail?id=${boxId}`);
    } else {
      setError('この QR コードは箱のコードではありません');
      setTimeout(() => setError(null), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">QRコードスキャン</h1>

        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <p className="text-gray-600 mb-6">
            箱に貼られたQRコードをスキャンして、中身を確認できます。
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => setScanning(true)}
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-lg"
          >
            スキャン開始
          </button>
        </div>
      </main>

      <QrScanner
        active={scanning}
        onScan={handleScan}
        onClose={() => setScanning(false)}
      />
    </div>
  );
}
