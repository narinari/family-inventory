'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getLocations, getBoxes, createLocation, updateLocation, deleteLocation } from '@/lib/api';
import type { Location, Box } from '@family-inventory/shared';

export default function LocationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; location?: Location } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Location | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', description: '' });
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
      const [locationsData, boxesData] = await Promise.all([getLocations(), getBoxes()]);
      setLocations(locationsData);
      setBoxes(boxesData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  function openCreateModal() {
    setFormData({ name: '', address: '', description: '' });
    setError(null);
    setModal({ mode: 'create' });
  }

  function openEditModal(location: Location) {
    setFormData({
      name: location.name,
      address: location.address ?? '',
      description: location.description ?? '',
    });
    setError(null);
    setModal({ mode: 'edit', location });
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
        address: formData.address.trim() || undefined,
        description: formData.description.trim() || undefined,
      };

      let result;
      if (modal?.mode === 'create') {
        result = await createLocation(input);
      } else if (modal?.location) {
        result = await updateLocation(modal.location.id, input);
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
      const result = await deleteLocation(deleteConfirm.id);
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

  const boxCountByLocation = new Map<string, number>();
  boxes.forEach((box) => {
    if (box.locationId) {
      boxCountByLocation.set(box.locationId, (boxCountByLocation.get(box.locationId) ?? 0) + 1);
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">保管場所一覧</h1>
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
        ) : locations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((location) => {
              const boxCount = boxCountByLocation.get(location.id) ?? 0;
              return (
                <div key={location.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                  <Link href={`/locations/${location.id}`} className="block">
                    <h3 className="font-semibold text-gray-900">{location.name}</h3>
                    {location.address && (
                      <p className="text-sm text-gray-500 mt-1">{location.address}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">📦 {boxCount}個の箱</p>
                    {location.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{location.description}</p>
                    )}
                  </Link>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openEditModal(location)}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(location)}
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
            保管場所がまだ登録されていません
          </div>
        )}

        <div className="mt-8">
          <Link href="/boxes" className="text-primary-600 hover:text-primary-700">
            箱の管理 →
          </Link>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {modal.mode === 'create' ? '保管場所を作成' : '保管場所を編集'}
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
                  placeholder="保管場所の名前"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  住所
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="住所（任意）"
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
                  placeholder="保管場所の説明"
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
            <h3 className="text-lg font-semibold mb-2">保管場所を削除</h3>
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
