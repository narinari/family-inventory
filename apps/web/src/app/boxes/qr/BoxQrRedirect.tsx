'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function BoxQrRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const boxId = searchParams.get('id');

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const returnUrl = boxId ? `/boxes/qr?id=${boxId}` : '/boxes';
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (boxId) {
      router.replace(`/boxes/detail?id=${boxId}`);
    } else {
      router.replace('/boxes');
    }
  }, [user, loading, boxId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
    </div>
  );
}
