import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import Empty from '../components/Empty';
import ColorPicker from '../components/ColorPicker';
import EmojiPicker from '../components/EmojiPicker';
import SortableList from '../components/SortableList';
import { EditIcon, ListIcon, PlusIcon, TrashIcon } from '../components/Icons';
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

function ActivityForm({ initial, onSubmit, onClose, title }) {
  const [name, setName] = useState(initial?.name || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '✅');
  const [color, setColor] = useState(initial?.color || randomColor());
  const [picking, setPicking] = useState(false);

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
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={!name.trim()}>Save</button>
      </>}
    >
      <form onSubmit={submit} className="stack" style={{ gap: 20 }}>
        <div className="row" style={{ flexWrap: 'nowrap', gap: 10 }}>
          <button
            type="button"
            className="emoji-trigger"
            onClick={() => setPicking((p) => !p)}
            aria-expanded={picking}
            aria-label="Choose icon"
            title="Choose icon"
          >
            {emoji}
          </button>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Activity name" aria-label="Name" autoFocus />
        </div>
        {picking && <EmojiPicker value={emoji} onPick={(e) => { setEmoji(e); setPicking(false); }} onClose={() => setPicking(false)} />}
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

  const usedIn = (id) => dayTemplates.filter((t) => (t.items || []).some((e) => e.activityId === id)).length;

  const confirmDelete = (a) => {
    const n = usedIn(a.id);
    const msg = n ? `Delete “${a.name}”? It will be removed from ${n} day${n > 1 ? 's' : ''}.` : `Delete “${a.name}”?`;
    if (window.confirm(msg)) deleteActivity(a.id);
  };

  const missing = SUGGESTIONS.filter((s) => !activities.some((a) => a.name.toLowerCase() === s.name.toLowerCase()));

  return (
    <>
      <div className="toolbar">
        <p>Things you do regularly.</p>
        <button className="btn primary" onClick={() => setEditing('new')}><PlusIcon width={16} height={16} /> Activity</button>
      </div>

      {activities.length === 0 ? (
        <Empty icon={<ListIcon />} title="No activities yet">
          Start with a suggestion below, or add your own.
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
                <span className="emoji-tile" style={{ '--c': a.color }}>{a.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="title">{a.name}</div>
                  <div className="faint small">{n ? `Used in ${n} day${n > 1 ? 's' : ''}` : 'Not used yet'}</div>
                </div>
                <div className="actions">
                  <button className="btn ghost icon sm" onClick={() => setEditing(id)} aria-label={`Edit ${a.name}`}><EditIcon width={16} height={16} /></button>
                  <button className="btn ghost icon sm danger" onClick={() => confirmDelete(a)} aria-label={`Delete ${a.name}`}><TrashIcon width={16} height={16} /></button>
                </div>
              </>
            );
          }}
        />
      )}

      {missing.length > 0 && (
        <>
          <div className="section-label">Suggestions</div>
          <div className="row">
            {missing.map((s) => (
              <button key={s.name} className="chip dashed" onClick={() => addActivity({ ...s, color: randomColor() })}>
                <span>{s.emoji}</span>{s.name}
              </button>
            ))}
          </div>
        </>
      )}

      {activities.length > 0 && dayTemplates.length === 0 && (
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
          <Link className="btn primary" to="/setup/days">Next: group them into days →</Link>
        </div>
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
