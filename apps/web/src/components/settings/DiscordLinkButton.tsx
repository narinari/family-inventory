'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface DiscordLinkButtonProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function DiscordLinkButton({ onSuccess, onError }: DiscordLinkButtonProps) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/auth/discord`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.data.authUrl;
      } else {
        onError?.(data.error?.message || 'Discord連携に失敗しました');
        setLoading(false);
      }
    } catch {
      onError?.('Discord連携に失敗しました');
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Discord連携を解除しますか？\nBotからの操作ができなくなります。')) {
      return;
    }

    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/auth/discord`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        await refreshUser();
        onSuccess?.();
      } else {
        onError?.(data.error?.message || '連携解除に失敗しました');
      }
    } catch {
      onError?.('連携解除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (user?.discordId) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center">
            <DiscordIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Discord 連携済み</p>
            <p className="text-sm text-gray-500">ID: {user.discordId}</p>
          </div>
        </div>
        <button
          onClick={handleUnlink}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? '処理中...' : '連携解除'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLink}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
    >
      <DiscordIcon className="w-5 h-5" />
      {loading ? '接続中...' : 'Discordと連携する'}
    </button>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
