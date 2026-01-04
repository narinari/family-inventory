import { Suspense } from 'react';
import InventoryCheckClient from './InventoryCheckClient';

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
    </div>
  );
}

export default function InventoryCheckPage() {
  return (
    <Suspense fallback={<Loading />}>
      <InventoryCheckClient />
    </Suspense>
  );
}
