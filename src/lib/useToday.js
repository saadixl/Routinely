import { useEffect, useState } from 'react';
import { dateKey } from './dates';

/** Today's date key that updates itself at midnight and when the tab regains focus. */
export default function useTodayKey() {
  const [key, setKey] = useState(() => dateKey(new Date()));

  useEffect(() => {
    let timer;
    const refresh = () => setKey(dateKey(new Date()));
    const schedule = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => { refresh(); schedule(); }, next - now);
    };
    schedule();
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return key;
}
