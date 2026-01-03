'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { TagSelector } from '@/components/common/TagSelector';
import { getItemTypes, getTags, createItemType, updateItemType, deleteItemType } from '@/lib/api';
import type { ItemType, Tag } from '@family-inventory/shared';

export default function ItemTypesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; itemType?: ItemType } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ItemType | null>(null);
  const [formData, setFormData] = useState({ name: '', manufacturer: '', description: '', tagIds: [] as string[] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const [itemTypesData, tagsData] = await Promise.all([getItemTypes(), getTags()]);
      setItemTypes(itemTypesData);
      setTags(tagsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  function openCreateModal() {
    setFormData({ name: '', manufacturer: '', description: '', tagIds: [] });
    setError(null);
    setModal({ mode: 'create' });
  }

  function openEditModal(itemType: ItemType) {
    setFormData({
      name: itemType.name,
      manufacturer: itemType.manufacturer ?? '',
      description: itemType.description ?? '',
      tagIds: itemType.tags ?? [],
    });
    setError(null);
    setModal({ mode: 'edit', itemType });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('名前を入力してください');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const input = {
        name: formData.name.trim(),
        manufacturer: formData.manufacturer.trim() || undefined,
        description: formData.description.trim() || undefined,
        tags: formData.tagIds.length > 0 ? formData.tagIds : undefined,
      };

      let result;
      if (modal?.mode === 'create') {
        result = await createItemType(input);
      } else if (modal?.itemType) {
        result = await updateItemType(modal.itemType.id, input);
      }

      if (result?.success) {
        await loadData();
        setModal(null);
      } else {
        setError(result?.error?.message ?? '保存に失敗しました');
      }
    } catch {
      setError('保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;

    try {
      const result = await deleteItemType(deleteConfirm.id);
      if (result.success) {
        await loadData();
        setDeleteConfirm(null);
      } else {
        setError(result.error?.message ?? '削除に失敗しました');
      }
    } catch {
      setError('削除に失敗しました');
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/settings" className="text-primary-600 hover:text-primary-700">
            ← 設定に戻る
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">アイテム種別</h1>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + 新規作成
          </button>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : itemTypes.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {itemTypes.map((itemType) => (
                <li key={itemType.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{itemType.name}</p>
                      {itemType.manufacturer && (
                        <p className="text-sm text-gray-500">{itemType.manufacturer}</p>
                      )}
                      {itemType.description && (
                        <p className="text-sm text-gray-600 mt-1">{itemType.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(itemType)}
                        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(itemType)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            アイテム種別がまだ登録されていません
          </div>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {modal.mode === 'create' ? 'アイテム種別を作成' : 'アイテム種別を編集'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="アイテム種別名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メーカー
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, manufacturer: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="メーカー名（任意）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="説明（任意）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タグ
                </label>
                <TagSelector
                  availableTags={tags}
                  selectedTagIds={formData.tagIds}
                  onChange={(tagIds) => setFormData((prev) => ({ ...prev, tagIds }))}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">アイテム種別を削除</h3>
            <p className="text-gray-600 mb-4">
              「{deleteConfirm.name}」を削除しますか？この種別を使用している持ち物がある場合は削除できません。
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteConfirm(null); setError(null); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
