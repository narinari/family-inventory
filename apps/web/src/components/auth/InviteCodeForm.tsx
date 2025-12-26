'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeInviteCode, isValidInviteCodeFormat } from '@family-inventory/shared';

export function InviteCodeForm() {
  const { submitInviteCode, signOut, firebaseUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const normalizedCode = normalizeInviteCode(code);

    if (!isValidInviteCodeFormat(normalizedCode)) {
      setError('招待コードの形式が正しくありません（例: XXXX-XXXX-XXXX）');
      return;
    }

    setLoading(true);

    try {
      const success = await submitInviteCode(normalizedCode);
      if (!success) {
        setError('招待コードが無効または期限切れです');
      }
    } catch {
      setError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(value: string) {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const parts = cleaned.match(/.{1,4}/g) || [];
    const formatted = parts.slice(0, 3).join('-');
    setCode(formatted);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">招待コードを入力</h2>
        <p className="text-sm text-gray-600 mt-1">家族から共有された招待コードを入力してください</p>
      </div>

      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
        {firebaseUser?.photoURL && (
          <img src={firebaseUser.photoURL} alt="" className="w-10 h-10 rounded-full" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{firebaseUser?.displayName}</p>
          <p className="text-xs text-gray-500 truncate">{firebaseUser?.email}</p>
        </div>
        <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700">変更</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="XXXX-XXXX-XXXX"
            maxLength={14}
            className="w-full px-4 py-3 text-center text-xl tracking-widest font-mono border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || code.length < 14}
          className="w-full bg-primary-600 text-white rounded-xl px-6 py-4 font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '確認中...' : '参加する'}
        </button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          初めて利用する場合は、家族の管理者に招待コードを発行してもらってください
        </p>
      </div>
    </div>
  );
}
