'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getBoxes, getLocations, getItems } from '@/lib/api';
import type { Box, Location } from '@family-inventory/shared';

interface BoxWithStats extends Box {
  itemCount: number;
  lastVerifiedAt?: Date;
}

export default function InventoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [boxesByLocation, setBoxesByLocation] = useState<Map<string, BoxWithStats[]>>(new Map());
  const [unassignedBoxes, setUnassignedBoxes] = useState<BoxWithStats[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    try {
      const [boxesData, locationsData, itemsData] = await Promise.all([
        getBoxes(),
        getLocations(),
        getItems({ status: 'owned' }),
      ]);

      setLocations(locationsData);

      // 箱ごとのアイテム数と最終確認日を集計
      const boxStatsMap = new Map<string, { count: number; lastVerified?: Date }>();
      for (const item of itemsData) {
        if (item.boxId) {
          const stats = boxStatsMap.get(item.boxId) || { count: 0, lastVerified: undefined };
          stats.count++;
          if (item.lastVerifiedAt) {
            const itemVerified = new Date(item.lastVerifiedAt);
            if (!stats.lastVerified || itemVerified > stats.lastVerified) {
              stats.lastVerified = itemVerified;
            }
          }
          boxStatsMap.set(item.boxId, stats);
        }
      }

      // 箱にstatsを付与
      const boxesWithStats: BoxWithStats[] = boxesData.map((box) => {
        const stats = boxStatsMap.get(box.id);
        return {
          ...box,
          itemCount: stats?.count ?? 0,
          lastVerifiedAt: stats?.lastVerified,
        };
      });

      // 保管場所ごとにグループ化
      const grouped = new Map<string, BoxWithStats[]>();
      const unassigned: BoxWithStats[] = [];

      for (const box of boxesWithStats) {
        if (box.locationId) {
          const existing = grouped.get(box.locationId) || [];
          existing.push(box);
          grouped.set(box.locationId, existing);
        } else {
          unassigned.push(box);
        }
      }

      setBoxesByLocation(grouped);
      setUnassignedBoxes(unassigned);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  function formatLastVerified(date?: Date): string {
    if (!date) return '未確認';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '今日';
    if (days === 1) return '昨日';
    if (days < 7) return `${days}日前`;
    if (days < 30) return `${Math.floor(days / 7)}週間前`;
    return `${Math.floor(days / 30)}ヶ月前`;
  }

  function getVerifiedColor(date?: Date): string {
    if (!date) return 'text-red-600';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 7) return 'text-green-600';
    if (days < 30) return 'text-yellow-600';
    return 'text-red-600';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">棚卸</h1>
          <p className="text-gray-600 mt-1">箱を選択して中身を確認してください</p>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-8">
            {locations.map((location) => {
              const boxes = boxesByLocation.get(location.id) || [];
              if (boxes.length === 0) return null;

              return (
                <div key={location.id} className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>📍</span>
                    {location.name}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {boxes.map((box) => (
                      <BoxCard key={box.id} box={box} formatLastVerified={formatLastVerified} getVerifiedColor={getVerifiedColor} />
                    ))}
                  </div>
                </div>
              );
            })}

            {unassignedBoxes.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">未分類の箱</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unassignedBoxes.map((box) => (
                    <BoxCard key={box.id} box={box} formatLastVerified={formatLastVerified} getVerifiedColor={getVerifiedColor} />
                  ))}
                </div>
              </div>
            )}

            {locations.every((l) => (boxesByLocation.get(l.id) || []).length === 0) && unassignedBoxes.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                箱がまだ登録されていません。
                <Link href="/boxes" className="text-primary-600 hover:text-primary-700 ml-2">
                  箱を登録する
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function BoxCard({
  box,
  formatLastVerified,
  getVerifiedColor,
}: {
  box: BoxWithStats;
  formatLastVerified: (date?: Date) => string;
  getVerifiedColor: (date?: Date) => string;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{box.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{box.itemCount}点</p>
          <p className={`text-sm mt-1 ${getVerifiedColor(box.lastVerifiedAt)}`}>
            最終確認: {formatLastVerified(box.lastVerifiedAt)}
          </p>
        </div>
        <Link
          href={`/inventory/check?boxId=${box.id}`}
          className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          棚卸開始
        </Link>
      </div>
    </div>
  );
}
