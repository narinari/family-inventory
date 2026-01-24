'use client';

import { Suspense } from 'react';
import ItemTypeDetailClient from './ItemTypeDetailClient';

export default function ItemTypeDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
        </div>
      }
    >
      <ItemTypeDetailClient />
    </Suspense>
  );
}
