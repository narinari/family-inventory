'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { updateProfile } from '@/lib/api';

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('表示名を入力してください');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateProfile({ displayName: displayName.trim() });
      if (result.success) {
        await refreshUser();
        setSuccess(true);
      } else {
        setError(result.error?.message ?? '更新に失敗しました');
      }
    } catch {
      setError('更新に失敗しました');
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
          <Link href="/settings" className="text-primary-600 hover:text-primary-700">
            ← 設定に戻る
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">プロフィール編集</h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
              プロフィールを更新しました
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-20 h-20 rounded-full" />
              ) : (
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-bold text-2xl">
                    {user.displayName?.charAt(0) || '?'}
                  </span>
                </div>
              )}
              <div className="text-sm text-gray-500">
                プロフィール画像はGoogleアカウントの画像が使用されます
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                表示名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="表示名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                メールアドレスはGoogleアカウントに紐付いているため変更できません
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Link
                href="/settings"
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? '更新中...' : '保存する'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
