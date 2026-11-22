import { useData } from '../context/DataContext';
import Menu from './Menu';
import Pill from './Pill';
import { CheckIcon, ChevronDown, UndoIcon } from './Icons';

/** A day-template pill that opens a menu to pick another day template for this date. */
export default function DayPicker({ value, onChange, onReset, placeholder = 'Choose a day', align = 'left', children }) {
  const { dayTemplates, dayTemplateById } = useData();
  const t = value ? dayTemplateById[value] : null;

  return (
    <Menu
      align={align}
      trigger={({ toggle }) => (
        <button className="picker-btn" onClick={toggle} aria-label="Change day type">
          {children || (t ? <Pill color={t.color}>{t.name}</Pill> : <span className="placeholder">{placeholder}</span>)}
          <ChevronDown width={14} height={14} />
        </button>
      )}
    >
      {(close) => (
        <>
          {dayTemplates.map((d) => (
            <button key={d.id} className={`menu-item${d.id === value ? ' selected' : ''}`} onClick={() => { onChange(d.id); close(); }}>
              <span className="pill" style={{ '--c': d.color, padding: 0, background: 'none', height: 'auto' }}><span className="dot" /></span>
              {d.name}
              {d.id === value && <CheckIcon className="check" width={16} height={16} />}
            </button>
          ))}
          <button className={`menu-item${!value ? ' selected' : ''}`} onClick={() => { onChange(null); close(); }}>
            <span style={{ width: 7 }} />Rest / nothing planned
            {!value && <CheckIcon className="check" width={16} height={16} />}
          </button>
          {onReset && (
            <>
              <div className="menu-sep" />
              <button className="menu-item" onClick={() => { onReset(); close(); }}>
                <UndoIcon width={16} height={16} /> Use week template
              </button>
            </>
          )}
        </>
      )}
    </Menu>
  );
}
