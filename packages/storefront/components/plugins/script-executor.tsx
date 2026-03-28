'use client';

import { useEffect, useRef } from 'react';

/**
 * Executes inline script content after mount.
 * Needed because <script> tags inside React Suspense hidden boundaries
 * are not executed by the browser.
 */
export function ScriptExecutor({ content }: { content: string }) {
  const executed = useRef(false);

  useEffect(() => {
    if (executed.current || !content) return;
    executed.current = true;

    try {
      const fn = new Function(content);
      fn();
    } catch (err) {
      console.error('[ScriptExecutor] Plugin script error:', err);
    }
  }, [content]);

  return null;
}
