'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getMembers, getInviteCodes, createInviteCode, type InviteCode } from '@/lib/api';
import type { User } from '@family-inventory/shared';

export default function MembersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<User[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && user.role !== 'admin') {
      router.push('/settings');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadData();
    }
  }, [user]);

  async function loadData() {
    try {
      const [membersData, inviteCodesData] = await Promise.all([
        getMembers(),
        getInviteCodes(),
      ]);
      setMembers(membersData);
      setInviteCodes(inviteCodesData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleCreateInvite() {
    setCreating(true);
    setError(null);

    try {
      const result = await createInviteCode(7);
      if (result.success) {
        await loadData();
      } else {
        setError(result.error?.message ?? '招待コードの発行に失敗しました');
      }
    } catch (err) {
      setError('招待コードの発行に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const activeInvites = inviteCodes.filter(
    (code) => !code.usedBy && new Date(code.expiresAt) > new Date()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/settings" className="text-primary-600 hover:text-primary-700">
            ← 設定に戻る
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">メンバー管理</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
        )}

        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            家族メンバー ({members.length}人)
          </h2>

          {dataLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {members.map((member) => (
                <li key={member.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt={member.displayName} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-bold">
                          {member.displayName?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{member.displayName}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    member.role === 'admin' ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.role === 'admin' ? '管理者' : 'メンバー'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">招待コード</h2>
            <button
              onClick={handleCreateInvite}
              disabled={creating}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {creating ? '発行中...' : '+ 新規発行'}
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            招待コードを発行して、新しい家族メンバーを招待できます。コードは7日間有効です。
          </p>

          {dataLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : activeInvites.length > 0 ? (
            <ul className="space-y-3">
              {activeInvites.map((invite) => (
                <li key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <code className="text-lg font-mono font-bold text-gray-900">
                      {invite.code}
                    </code>
                    <p className="text-xs text-gray-500 mt-1">
                      有効期限: {new Date(invite.expiresAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(invite.code)}
                    className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded"
                  >
                    {copiedCode === invite.code ? 'コピーしました' : 'コピー'}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 py-4">
              有効な招待コードがありません
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
