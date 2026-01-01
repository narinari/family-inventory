'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function DiscordCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage('Discord認証がキャンセルされました');
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('認証コードが見つかりません');
        return;
      }

      try {
        const token = await auth.currentUser?.getIdToken();

        if (!token) {
          setStatus('error');
          setErrorMessage('ログインが必要です');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/auth/discord/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (data.success) {
          await refreshUser();
          setStatus('success');
          setTimeout(() => {
            router.push('/settings');
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage(data.error?.message || 'Discord連携に失敗しました');
        }
      } catch {
        setStatus('error');
        setErrorMessage('Discord連携に失敗しました');
      }
    };

    handleCallback();
  }, [searchParams, refreshUser, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full mx-4 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5865F2] border-t-transparent mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Discord連携中...</h1>
            <p className="text-gray-500">しばらくお待ちください</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">連携完了!</h1>
            <p className="text-gray-500">Discordとの連携が完了しました。設定ページに戻ります...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">エラーが発生しました</h1>
            <p className="text-gray-500 mb-4">{errorMessage}</p>
            <button
              onClick={() => router.push('/settings')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              設定に戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full mx-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5865F2] border-t-transparent mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">読み込み中...</h1>
      </div>
    </div>
  );
}

export default function DiscordCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DiscordCallbackContent />
    </Suspense>
  );
}
