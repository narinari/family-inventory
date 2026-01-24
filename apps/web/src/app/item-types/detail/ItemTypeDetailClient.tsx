'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getItemType, getItems, getTags, updateItemType, deleteItemType } from '@/lib/api';
import type { ItemType, Tag } from '@family-inventory/shared';

export default function ItemTypeDetailClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemTypeId = searchParams.get('id');

  const [itemType, setItemType] = useState<ItemType | null>(null);
  const [itemsCount, setItemsCount] = useState<number>(0);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    description: '',
    tags: [] as string[],
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && itemTypeId) {
      loadData();
    }
  }, [user, itemTypeId]);

  async function loadData() {
    if (!itemTypeId) return;
    try {
      const [itemTypeData, itemsData, tagsData] = await Promise.all([
        getItemType(itemTypeId),
        getItems({ typeId: itemTypeId }),
        getTags(),
      ]);

      if (!itemTypeData) {
        router.push('/settings/item-types');
        return;
      }

      setItemType(itemTypeData);
      setItemsCount(itemsData.length);
      setAllTags(tagsData);
      setFormData({
        name: itemTypeData.name,
        manufacturer: itemTypeData.manufacturer ?? '',
        description: itemTypeData.description ?? '',
        tags: itemTypeData.tags ?? [],
      });
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemType) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await updateItemType(itemType.id, {
        name: formData.name,
        manufacturer: formData.manufacturer || undefined,
        description: formData.description || undefined,
        tags: formData.tags,
      });

      if (result.success && result.data) {
        await loadData();
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

  async function handleDelete() {
    if (!itemType) return;
    if (!confirm(`「${itemType.name}」を削除しますか？`)) return;

    setDeleting(true);
    setError(null);

    try {
      const result = await deleteItemType(itemType.id);
      if (result.success) {
        router.push('/settings/item-types');
      } else {
        setError(result.error?.message ?? '削除に失敗しました');
      }
    } catch {
      setError('削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  }

  if (loading || !user || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!itemType) {
    return null;
  }

  const tagNames = (itemType.tags ?? [])
    .map((tagId) => allTags.find((t) => t.id === tagId)?.name)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/settings/item-types" className="text-primary-600 hover:text-primary-700">
            ← アイテム種別一覧に戻る
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{itemType.name}</h1>
            {!editing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                >
                  編集
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || itemsCount > 0}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title={itemsCount > 0 ? 'この種別のアイテムがあるため削除できません' : undefined}
                >
                  {deleting ? '削除中...' : '削除'}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}

          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メーカー
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, manufacturer: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タグ
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <label key={tag.id} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.tags.includes(tag.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag.id] }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              tags: prev.tags.filter((t) => t !== tag.id),
                            }));
                          }
                        }}
                        className="mr-1"
                      />
                      <span className="text-sm text-gray-700">{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: itemType.name,
                      manufacturer: itemType.manufacturer ?? '',
                      description: itemType.description ?? '',
                      tags: itemType.tags ?? [],
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
              {itemType.manufacturer && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">メーカー</dt>
                  <dd className="mt-1 text-gray-900">{itemType.manufacturer}</dd>
                </div>
              )}
              {itemType.description && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">説明</dt>
                  <dd className="mt-1 text-gray-900 whitespace-pre-wrap">{itemType.description}</dd>
                </div>
              )}
              {tagNames.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">タグ</dt>
                  <dd className="mt-2">
                    <div className="flex flex-wrap gap-2">
                      {tagNames.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 border border-purple-300"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">この種別のアイテム</dt>
                <dd className="mt-1">
                  <Link
                    href={`/items?typeId=${itemType.id}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {itemsCount}件のアイテム
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">登録日</dt>
                <dd className="mt-1 text-gray-900">
                  {new Date(itemType.createdAt).toLocaleDateString('ja-JP')}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </main>
    </div>
  );
}
