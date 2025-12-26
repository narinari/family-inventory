'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';

export default function HomePage() {
  const { user, loading, needsInviteCode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user && !needsInviteCode) {
        router.push('/login');
      } else if (needsInviteCode) {
        router.push('/login');
      }
    }
  }, [user, loading, needsInviteCode, router]);

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
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            こんにちは、{user.displayName}さん
          </h1>
          <p className="text-gray-600 mt-1">今日も持ち物を整理しましょう</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickActionCard icon="📦" label="持ち物を登録" href="/items/new" />
          <QuickActionCard icon="🔍" label="持ち物を探す" href="/items/search" />
          <QuickActionCard icon="📝" label="欲しい物リスト" href="/wishlist" />
          <QuickActionCard icon="⚙️" label="設定" href="/settings" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="持ち物" value="--" unit="点" />
          <StatCard title="箱" value="--" unit="個" />
          <StatCard title="欲しい物" value="--" unit="件" />
        </div>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近の活動</h2>
          <div className="text-gray-500 text-center py-8">まだ活動がありません</div>
        </section>
      </main>
    </div>
  );
}

function QuickActionCard({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </a>
  );
}

function StatCard({ title, value, unit }: { title: string; value: string; unit: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">
        {value}
        <span className="text-lg font-normal text-gray-500 ml-1">{unit}</span>
      </p>
    </div>
  );
}
