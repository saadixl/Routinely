import { useEffect, useRef } from 'react';

const PREV = new Set(['ArrowLeft', '<', ',']);
const NEXT = new Set(['ArrowRight', '>', '.']);

/**
 * Left/Right arrows (and < / >) call onPrev / onNext.
 * Ignored while typing in a field, when a dialog is open, or with Cmd/Ctrl/Alt held.
 */
export default function useKeyNav(onPrev, onNext) {
  const handlers = useRef({ onPrev, onNext });
  handlers.current = { onPrev, onNext };

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if (PREV.has(e.key) || e.code === 'Comma') { e.preventDefault(); handlers.current.onPrev(); }
      else if (NEXT.has(e.key) || e.code === 'Period') { e.preventDefault(); handlers.current.onNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
