import { useState } from 'react';
import Modal from './Modal';
import { ANYTIME, PARTS, partOf } from '../lib/parts';
import { DURATION_PRESETS, MAX_MINUTES } from '../lib/duration';

export const NOTE_MAX = 200;

/** Edit one activity entry in a day template: part of day, duration and a note. */
export default function EntryEditor({ activity, entry, onSave, onRemove, onClose }) {
  const [part, setPart] = useState(partOf(entry));
  const [minutes, setMinutes] = useState(entry.minutes ? String(entry.minutes) : '');
  const [note, setNote] = useState(entry.note || '');

  const m = Number(minutes);
  const minutesOk = minutes === '' || (m > 0 && m <= MAX_MINUTES);

  const save = (e) => {
    e?.preventDefault();
    if (!minutesOk) return;
    onSave({ part, minutes: minutes === '' ? null : Math.round(m), note });
    onClose();
  };

  return (
    <Modal
      title={<span className="row" style={{ gap: 10 }}><span>{activity.emoji}</span>{activity.name}</span>}
      ariaLabel={`Edit ${activity.name}`}
      onClose={onClose}
      actions={<>
        <button className="btn ghost danger" style={{ marginRight: 'auto' }} onClick={() => { onRemove(); onClose(); }}>Remove</button>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={save} disabled={!minutesOk}>Save</button>
      </>}
    >
      <form onSubmit={save} className="stack" style={{ gap: 20 }}>
        <div className="field">
          <label>Part of day</label>
          <div className="segmented part-picker" role="radiogroup" aria-label="Part of day">
            {[...PARTS, ANYTIME].map((p) => (
              <button type="button" key={p.id} role="radio" aria-checked={part === p.id} aria-selected={part === p.id} onClick={() => setPart(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="entry-minutes">Duration</label>
          <div className="row" style={{ gap: 6 }}>
            {DURATION_PRESETS.map((p) => (
              <button type="button" key={p} className={`chip${Number(minutes) === p ? ' on' : ''}`} style={{ height: 30, padding: '0 11px', fontSize: 13 }} onClick={() => setMinutes(String(p))}>
                {p}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
            <input
              id="entry-minutes"
              className="input"
              style={{ width: 110 }}
              type="number"
              inputMode="numeric"
              min="1"
              max={MAX_MINUTES}
              placeholder="None"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
            <span className="muted small">minutes</span>
            {minutes !== '' && <button type="button" className="btn ghost sm" onClick={() => setMinutes('')}>Clear</button>}
          </div>
          {!minutesOk && <span className="error" style={{ marginTop: 0 }}>Enter 1–{MAX_MINUTES} minutes.</span>}
        </div>

        <div className="field">
          <label htmlFor="entry-note">Note</label>
          <textarea
            id="entry-note"
            className="input textarea"
            rows={3}
            maxLength={NOTE_MAX}
            placeholder="e.g. Chapter 4, legs + core, at the masjid…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(e); }}
          />
          <span className="faint small" style={{ alignSelf: 'flex-end' }}>{note.length}/{NOTE_MAX}</span>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
