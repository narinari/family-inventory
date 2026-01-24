'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getLocationBoxes } from '@/lib/api';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { Location, Box } from '@family-inventory/shared';

export default function LocationDetailClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationId = searchParams.get('id');

  const [location, setLocation] = useState<Location | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && locationId) {
      loadData();
    }
  }, [user, locationId]);

  async function loadData() {
    if (!locationId) return;
    try {
      const data = await getLocationBoxes(locationId);

      if (!data) {
        router.push('/locations');
        return;
      }

      setLocation(data.location);
      setBoxes(data.boxes);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  if (loading || !user || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/locations" className="text-primary-600 hover:text-primary-700">
            ← 保管場所一覧に戻る
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{location.name}</h1>
          {location.address && (
            <p className="text-gray-600">{location.address}</p>
          )}
          {location.description && (
            <div className="text-gray-600 mt-2">
              <MarkdownRenderer content={location.description} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              保管されている箱 ({boxes.length}個)
            </h2>
          </div>

          {boxes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boxes.map((box) => (
                <Link
                  key={box.id}
                  href={`/boxes/detail?id=${box.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900">{box.name}</h3>
                  {box.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{box.description}</p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              この場所には箱がありません
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
