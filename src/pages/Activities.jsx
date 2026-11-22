import { useState } from 'react';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import Empty from '../components/Empty';
import ColorPicker from '../components/ColorPicker';
import SortableList from '../components/SortableList';
import { EditIcon, PlusIcon, TrashIcon } from '../components/Icons';
import { randomColor } from '../lib/palette';

const SUGGESTIONS = [
  { emoji: '🏋️', name: 'Workout' },
  { emoji: '🏢', name: 'Go to office' },
  { emoji: '🕌', name: 'Fajr prayer' },
  { emoji: '📖', name: 'Read Quran' },
  { emoji: '🎓', name: 'Career study' },
  { emoji: '💻', name: 'Side project' },
  { emoji: '🚶', name: 'Evening walk' },
  { emoji: '😴', name: 'Sleep by 11' },
];

export function ActivityForm({ initial, onSubmit, onClose, title }) {
  const [name, setName] = useState(initial?.name || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '✅');
  const [color, setColor] = useState(initial?.color || randomColor());

  const submit = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), emoji: emoji.trim() || '✅', color });
    onClose();
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      actions={<>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={!name.trim()}>Save</button>
      </>}
    >
      <form onSubmit={submit} className="stack">
        <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
          <div className="field">
            <label htmlFor="a-emoji">Icon</label>
            <input id="a-emoji" className="input emoji-input" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="a-name">Name</label>
            <input id="a-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning workout" autoFocus />
          </div>
        </div>
        <div className="field">
          <label>Color</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Activities() {
  const { activities, activityById, dayTemplates, addActivity, updateActivity, deleteActivity, reorder } = useData();
  const [editing, setEditing] = useState(null); // null | 'new' | id

  const usedIn = (id) => dayTemplates.filter((t) => (t.activities || []).includes(id)).length;

  const confirmDelete = (a) => {
    const n = usedIn(a.id);
    const msg = n ? `Delete “${a.name}”? It will be removed from ${n} day template${n > 1 ? 's' : ''}.` : `Delete “${a.name}”?`;
    if (window.confirm(msg)) deleteActivity(a.id);
  };

  const missing = SUGGESTIONS.filter((s) => !activities.some((a) => a.name.toLowerCase() === s.name.toLowerCase()));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Activities</h1>
          <p>The building blocks of your routine.</p>
        </div>
        <button className="btn primary" onClick={() => setEditing('new')}><PlusIcon width={18} height={18} /> New activity</button>
      </div>

      {activities.length === 0 ? (
        <Empty title="No activities yet" action={<button className="btn primary" onClick={() => setEditing('new')}><PlusIcon width={18} height={18} /> Add your first</button>}>
          Add things you do regularly — workouts, office, prayers, study, side projects.
        </Empty>
      ) : (
        <SortableList
          items={activities.map((a) => a.id)}
          onReorder={(ids) => reorder('activities', ids)}
          renderItem={(id) => {
            const a = { id, ...activityById[id] };
            const n = usedIn(id);
            return (
              <>
                <span className="emoji-badge" style={{ background: `${a.color}22` }}>{a.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 550 }}>{a.name}</div>
                  <div className="faint small">{n ? `In ${n} day template${n > 1 ? 's' : ''}` : 'Not used yet'}</div>
                </div>
                <button className="btn ghost icon" onClick={() => setEditing(id)} aria-label="Edit"><EditIcon width={18} height={18} /></button>
                <button className="btn ghost icon danger" onClick={() => confirmDelete(a)} aria-label="Delete"><TrashIcon width={18} height={18} /></button>
              </>
            );
          }}
        />
      )}

      {missing.length > 0 && (
        <>
          <div className="section-title">Quick add</div>
          <div className="row">
            {missing.map((s) => (
              <button key={s.name} className="chip toggle" onClick={() => addActivity({ ...s, color: randomColor() })}>
                <span>{s.emoji}</span>{s.name}<PlusIcon width={14} height={14} />
              </button>
            ))}
          </div>
        </>
      )}

      {editing && (
        <ActivityForm
          title={editing === 'new' ? 'New activity' : 'Edit activity'}
          initial={editing === 'new' ? null : activityById[editing]}
          onClose={() => setEditing(null)}
          onSubmit={(data) => (editing === 'new' ? addActivity(data) : updateActivity(editing, data))}
        />
      )}
    </>
  );
}
