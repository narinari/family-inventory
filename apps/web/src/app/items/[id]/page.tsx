'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getItem, getItemTypes, getBoxes, getMembers, updateItem } from '@/lib/api';
import type { Item, ItemType, Box, User } from '@family-inventory/shared';

export default function ItemDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  const [item, setItem] = useState<Item | null>(null);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ownerId: '',
    boxId: '',
    memo: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && itemId) {
      loadData();
    }
  }, [user, itemId]);

  async function loadData() {
    try {
      const [itemData, typesData, boxesData, membersData] = await Promise.all([
        getItem(itemId),
        getItemTypes(),
        getBoxes(),
        getMembers(),
      ]);

      if (!itemData) {
        router.push('/items');
        return;
      }

      setItem(itemData);
      setItemTypes(typesData);
      setBoxes(boxesData);
      setMembers(membersData);
      setFormData({
        ownerId: itemData.ownerId,
        boxId: itemData.boxId ?? '',
        memo: itemData.memo ?? '',
      });
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await updateItem(item.id, {
        ownerId: formData.ownerId || undefined,
        boxId: formData.boxId || null,
        memo: formData.memo || undefined,
      });

      if (result.success && result.data) {
        setItem(result.data.item);
        setEditing(false);
      } else {
        setError(result.error?.message ?? '更新に失敗しました');
      }
    } catch {
      setError('更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!item) {
    return null;
  }

  const itemType = itemTypes.find((t) => t.id === item.itemTypeId);
  const box = item.boxId ? boxes.find((b) => b.id === item.boxId) : null;
  const owner = members.find((m) => m.id === item.ownerId);

  const statusConfig = {
    owned: { label: '所有中', className: 'bg-green-100 text-green-800' },
    consumed: { label: '消費済', className: 'bg-gray-100 text-gray-800' },
    given: { label: '譲渡済', className: 'bg-blue-100 text-blue-800' },
    sold: { label: '売却済', className: 'bg-yellow-100 text-yellow-800' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/items" className="text-primary-600 hover:text-primary-700">
            ← 持ち物一覧に戻る
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {itemType?.name ?? '不明なアイテム'}
              </h1>
              <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium mt-2 ${statusConfig[item.status].className}`}>
                {statusConfig[item.status].label}
              </span>
            </div>
            {item.status === 'owned' && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg"
              >
                編集
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}

          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  所有者
                </label>
                <select
                  value={formData.ownerId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ownerId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  保管場所（箱）
                </label>
                <select
                  value={formData.boxId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, boxId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">未設定</option>
                  {boxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メモ
                </label>
                <textarea
                  value={formData.memo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, memo: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      ownerId: item.ownerId,
                      boxId: item.boxId ?? '',
                      memo: item.memo ?? '',
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {submitting ? '更新中...' : '保存する'}
                </button>
              </div>
            </form>
          ) : (
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">アイテム種別</dt>
                <dd className="mt-1 text-gray-900">{itemType?.name ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">所有者</dt>
                <dd className="mt-1 text-gray-900">{owner?.displayName ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">保管場所</dt>
                <dd className="mt-1 text-gray-900">{box?.name ?? '未設定'}</dd>
              </div>
              {item.memo && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">メモ</dt>
                  <dd className="mt-1 text-gray-900 whitespace-pre-wrap">{item.memo}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">登録日</dt>
                <dd className="mt-1 text-gray-900">
                  {new Date(item.createdAt).toLocaleDateString('ja-JP')}
                </dd>
              </div>
              {item.status === 'consumed' && item.consumedAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">消費日</dt>
                  <dd className="mt-1 text-gray-900">
                    {new Date(item.consumedAt).toLocaleDateString('ja-JP')}
                  </dd>
                </div>
              )}
              {item.status === 'given' && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">譲渡先</dt>
                    <dd className="mt-1 text-gray-900">{item.givenTo ?? '-'}</dd>
                  </div>
                  {item.givenAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">譲渡日</dt>
                      <dd className="mt-1 text-gray-900">
                        {new Date(item.givenAt).toLocaleDateString('ja-JP')}
                      </dd>
                    </div>
                  )}
                </>
              )}
              {item.status === 'sold' && (
                <>
                  {item.soldTo && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">売却先</dt>
                      <dd className="mt-1 text-gray-900">{item.soldTo}</dd>
                    </div>
                  )}
                  {item.soldPrice !== undefined && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">売却価格</dt>
                      <dd className="mt-1 text-gray-900">{item.soldPrice.toLocaleString()}円</dd>
                    </div>
                  )}
                  {item.soldAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">売却日</dt>
                      <dd className="mt-1 text-gray-900">
                        {new Date(item.soldAt).toLocaleDateString('ja-JP')}
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          )}
        </div>
      </main>
    </div>
  );
}
