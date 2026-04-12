'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getBoxItems, getItemTypes, getLocations } from '@/lib/api';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { QrCodeDisplay } from '@/components/qr/QrCodeDisplay';
import { BoxQrLabel } from '@/components/qr/BoxQrLabel';
import { getBoxQrUrl } from '@/lib/qr-utils';
import type { Box, Item, ItemType, Location } from '@family-inventory/shared';

export default function BoxDetailClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const boxId = searchParams.get('id');

  const [box, setBox] = useState<Box | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showLabel, setShowLabel] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && boxId) {
      loadData();
    }
  }, [user, boxId]);

  async function loadData() {
    if (!boxId) return;
    try {
      const [boxData, typesData, locationsData] = await Promise.all([
        getBoxItems(boxId),
        getItemTypes(),
        getLocations(),
      ]);

      if (!boxData) {
        router.push('/boxes');
        return;
      }

      setBox(boxData.box);
      setItems(boxData.items);
      setItemTypes(typesData);
      setLocations(locationsData);
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

  if (!box) {
    return null;
  }

  const itemTypeMap = new Map(itemTypes.map((t) => [t.id, t]));
  const location = box.locationId ? locations.find((l) => l.id === box.locationId) : null;
  const ownedItems = items.filter((item) => item.status === 'owned');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/boxes" className="text-primary-600 hover:text-primary-700">
            ← 箱一覧に戻る
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{box.name}</h1>
          {location && (
            <p className="text-gray-600">📍 {location.name}</p>
          )}
          {box.description && (
            <div className="text-gray-600 mt-2">
              <MarkdownRenderer content={box.description} />
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
            <QrCodeDisplay value={getBoxQrUrl(box.id)} size={80} />
            <div>
              <p className="text-sm text-gray-500">この箱のQRコード</p>
              <button
                onClick={() => setShowLabel(true)}
                className="mt-1 text-sm text-primary-600 hover:text-primary-700"
              >
                ラベルを印刷
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              中身一覧 ({ownedItems.length}点)
            </h2>
          </div>

          {ownedItems.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {ownedItems.map((item) => {
                const itemType = itemTypeMap.get(item.itemTypeId);
                return (
                  <li key={item.id} className="py-3">
                    <Link href={`/items/detail?id=${item.id}`} className="flex items-center justify-between hover:text-primary-600">
                      <span className="font-medium">{itemType?.name ?? '不明なアイテム'}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString('ja-JP')}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-8">
              この箱には何も入っていません
            </p>
          )}
        </div>
      </main>

      {showLabel && (
        <BoxQrLabel
          box={box}
          locationName={location?.name}
          onClose={() => setShowLabel(false)}
        />
      )}
    </div>
  );
}
