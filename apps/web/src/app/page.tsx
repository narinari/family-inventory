'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getItems, getBoxes, getWishlist, getItemTypes } from '@/lib/api';
import type { Item, Box, Wishlist, ItemType } from '@family-inventory/shared';

interface DashboardData {
  items: Item[];
  boxes: Box[];
  wishlist: Wishlist[];
  itemTypes: ItemType[];
  loading: boolean;
}

export default function HomePage() {
  const { user, loading, needsInviteCode } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    items: [],
    boxes: [],
    wishlist: [],
    itemTypes: [],
    loading: true,
  });

  useEffect(() => {
    if (!loading) {
      if (!user && !needsInviteCode) {
        router.push('/login');
      } else if (needsInviteCode) {
        router.push('/login');
      }
    }
  }, [user, loading, needsInviteCode, router]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  async function loadDashboardData() {
    try {
      const [items, boxes, wishlist, itemTypes] = await Promise.all([
        getItems({ status: 'owned' }),
        getBoxes(),
        getWishlist({ status: 'pending' }),
        getItemTypes(),
      ]);
      setData({ items, boxes, wishlist, itemTypes, loading: false });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setData((prev) => ({ ...prev, loading: false }));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const ownedItemCount = data.items.length;
  const boxCount = data.boxes.length;
  const pendingWishlistCount = data.wishlist.length;

  const recentItems = [...data.items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const highPriorityWishlist = data.wishlist
    .filter((w) => w.priority === 'high')
    .slice(0, 3);

  const itemTypeMap = new Map(data.itemTypes.map((t) => [t.id, t]));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {user.displayName}
          </h1>
          <p className="text-gray-600 mt-1">今日も持ち物を整理しましょう</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickActionCard icon="📦" label="持ち物を登録" href="/items/new" />
          <QuickActionCard icon="🔍" label="持ち物を探す" href="/items" />
          <QuickActionCard icon="📝" label="欲しい物リスト" href="/wishlist" />
          <QuickActionCard icon="⚙️" label="設定" href="/settings" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="持ち物"
            value={data.loading ? '--' : String(ownedItemCount)}
            unit="点"
            href="/items"
          />
          <StatCard
            title="箱"
            value={data.loading ? '--' : String(boxCount)}
            unit="個"
            href="/boxes"
          />
          <StatCard
            title="欲しい物"
            value={data.loading ? '--' : String(pendingWishlistCount)}
            unit="件"
            href="/wishlist"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">最近追加した持ち物</h2>
              <Link href="/items" className="text-sm text-primary-600 hover:text-primary-700">
                すべて見る
              </Link>
            </div>
            {data.loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : recentItems.length > 0 ? (
              <ul className="space-y-3">
                {recentItems.map((item) => {
                  const itemType = itemTypeMap.get(item.itemTypeId);
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/items/detail?id=${item.id}`}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {itemType?.name ?? '不明なアイテム'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-gray-500 text-center py-8">
                まだ持ち物が登録されていません
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">優先度の高い欲しい物</h2>
              <Link href="/wishlist" className="text-sm text-primary-600 hover:text-primary-700">
                すべて見る
              </Link>
            </div>
            {data.loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : highPriorityWishlist.length > 0 ? (
              <ul className="space-y-3">
                {highPriorityWishlist.map((wish) => (
                  <li key={wish.id}>
                    <Link
                      href={`/wishlist/detail?id=${wish.id}`}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{wish.name}</p>
                        {wish.priceRange && (
                          <p className="text-sm text-gray-500">{wish.priceRange}</p>
                        )}
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        高
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : pendingWishlistCount > 0 ? (
              <div className="text-gray-500 text-center py-8">
                優先度の高いアイテムはありません
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                欲しい物リストは空です
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function QuickActionCard({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  );
}

function StatCard({ title, value, unit, href }: { title: string; value: string; unit: string; href?: string }) {
  const content = (
    <>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">
        {value}
        <span className="text-lg font-normal text-gray-500 ml-1">{unit}</span>
      </p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow block">
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {content}
    </div>
  );
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
