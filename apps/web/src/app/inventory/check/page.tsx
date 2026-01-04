'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getBoxItems, getItemTypes, verifyItem, batchVerifyItems } from '@/lib/api';
import type { Box, Item, ItemType } from '@family-inventory/shared';

interface ItemWithVerifyState extends Item {
  isVerified: boolean;
  isVerifying: boolean;
}

export default function InventoryCheckPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const boxId = searchParams.get('boxId');

  const [box, setBox] = useState<Box | null>(null);
  const [items, setItems] = useState<ItemWithVerifyState[]>([]);
  const [itemTypes, setItemTypes] = useState<Map<string, ItemType>>(new Map());
  const [dataLoading, setDataLoading] = useState(true);
  const [batchVerifying, setBatchVerifying] = useState(false);

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
      const [boxData, itemTypesData] = await Promise.all([
        getBoxItems(boxId),
        getItemTypes(),
      ]);

      if (!boxData) {
        router.push('/inventory');
        return;
      }

      setBox(boxData.box);
      setItemTypes(new Map(itemTypesData.map((t) => [t.id, t])));

      // owned のアイテムのみをフィルタ
      const ownedItems = boxData.items.filter((item) => item.status === 'owned');
      setItems(
        ownedItems.map((item) => ({
          ...item,
          isVerified: false,
          isVerifying: false,
        }))
      );
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleVerifyItem(itemId: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isVerifying: true } : item
      )
    );

    try {
      const result = await verifyItem(itemId);
      if (result.success && result.data) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, ...result.data!.item, isVerified: true, isVerifying: false }
              : item
          )
        );
      } else {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, isVerifying: false } : item
          )
        );
      }
    } catch (err) {
      console.error('Failed to verify item:', err);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, isVerifying: false } : item
        )
      );
    }
  }

  async function handleBatchVerify() {
    const unverifiedIds = items.filter((item) => !item.isVerified).map((item) => item.id);
    if (unverifiedIds.length === 0) return;

    setBatchVerifying(true);
    try {
      const result = await batchVerifyItems(unverifiedIds);
      if (result.success && result.data) {
        const verifiedIds = new Set(result.data.items.map((item) => item.id));
        setItems((prev) =>
          prev.map((item) =>
            verifiedIds.has(item.id) ? { ...item, isVerified: true } : item
          )
        );
      }
    } catch (err) {
      console.error('Failed to batch verify:', err);
    } finally {
      setBatchVerifying(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const verifiedCount = items.filter((item) => item.isVerified).length;
  const totalCount = items.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/inventory" className="text-primary-600 hover:text-primary-700">
            ← 棚卸一覧に戻る
          </Link>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : box ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{box.name}</h1>
                  <p className="text-gray-600 mt-1">
                    確認済み: {verifiedCount} / {totalCount}
                  </p>
                </div>
                {totalCount > 0 && verifiedCount < totalCount && (
                  <button
                    onClick={handleBatchVerify}
                    disabled={batchVerifying}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {batchVerifying ? '処理中...' : '全て確認済みにする'}
                  </button>
                )}
              </div>

              {totalCount === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  この箱にはアイテムがありません
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => {
                    const itemType = itemTypes.get(item.itemTypeId);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          item.isVerified
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {item.isVerified ? '✅' : '⬜'}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">
                              {itemType?.name ?? '不明なアイテム'}
                            </p>
                            {item.memo && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {item.memo}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!item.isVerified && (
                            <button
                              onClick={() => handleVerifyItem(item.id)}
                              disabled={item.isVerifying}
                              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              {item.isVerifying ? '...' : '確認'}
                            </button>
                          )}
                          <Link
                            href={`/items/detail?id=${item.id}`}
                            className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm"
                          >
                            編集
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <Link
                href={`/items/new?boxId=${box.id}`}
                className="inline-flex items-center px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                + 登録されていないものを追加
              </Link>
            </div>

            {verifiedCount === totalCount && totalCount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <span className="text-4xl mb-2 block">🎉</span>
                <p className="text-green-800 font-medium">
                  この箱の棚卸が完了しました！
                </p>
                <Link
                  href="/inventory"
                  className="inline-block mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  次の箱へ
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            箱が見つかりません
          </div>
        )}
      </main>
    </div>
  );
}
