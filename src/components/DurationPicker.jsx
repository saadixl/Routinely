import { useState } from 'react';
import Menu from './Menu';
import { CheckIcon, ClockIcon } from './Icons';
import { DURATION_PRESETS, MAX_MINUTES, formatMinutes } from '../lib/duration';

/** Small "30 min" chip that opens presets plus a custom minutes field. */
export default function DurationPicker({ value, onChange, label }) {
  const [custom, setCustom] = useState('');

  const saveCustom = (close) => {
    const n = Math.round(Number(custom));
    if (n > 0 && n <= MAX_MINUTES) {
      onChange(n);
      close();
    }
  };

  return (
    <Menu
      align="right"
      minWidth={210}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          className={`duration-chip${value ? ' set' : ''}`}
          onClick={() => { setCustom(value && !DURATION_PRESETS.includes(value) ? String(value) : ''); toggle(); }}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`${label}: ${value ? formatMinutes(value) : 'no duration'}`}
          title="Duration"
        >
          <ClockIcon width={13} height={13} />
          {value ? formatMinutes(value) : 'Time'}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="duration-grid">
            {DURATION_PRESETS.map((m) => (
              <button
                type="button"
                key={m}
                role="menuitemradio"
                aria-checked={m === value}
                className={`menu-item duration-preset${m === value ? ' selected' : ''}`}
                onClick={() => { onChange(m); close(); }}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="duration-custom">
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min="1"
              max={MAX_MINUTES}
              placeholder="Custom"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) e.stopPropagation();
                if (e.key === 'Enter') { e.preventDefault(); saveCustom(close); }
              }}
              aria-label="Custom duration in minutes"
            />
            <span className="faint small">min</span>
            <button type="button" className="btn sm primary" onClick={() => saveCustom(close)} disabled={!(Number(custom) > 0 && Number(custom) <= MAX_MINUTES)}>
              <CheckIcon width={14} height={14} />
            </button>
          </div>
          {value > 0 && (
            <>
              <div className="menu-sep" />
              <button type="button" className="menu-item" onClick={() => { onChange(null); close(); }}>No duration</button>
            </>
          )}
        </>
      )}
    </Menu>
  );
}
