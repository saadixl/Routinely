import Menu from './Menu';
import { CheckIcon, ChevronDown } from './Icons';

/**
 * Pill-shaped dropdown that matches the rest of the UI (replaces native <select>).
 * options: [{ value, label, hint? }]
 */
export default function Select({ value, options, onChange, label, align = 'left', placeholder = 'Choose…' }) {
  const current = options.find((o) => o.value === value);
  return (
    <Menu
      align={align}
      minWidth={200}
      trigger={({ open, toggle }) => (
        <button type="button" className="select-btn" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label={label ? `${label}: ${current?.label ?? placeholder}` : undefined}>
          <span className="select-value">{current?.label ?? placeholder}</span>
          <ChevronDown width={15} height={15} className={`select-chevron${open ? ' open' : ''}`} />
        </button>
      )}
    >
      {(close) => options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          role="menuitemradio"
          aria-checked={o.value === value}
          className={`menu-item${o.value === value ? ' selected' : ''}`}
          onClick={() => { if (o.value !== value) onChange(o.value); close(); }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span>{o.label}</span>
            {o.hint && <span className="faint small" style={{ fontWeight: 400 }}>{o.hint}</span>}
          </span>
          {o.value === value && <CheckIcon className="check" width={16} height={16} />}
        </button>
      ))}
    </Menu>
  );
}
