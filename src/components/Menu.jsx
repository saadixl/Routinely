import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Small popover anchored to a trigger. `children` receives a `close` function.
 * Keyboard: ↑/↓ move between items, Home/End jump, Escape closes and returns focus to the trigger.
 * Opens upward when there isn't room below.
 */
export default function Menu({ trigger, children, align = 'right', className = '', minWidth }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef(null);
  const menuRef = useRef(null);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) ref.current?.querySelector('button')?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flip upward near the bottom of the screen, then focus the selected (or first) item.
  useLayoutEffect(() => {
    if (!open || !menuRef.current) { setUp(false); return; }
    const trig = ref.current.getBoundingClientRect();
    const h = menuRef.current.offsetHeight;
    setUp(trig.bottom + h + 16 > window.innerHeight && trig.top > h + 16);
    const items = [...menuRef.current.querySelectorAll('.menu-item')];
    (items.find((i) => i.getAttribute('aria-checked') === 'true') || items[0])?.focus({ preventScroll: true });
  }, [open]);

  const onMenuKey = (e) => {
    const items = [...menuRef.current.querySelectorAll('.menu-item:not(:disabled)')];
    const i = items.indexOf(document.activeElement);
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    items[(to + items.length) % items.length]?.focus();
  };

  const style = {
    ...(align === 'left' ? { left: 0, right: 'auto' } : {}),
    ...(up ? { top: 'auto', bottom: 'calc(100% + 8px)', transformOrigin: 'bottom' } : {}),
    ...(minWidth ? { minWidth } : {}),
  };

  return (
    <div className={`picker-wrap ${className}`} ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className="menu" role="menu" ref={menuRef} style={style} onKeyDown={onMenuKey}>
          {children(() => close())}
        </div>
      )}
    </div>
  );
}
