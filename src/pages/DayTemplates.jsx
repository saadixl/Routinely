import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import Empty from '../components/Empty';
import ColorPicker from '../components/ColorPicker';
import SortableList from '../components/SortableList';
import { DayIcon, EditIcon, PlusIcon, TrashIcon, XIcon } from '../components/Icons';
import { randomColor } from '../lib/palette';

const NAME_IDEAS = ['Work day', 'Weekend', 'Vacation', 'Travel day'];

function DayTemplateForm({ initial, title, onSubmit, onClose }) {
  const { activities, dayTemplates } = useData();
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || randomColor());
  const [selected, setSelected] = useState(initial?.activities || []);
  const ideas = NAME_IDEAS.filter((n) => !dayTemplates.some((d) => d.name.toLowerCase() === n.toLowerCase()));

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
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={!name.trim()}>Save</button>
      </>}
    >
      <form onSubmit={submit} className="stack" style={{ gap: 20 }}>
        <div className="field">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Work day" aria-label="Name" autoFocus />
          {!initial && !name && ideas.length > 0 && (
            <div className="row" style={{ gap: 6 }}>
              {ideas.map((n) => <button type="button" key={n} className="chip dashed" style={{ height: 30, fontSize: 13 }} onClick={() => setName(n)}>{n}</button>)}
            </div>
          )}
        </div>
        <div className="field">
          <label>Color</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="field">
          <label>Activities {selected.length > 0 && <span className="faint">· {selected.length}</span>}</label>
          {activities.length === 0 ? (
            <p className="muted small">No activities yet. <Link to="/setup/activities">Add some first.</Link></p>
          ) : (
            <div className="row" style={{ gap: 6 }}>
              {activities.map((a) => (
                <button type="button" key={a.id} className={`chip${selected.includes(a.id) ? ' on' : ''}`} onClick={() => toggle(a.id)} aria-pressed={selected.includes(a.id)}>
                  <span>{a.emoji}</span>{a.name}
                </button>
              ))}
            </div>
          )}
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
    if (window.confirm(`Delete “${t.name}”? Weeks using it will have that day cleared.`)) deleteDayTemplate(t.id);
  };

  return (
    <div className="card tpl-card">
      <div className="tpl-head">
        <div className="title"><span className="swatch-dot" style={{ background: t.color }} />{t.name}</div>
        <span className="faint small">{ids.length}</span>
        <button className="btn ghost icon sm" onClick={onEdit} aria-label={`Edit ${t.name}`}><EditIcon width={16} height={16} /></button>
        <button className="btn ghost icon sm danger" onClick={remove} aria-label={`Delete ${t.name}`}><TrashIcon width={16} height={16} /></button>
      </div>
      <div className="tpl-body">
        {ids.length > 0 && (
          <SortableList
            className=""
            rowClassName="mini-row"
            items={ids}
            onReorder={(next) => updateDayTemplate(t.id, { activities: next })}
            renderItem={(id) => {
              const a = activityById[id];
              return (
                <>
                  <span>{a.emoji}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{a.name}</span>
                  <button className="btn ghost icon sm x" onClick={() => updateDayTemplate(t.id, { activities: ids.filter((x) => x !== id) })} aria-label={`Remove ${a.name}`}>
                    <XIcon width={14} height={14} />
                  </button>
                </>
              );
            }}
          />
        )}
        <div className="tpl-foot">
          <button className="btn ghost sm" onClick={onEdit}><PlusIcon width={14} height={14} /> {ids.length ? 'Edit activities' : 'Add activities'}</button>
        </div>
      </div>
    </div>
  );
}

export default function DayTemplates() {
  const { dayTemplates, dayTemplateById, activities, weekTemplates, addDayTemplate, updateDayTemplate } = useData();
  const [editing, setEditing] = useState(null);

  return (
    <>
      <div className="toolbar">
        <p>Kinds of days, each with its own activities.</p>
        <button className="btn primary" onClick={() => setEditing('new')}><PlusIcon width={16} height={16} /> Day</button>
      </div>

      {dayTemplates.length === 0 ? (
        <Empty
          icon={<DayIcon />}
          title="No days yet"
          action={activities.length
            ? <button className="btn primary" onClick={() => setEditing('new')}>Create a day</button>
            : <Link className="btn primary" to="/setup/activities">Add activities first</Link>}
        >
          For example a Work day with office and study, and a Weekend with family time.
        </Empty>
      ) : (
        <div className="tpl-grid">
          {dayTemplates.map((t) => <DayTemplateCard key={t.id} t={t} onEdit={() => setEditing(t.id)} />)}
        </div>
      )}

      {dayTemplates.length > 0 && weekTemplates.length === 0 && (
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
          <Link className="btn primary" to="/setup/weeks">Next: lay out your week →</Link>
        </div>
      )}

      {editing && (
        <DayTemplateForm
          title={editing === 'new' ? 'New day' : 'Edit day'}
          initial={editing === 'new' ? null : dayTemplateById[editing]}
          onClose={() => setEditing(null)}
          onSubmit={(data) => (editing === 'new' ? addDayTemplate(data) : updateDayTemplate(editing, data))}
        />
      )}
    </>
  );
}
