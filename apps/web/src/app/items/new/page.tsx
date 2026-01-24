import { Suspense } from 'react';
import NewItemClient from './NewItemClient';

export default function NewItemPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
        </div>
      }
    >
      <NewItemClient />
    </Suspense>
  );
}
