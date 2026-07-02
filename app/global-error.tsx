'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global app error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8f5ef] text-[#443837]">
        <main className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-sm text-[#443837]/80">
            {error.message || 'An unexpected error occurred.'}
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-[#443837]/60">Error reference: {error.digest}</p>
          )}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-[#4FBACA] px-4 py-2 text-sm font-medium text-white hover:bg-[#3aa8bc]"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="rounded-md border border-[#443837]/30 px-4 py-2 text-sm font-medium text-[#443837] hover:bg-white"
            >
              Go home
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
