'use client';

import { useEffect } from 'react';

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message?.includes('Loading chunk') ||
    error.message?.includes('Failed to fetch dynamically imported module') ||
    error.message?.includes('Importing a module script failed')
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      const key = 'chunk_reload_' + window.location.pathname;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return;
      }
      // Already tried once — clear and show error
      sessionStorage.removeItem(key);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Something went wrong</h2>
        {isChunkLoadError(error) ? (
          <>
            <p className="mb-6 text-gray-600">
              A new version has been deployed. Please reload the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Reload Page
            </button>
          </>
        ) : (
          <>
            <p className="mb-6 text-gray-600">An unexpected error occurred.</p>
            <button
              onClick={reset}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
