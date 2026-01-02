'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getWishlistItem, getMembers, updateWishlistItem } from '@/lib/api';
import type { Wishlist, User, Priority } from '@family-inventory/shared';

export default function WishlistDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const wishlistId = params.id as string;

  const [wishlistItem, setWishlistItem] = useState<Wishlist | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    requesterId: '',
    priority: 'medium' as Priority,
    priceRange: '',
    url: '',
    memo: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && wishlistId) {
      loadData();
    }
  }, [user, wishlistId]);

  async function loadData() {
    try {
      const [wishlistData, membersData] = await Promise.all([
        getWishlistItem(wishlistId),
        getMembers(),
      ]);

      if (!wishlistData) {
        router.push('/wishlist');
        return;
      }

      setWishlistItem(wishlistData);
      setMembers(membersData);
      setFormData({
        name: wishlistData.name,
        requesterId: wishlistData.requesterId,
        priority: wishlistData.priority,
        priceRange: wishlistData.priceRange ?? '',
        url: wishlistData.url ?? '',
        memo: wishlistData.memo ?? '',
      });
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wishlistItem || !formData.name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await updateWishlistItem(wishlistItem.id, {
        name: formData.name.trim(),
        requesterId: formData.requesterId || undefined,
        priority: formData.priority,
        priceRange: formData.priceRange.trim() || undefined,
        url: formData.url.trim() || undefined,
        memo: formData.memo.trim() || undefined,
      });

      if (result.success && result.data) {
        setWishlistItem(result.data.wishlist);
        setEditing(false);
      } else {
        setError(result.error?.message ?? '更新に失敗しました');
      }
    } catch (err) {
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

  if (!wishlistItem) {
    return null;
  }

  const requester = members.find((m) => m.id === wishlistItem.requesterId);

  const statusConfig = {
    pending: { label: '検討中', className: 'bg-blue-100 text-blue-800' },
    purchased: { label: '購入済', className: 'bg-green-100 text-green-800' },
    cancelled: { label: '見送り', className: 'bg-gray-100 text-gray-800' },
  };

  const priorityConfig = {
    high: { label: '高', className: 'bg-red-100 text-red-800' },
    medium: { label: '中', className: 'bg-yellow-100 text-yellow-800' },
    low: { label: '低', className: 'bg-gray-100 text-gray-800' },
  };

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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{wishlistItem.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${statusConfig[wishlistItem.status].className}`}>
                  {statusConfig[wishlistItem.status].label}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${priorityConfig[wishlistItem.priority].className}`}>
                  優先度: {priorityConfig[wishlistItem.priority].label}
                </span>
              </div>
            </div>
            {wishlistItem.status === 'pending' && !editing && (
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
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                <select
                  value={formData.requesterId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, requesterId: e.target.value }))}
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
                  価格帯
                </label>
                <input
                  type="text"
                  value={formData.priceRange}
                  onChange={(e) => setFormData((prev) => ({ ...prev, priceRange: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: wishlistItem.name,
                      requesterId: wishlistItem.requesterId,
                      priority: wishlistItem.priority,
                      priceRange: wishlistItem.priceRange ?? '',
                      url: wishlistItem.url ?? '',
                      memo: wishlistItem.memo ?? '',
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
                <dt className="text-sm font-medium text-gray-500">リクエスター</dt>
                <dd className="mt-1 text-gray-900">{requester?.displayName ?? '-'}</dd>
              </div>
              {wishlistItem.priceRange && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">価格帯</dt>
                  <dd className="mt-1 text-gray-900">{wishlistItem.priceRange}</dd>
                </div>
              )}
              {wishlistItem.url && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">URL</dt>
                  <dd className="mt-1">
                    <a
                      href={wishlistItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 break-all"
                    >
                      {wishlistItem.url}
                    </a>
                  </dd>
                </div>
              )}
              {wishlistItem.memo && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">メモ</dt>
                  <dd className="mt-1 text-gray-900 whitespace-pre-wrap">{wishlistItem.memo}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">登録日</dt>
                <dd className="mt-1 text-gray-900">
                  {new Date(wishlistItem.createdAt).toLocaleDateString('ja-JP')}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </main>
    </div>
  );
}
