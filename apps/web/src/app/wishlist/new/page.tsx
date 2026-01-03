'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { TagSelector } from '@/components/common/TagSelector';
import { getMembers, getTags, createWishlistItem } from '@/lib/api';
import type { User, Priority, Tag } from '@family-inventory/shared';

export default function NewWishlistPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    requesterId: '',
    priority: 'medium' as Priority,
    priceRange: '',
    url: '',
    memo: '',
    tagIds: [] as string[],
  });

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
      const [membersData, tagsData] = await Promise.all([
        getMembers(),
        getTags(),
      ]);
      setMembers(membersData);
      setTags(tagsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
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
      const result = await createWishlistItem({
        name: formData.name.trim(),
        requesterId: formData.requesterId || undefined,
        priority: formData.priority,
        priceRange: formData.priceRange.trim() || undefined,
        url: formData.url.trim() || undefined,
        memo: formData.memo.trim() || undefined,
        tags: formData.tagIds,
      });

      if (result.success) {
        router.push('/wishlist');
      } else {
        setError(result.error?.message ?? '追加に失敗しました');
      }
    } catch {
      setError('追加に失敗しました');
    } finally {
      setSubmitting(false);
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
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/wishlist" className="text-primary-600 hover:text-primary-700">
            ← 欲しい物リストに戻る
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">欲しい物を追加</h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="欲しいものの名前"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                優先度
              </label>
              <div className="flex gap-4">
                {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={formData.priority === p}
                      onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as Priority }))}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700">
                      {p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                リクエスター
              </label>
              {dataLoading ? (
                <div className="animate-pulse h-10 bg-gray-200 rounded-lg" />
              ) : (
                <select
                  value={formData.requesterId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, requesterId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">自分</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                価格帯
              </label>
              <input
                type="text"
                value={formData.priceRange}
                onChange={(e) => setFormData((prev) => ({ ...prev, priceRange: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="例: 1,000〜3,000円"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://..."
              />
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
                placeholder="メモを入力..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タグ
              </label>
              <TagSelector
                availableTags={tags}
                selectedTagIds={formData.tagIds}
                onChange={(tagIds) => setFormData((prev) => ({ ...prev, tagIds }))}
                loading={dataLoading}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Link
                href="/wishlist"
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? '追加中...' : '追加する'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
