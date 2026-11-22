import { useMemo, useState } from 'react';
import { EMOJI_GROUPS } from '../lib/emojis';

/** Inline emoji grid with search; also accepts any emoji typed or pasted in the search box. */
export default function EmojiPicker({ value, onPick, onClose }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const groups = useMemo(() => {
    if (!query) return EMOJI_GROUPS;
    const items = EMOJI_GROUPS.flatMap((g) => g.items).filter(([e, k]) => k.includes(query) || e === query);
    return [{ name: 'Results', items }];
  }, [query]);

  // Anything that isn't plain letters is treated as a custom emoji the user typed/pasted.
  const custom = q.trim() && !/^[\p{L}\p{N}\s]+$/u.test(q.trim()) ? [...q.trim()].slice(0, 2).join('') : null;

  return (
    <div className="emoji-picker">
      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search, or paste any emoji"
        aria-label="Search emoji"
        autoFocus
        onKeyDown={(e) => {
          // Close just the picker, not the dialog around it.
          if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); }
        }}
      />
      <div className="emoji-scroll">
        {custom && (
          <div className="emoji-grid">
            <button type="button" className="emoji-cell" onClick={() => onPick(custom)} title="Use this emoji">{custom}</button>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.name}>
            <div className="emoji-group">{g.name}</div>
            {g.items.length === 0 ? (
              <p className="faint small" style={{ padding: '4px 2px' }}>No match — paste any emoji above.</p>
            ) : (
              <div className="emoji-grid">
                {g.items.map(([e, k]) => (
                  <button
                    type="button"
                    key={e}
                    className={`emoji-cell${e === value ? ' on' : ''}`}
                    onClick={() => onPick(e)}
                    title={k.split(' ')[0]}
                    aria-label={k.split(' ')[0]}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
