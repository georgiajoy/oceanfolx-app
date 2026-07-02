'use client';

import { useEffect } from 'react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route segment error:', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-[#443837]">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-sm text-[#443837]/80">{error.message || 'An unexpected error occurred.'}</p>
      {error.digest && <p className="mt-2 text-xs text-[#443837]/60">Error reference: {error.digest}</p>}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-[#4FBACA] px-4 py-2 text-sm font-medium text-white hover:bg-[#3aa8bc]"
      >
        Try again
      </button>
    </main>
  );
}
