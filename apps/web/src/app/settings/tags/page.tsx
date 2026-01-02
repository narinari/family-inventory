'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getTags, createTag, deleteTag } from '@/lib/api';
import type { Tag } from '@family-inventory/shared';

export default function TagsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Tag | null>(null);
  const [newTagName, setNewTagName] = useState('');
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
      const data = await getTags();
      setTags(data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) {
      setError('タグ名を入力してください');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await createTag({ name: newTagName.trim() });
      if (result.success) {
        await loadData();
        setNewTagName('');
        setShowCreate(false);
      } else {
        setError(result.error?.message ?? '作成に失敗しました');
      }
    } catch {
      setError('作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;

    try {
      const result = await deleteTag(deleteConfirm.id);
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
          <h1 className="text-2xl font-bold text-gray-900">タグ</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + 新規作成
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
        )}

        {showCreate && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="タグ名"
                autoFocus
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? '作成中...' : '作成'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewTagName(''); setError(null); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </button>
            </form>
          </div>
        )}

        {dataLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : tags.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-wrap gap-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
                >
                  <span className="font-medium text-gray-900">{tag.name}</span>
                  <button
                    onClick={() => setDeleteConfirm(tag)}
                    className="text-gray-400 hover:text-red-600"
                    aria-label="削除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            タグがまだ登録されていません
          </div>
        )}
      </main>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">タグを削除</h3>
            <p className="text-gray-600 mb-4">
              「{deleteConfirm.name}」を削除しますか？
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
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
