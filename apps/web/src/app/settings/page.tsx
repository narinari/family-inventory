'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { DiscordLinkButton } from '@/components/settings/DiscordLinkButton';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">設定</h1>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">プロフィール</h2>
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-bold text-xl">
                  {user.displayName?.charAt(0) || '?'}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{user.displayName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400 mt-1">
                {user.role === 'admin' ? '管理者' : 'メンバー'}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Discord 連携</h2>
          <p className="text-sm text-gray-500 mb-4">
            Discordと連携すると、Botから持ち物の管理ができるようになります。
          </p>
          <DiscordLinkButton
            onSuccess={() => setMessage({ type: 'success', text: 'Discord連携を解除しました' })}
            onError={(text) => setMessage({ type: 'error', text })}
          />
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">アカウント情報</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">ユーザーID</dt>
              <dd className="text-sm text-gray-900 font-mono">{user.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">ファミリーID</dt>
              <dd className="text-sm text-gray-900 font-mono">{user.familyId}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
