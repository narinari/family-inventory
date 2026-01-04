'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getItems, getItemTypes, getBoxes, getTags, getMembers, consumeItem, giveItem, sellItem } from '@/lib/api';
import type { Item, ItemType, Box, Tag, User, ItemStatus } from '@family-inventory/shared';

type StatusFilter = 'all' | ItemStatus;

export default function ItemsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('owned');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [includeInheritedTags, setIncludeInheritedTags] = useState(true);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionModal, setActionModal] = useState<{ item: Item; action: 'consume' | 'give' | 'sell' } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadItems = useCallback(async () => {
    try {
      const filter: {
        tags?: string[];
        includeInheritedTags?: boolean;
        ownerId?: string;
      } = {};
      if (selectedTags.length > 0) {
        filter.tags = selectedTags;
        filter.includeInheritedTags = includeInheritedTags;
      }
      if (selectedOwnerId) {
        filter.ownerId = selectedOwnerId;
      }
      const itemsData = await getItems(filter);
      setItems(itemsData);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  }, [selectedTags, includeInheritedTags, selectedOwnerId]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadItems();
    }
  }, [user, loadItems]);

  async function loadData() {
    try {
      const [typesData, boxesData, tagsData, membersData] = await Promise.all([
        getItemTypes(),
        getBoxes(),
        getTags(),
        getMembers(),
      ]);
      setItemTypes(typesData);
      setBoxes(boxesData);
      setAllTags(tagsData);
      setMembers(membersData);
    } catch (error) {
      console.error('Failed to load data:', error);
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

  const itemTypeMap = new Map(itemTypes.map((t) => [t.id, t]));
  const boxMap = new Map(boxes.map((b) => [b.id, b]));

  const filteredItems = items
    .filter((item) => statusFilter === 'all' || item.status === statusFilter)
    .filter((item) => {
      if (!searchQuery) return true;
      const itemType = itemTypeMap.get(item.itemTypeId);
      const searchLower = searchQuery.toLowerCase();
      return (
        itemType?.name.toLowerCase().includes(searchLower) ||
        item.memo?.toLowerCase().includes(searchLower) ||
        item.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  async function handleAction() {
    if (!actionModal) return;
    const { item, action } = actionModal;

    try {
      let result;
      if (action === 'consume') {
        result = await consumeItem(item.id);
      } else if (action === 'give') {
        const givenTo = (document.getElementById('givenTo') as HTMLInputElement)?.value;
        if (!givenTo) return;
        result = await giveItem(item.id, givenTo);
      } else if (action === 'sell') {
        const soldTo = (document.getElementById('soldTo') as HTMLInputElement)?.value;
        const soldPriceStr = (document.getElementById('soldPrice') as HTMLInputElement)?.value;
        const soldPrice = soldPriceStr ? parseInt(soldPriceStr, 10) : undefined;
        result = await sellItem(item.id, soldTo, soldPrice);
      }

      if (result?.success) {
        await loadItems();
        setActionModal(null);
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">持ち物一覧</h1>
          <Link
            href="/items/new"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + 新規登録
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">すべて</option>
              <option value="owned">所有中</option>
              <option value="consumed">消費済</option>
              <option value="given">譲渡済</option>
              <option value="sold">売却済</option>
            </select>
            <select
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全メンバー</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </div>

          {allTags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">タグで絞り込み</span>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={includeInheritedTags}
                    onChange={(e) => setIncludeInheritedTags(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  継承タグも含める
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTags(selectedTags.filter((id) => id !== tag.id));
                        } else {
                          setSelectedTags([...selectedTags, tag.id]);
                        }
                      }}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        isSelected
                          ? 'bg-primary-100 border-primary-500 text-primary-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
                {selectedTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    クリア
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {filteredItems.map((item) => {
                const itemType = itemTypeMap.get(item.itemTypeId);
                const box = item.boxId ? boxMap.get(item.boxId) : null;
                return (
                  <li key={item.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <Link href={`/items/detail?id=${item.id}`} className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {itemType?.name ?? '不明なアイテム'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <StatusBadge status={item.status} />
                              {box && (
                                <span className="text-xs text-gray-500">
                                  📦 {box.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                      {item.status === 'owned' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setActionModal({ item, action: 'consume' })}
                            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                          >
                            消費
                          </button>
                          <button
                            onClick={() => setActionModal({ item, action: 'give' })}
                            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                          >
                            譲渡
                          </button>
                          <button
                            onClick={() => setActionModal({ item, action: 'sell' })}
                            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                          >
                            売却
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            {searchQuery || statusFilter !== 'owned'
              ? '条件に一致する持ち物がありません'
              : '持ち物がまだ登録されていません'}
          </div>
        )}
      </main>

      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {actionModal.action === 'consume' && '消費済にする'}
              {actionModal.action === 'give' && '譲渡する'}
              {actionModal.action === 'sell' && '売却する'}
            </h3>
            <p className="text-gray-600 mb-4">
              「{itemTypeMap.get(actionModal.item.itemTypeId)?.name}」を
              {actionModal.action === 'consume' && '消費済にしますか？'}
              {actionModal.action === 'give' && '譲渡しますか？'}
              {actionModal.action === 'sell' && '売却しますか？'}
            </p>

            {actionModal.action === 'give' && (
              <input
                id="givenTo"
                type="text"
                placeholder="譲渡先"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              />
            )}

            {actionModal.action === 'sell' && (
              <div className="space-y-3 mb-4">
                <input
                  id="soldTo"
                  type="text"
                  placeholder="売却先（任意）"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  id="soldPrice"
                  type="number"
                  placeholder="売却価格（任意）"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleAction}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const config = {
    owned: { label: '所有中', className: 'bg-green-100 text-green-800' },
    consumed: { label: '消費済', className: 'bg-gray-100 text-gray-800' },
    given: { label: '譲渡済', className: 'bg-blue-100 text-blue-800' },
    sold: { label: '売却済', className: 'bg-yellow-100 text-yellow-800' },
  };
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
