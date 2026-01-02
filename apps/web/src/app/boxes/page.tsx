'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getBoxes, getLocations, createBox, updateBox, deleteBox } from '@/lib/api';
import type { Box, Location } from '@family-inventory/shared';

export default function BoxesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; box?: Box } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Box | null>(null);
  const [formData, setFormData] = useState({ name: '', locationId: '', description: '' });
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
      const [boxesData, locationsData] = await Promise.all([getBoxes(), getLocations()]);
      setBoxes(boxesData);
      setLocations(locationsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  function openCreateModal() {
    setFormData({ name: '', locationId: '', description: '' });
    setError(null);
    setModal({ mode: 'create' });
  }

  function openEditModal(box: Box) {
    setFormData({
      name: box.name,
      locationId: box.locationId ?? '',
      description: box.description ?? '',
    });
    setError(null);
    setModal({ mode: 'edit', box });
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
        locationId: formData.locationId || undefined,
        description: formData.description.trim() || undefined,
      };

      let result;
      if (modal?.mode === 'create') {
        result = await createBox(input);
      } else if (modal?.box) {
        result = await updateBox(modal.box.id, input);
      }

      if (result?.success) {
        await loadData();
        setModal(null);
      } else {
        setError(result?.error?.message ?? '保存に失敗しました');
      }
    } catch (err) {
      setError('保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;

    try {
      const result = await deleteBox(deleteConfirm.id);
      if (result.success) {
        await loadData();
        setDeleteConfirm(null);
      } else {
        setError(result.error?.message ?? '削除に失敗しました');
      }
    } catch (err) {
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

  const locationMap = new Map(locations.map((l) => [l.id, l]));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">箱一覧</h1>
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
        ) : boxes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boxes.map((box) => {
              const location = box.locationId ? locationMap.get(box.locationId) : null;
              return (
                <div key={box.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                  <Link href={`/boxes/${box.id}`} className="block">
                    <h3 className="font-semibold text-gray-900">{box.name}</h3>
                    {location && (
                      <p className="text-sm text-gray-500 mt-1">📍 {location.name}</p>
                    )}
                    {box.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{box.description}</p>
                    )}
                  </Link>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openEditModal(box)}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(box)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            箱がまだ登録されていません
          </div>
        )}

        <div className="mt-8">
          <Link href="/locations" className="text-primary-600 hover:text-primary-700">
            保管場所の管理 →
          </Link>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {modal.mode === 'create' ? '箱を作成' : '箱を編集'}
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
                  placeholder="箱の名前"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  保管場所
                </label>
                <select
                  value={formData.locationId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, locationId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">未設定</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
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
                  placeholder="箱の説明"
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
            <h3 className="text-lg font-semibold mb-2">箱を削除</h3>
            <p className="text-gray-600 mb-4">
              「{deleteConfirm.name}」を削除しますか？この操作は取り消せません。
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
