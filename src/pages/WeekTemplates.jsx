import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import Empty from '../components/Empty';
import WeekBoard from '../components/WeekBoard';
import { EditIcon, PlusIcon, StarIcon, TrashIcon } from '../components/Icons';
import { WEEKDAYS, slotWeekdays } from '../lib/dates';

function NameModal({ title, initial = '', onSubmit, onClose }) {
  const [name, setName] = useState(initial);
  const submit = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
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
      <form onSubmit={submit} className="field">
        <label htmlFor="w-name">Name</label>
        <input id="w-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Regular week, Ramadan week" autoFocus />
      </form>
    </Modal>
  );
}

export default function WeekTemplates() {
  const {
    weekTemplates, weekTemplateById, dayTemplates, settings,
    addWeekTemplate, updateWeekTemplate, deleteWeekTemplate, setWeekTemplateSlot, updateSettings,
  } = useData();
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null); // 'new' | 'rename'

  const selected = weekTemplates.find((w) => w.id === selectedId) || weekTemplates[0] || null;
  const labels = slotWeekdays(settings.weekStartsOn, true);

  const create = async (name) => {
    const r = await addWeekTemplate({ name });
    setSelectedId(r.key);
  };

  const remove = () => {
    if (window.confirm(`Delete week template “${selected.name}”?`)) {
      deleteWeekTemplate(selected.id);
      setSelectedId(null);
    }
  };

  const newButton = <button className="btn primary" onClick={() => setModal('new')}><PlusIcon width={18} height={18} /> New week template</button>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Week templates</h1>
          <p>Drag day templates onto the seven days of a week.</p>
        </div>
        {newButton}
      </div>

      {weekTemplates.length === 0 ? (
        <Empty
          title="No week templates yet"
          action={dayTemplates.length ? newButton : <Link className="btn primary" to="/days">Create day templates first</Link>}
        >
          A week template says which kind of day each weekday is — e.g. five work days and a weekend.
        </Empty>
      ) : (
        <>
          <div className="row" style={{ marginBottom: 16 }}>
            {weekTemplates.map((w) => (
              <button
                key={w.id}
                className={`chip toggle${selected?.id === w.id ? ' on' : ''}`}
                onClick={() => setSelectedId(w.id)}
              >
                {settings.defaultWeekTemplateId === w.id && <StarIcon width={13} height={13} fill="currentColor" />}
                {w.name}
              </button>
            ))}
          </div>

          {selected && (
            <div className="card stack">
              <div className="row">
                <h2>{selected.name}</h2>
                {settings.defaultWeekTemplateId === selected.id ? (
                  <span className="chip"><StarIcon width={13} height={13} fill="currentColor" /> Default</span>
                ) : (
                  <button className="btn sm" onClick={() => updateSettings({ defaultWeekTemplateId: selected.id })}>
                    <StarIcon width={14} height={14} /> Make default
                  </button>
                )}
                <span className="spacer" />
                <button className="btn ghost icon" onClick={() => setModal('rename')} aria-label="Rename"><EditIcon width={18} height={18} /></button>
                <button className="btn ghost icon danger" onClick={remove} aria-label="Delete"><TrashIcon width={18} height={18} /></button>
              </div>
              <WeekBoard
                clearOnDropOutside
                slots={labels.map((label, i) => ({
                  label,
                  dayTemplateId: weekTemplateById[selected.id]?.slots?.[i] || null,
                }))}
                onAssign={(slot, dt) => setWeekTemplateSlot(selected.id, slot, dt)}
              />
              <p className="faint small">
                The default week template is used for any calendar week you haven’t set up explicitly. Drag a day off the board to clear it.
              </p>
            </div>
          )}
        </>
      )}

      <div className="section-title">Settings</div>
      <div className="card row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h3>First day of the week</h3>
          <p className="muted small">Decides which weekday each of the seven slots maps to.</p>
        </div>
        <select
          className="select"
          style={{ width: 160 }}
          value={settings.weekStartsOn}
          onChange={(e) => updateSettings({ weekStartsOn: Number(e.target.value) })}
        >
          {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
      </div>

      {modal === 'new' && <NameModal title="New week template" onSubmit={create} onClose={() => setModal(null)} />}
      {modal === 'rename' && selected && (
        <NameModal title="Rename week template" initial={selected.name} onSubmit={(name) => updateWeekTemplate(selected.id, { name })} onClose={() => setModal(null)} />
      )}
    </>
  );
}
