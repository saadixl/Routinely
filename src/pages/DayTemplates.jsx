import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import Empty from '../components/Empty';
import ColorPicker from '../components/ColorPicker';
import SortableList from '../components/SortableList';
import { EditIcon, PlusIcon, TrashIcon, XIcon } from '../components/Icons';
import { randomColor } from '../lib/palette';

function DayTemplateForm({ initial, title, onSubmit, onClose }) {
  const { activities } = useData();
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || randomColor());
  const [selected, setSelected] = useState(initial?.activities || []);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), color, activities: selected });
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
        <div className="field">
          <label htmlFor="d-name">Name</label>
          <input id="d-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Work day, Weekend, Vacation" autoFocus />
        </div>
        <div className="field">
          <label>Color</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="field">
          <label>Activities ({selected.length})</label>
          {activities.length === 0 ? (
            <p className="muted small">No activities yet. <Link to="/activities">Create some first.</Link></p>
          ) : (
            <div className="row">
              {activities.map((a) => (
                <button type="button" key={a.id} className={`chip toggle${selected.includes(a.id) ? ' on' : ''}`} onClick={() => toggle(a.id)}>
                  <span>{a.emoji}</span>{a.name}
                </button>
              ))}
            </div>
          )}
          <p className="faint small">You can reorder them on the card after saving.</p>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function DayTemplateCard({ t, onEdit }) {
  const { activityById, updateDayTemplate, deleteDayTemplate } = useData();
  const ids = (t.activities || []).filter((id) => activityById[id]);

  const remove = () => {
    if (window.confirm(`Delete day template “${t.name}”? Weeks using it will have that day cleared.`)) deleteDayTemplate(t.id);
  };

  return (
    <div className="card stack">
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <span className="day-tag" style={{ background: t.color }}>{t.name}</span>
        <span className="spacer" />
        <button className="btn ghost icon" onClick={onEdit} aria-label="Edit"><EditIcon width={18} height={18} /></button>
        <button className="btn ghost icon danger" onClick={remove} aria-label="Delete"><TrashIcon width={18} height={18} /></button>
      </div>
      {ids.length === 0 ? (
        <p className="faint small">No activities. <button className="btn ghost sm" onClick={onEdit}>Add some</button></p>
      ) : (
        <SortableList
          items={ids}
          onReorder={(next) => updateDayTemplate(t.id, { activities: next })}
          renderItem={(id) => {
            const a = activityById[id];
            return (
              <>
                <span>{a.emoji}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{a.name}</span>
                <button className="handle" onClick={() => updateDayTemplate(t.id, { activities: ids.filter((x) => x !== id) })} aria-label={`Remove ${a.name}`}>
                  <XIcon width={16} height={16} />
                </button>
              </>
            );
          }}
        />
      )}
    </div>
  );
}

export default function DayTemplates() {
  const { dayTemplates, dayTemplateById, activities, addDayTemplate, updateDayTemplate } = useData();
  const [editing, setEditing] = useState(null);

  const newButton = (
    <button className="btn primary" onClick={() => setEditing('new')}><PlusIcon width={18} height={18} /> New day template</button>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Day templates</h1>
          <p>Group activities into kinds of days — work days, weekends, vacations.</p>
        </div>
        {newButton}
      </div>

      {dayTemplates.length === 0 ? (
        <Empty title="No day templates yet" action={activities.length ? newButton : <Link className="btn primary" to="/activities">Create activities first</Link>}>
          A day template is a set of activities you do on a certain kind of day.
        </Empty>
      ) : (
        <div className="grid-cards">
          {dayTemplates.map((t) => <DayTemplateCard key={t.id} t={t} onEdit={() => setEditing(t.id)} />)}
        </div>
      )}

      {editing && (
        <DayTemplateForm
          title={editing === 'new' ? 'New day template' : 'Edit day template'}
          initial={editing === 'new' ? null : dayTemplateById[editing]}
          onClose={() => setEditing(null)}
          onSubmit={(data) => (editing === 'new' ? addDayTemplate(data) : updateDayTemplate(editing, data))}
        />
      )}
    </>
  );
}
