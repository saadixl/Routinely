import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import Empty from '../components/Empty';
import Menu from '../components/Menu';
import Select from '../components/Select';
import WeekBoard from '../components/WeekBoard';
import { EditIcon, LayersIcon, MoreIcon, PlusIcon, StarIcon, TrashIcon } from '../components/Icons';
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
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={!name.trim()}>Save</button>
      </>}
    >
      <form onSubmit={submit}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Regular week, Ramadan week" aria-label="Name" autoFocus />
      </form>
    </Modal>
  );
}

export default function WeekTemplates() {
  const {
    weekTemplates, weekTemplateById, dayTemplates, settings,
    addWeekTemplate, updateWeekTemplate, deleteWeekTemplate, setWeekTemplateDays, updateSettings, setWeekStartsOn,
  } = useData();
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null); // 'new' | 'rename'

  const selected = weekTemplates.find((w) => w.id === selectedId) || weekTemplates[0] || null;
  const labels = slotWeekdays(settings.weekStartsOn, true);
  const isDefault = selected && settings.defaultWeekTemplateId === selected.id;
  const weekdayAt = (i) => (settings.weekStartsOn + i) % 7;

  const create = async (name) => {
    const r = await addWeekTemplate({ name });
    setSelectedId(r.key);
  };

  const remove = () => {
    if (window.confirm(`Delete “${selected.name}”?`)) {
      deleteWeekTemplate(selected.id);
      setSelectedId(null);
    }
  };

  return (
    <>
      <div className="toolbar">
        <p>A typical week. The default one fills every week automatically.</p>
        <button className="btn primary" onClick={() => setModal('new')}><PlusIcon width={16} height={16} /> Week</button>
      </div>

      {weekTemplates.length === 0 ? (
        <Empty
          icon={<LayersIcon />}
          title="No week yet"
          action={dayTemplates.length
            ? <button className="btn primary" onClick={() => setModal('new')}>Create a week</button>
            : <Link className="btn primary" to="/setup/days">Create days first</Link>}
        >
          Say which kind of day each weekday is — e.g. five work days and a weekend.
        </Empty>
      ) : (
        <>
          <div className="week-toolbar">
            {weekTemplates.length > 1 ? (
              <Select
                label="Week template"
                value={selected.id}
                onChange={setSelectedId}
                options={weekTemplates.map((w) => ({
                  value: w.id,
                  label: w.name,
                  hint: settings.defaultWeekTemplateId === w.id ? 'Default' : undefined,
                }))}
              />
            ) : (
              <h2>{selected.name}</h2>
            )}
            {isDefault && <span className="faint small row" style={{ gap: 4 }}><StarIcon width={13} height={13} fill="currentColor" /> Default</span>}
            <span className="spacer" />
            <Menu trigger={({ toggle }) => <button className="btn ghost icon" onClick={toggle} aria-label="Week options"><MoreIcon /></button>}>
              {(close) => (
                <>
                  {!isDefault && (
                    <button className="menu-item" onClick={() => { updateSettings({ defaultWeekTemplateId: selected.id }); close(); }}>
                      <StarIcon width={16} height={16} /> Make default
                    </button>
                  )}
                  <button className="menu-item" onClick={() => { setModal('rename'); close(); }}><EditIcon width={16} height={16} /> Rename</button>
                  <button className="menu-item" style={{ color: 'var(--danger)' }} onClick={() => { close(); remove(); }}><TrashIcon width={16} height={16} /> Delete</button>
                </>
              )}
            </Menu>
          </div>

          <WeekBoard
            rows={labels.map((label, i) => ({
              label,
              dayTemplateId: weekTemplateById[selected.id]?.days?.[weekdayAt(i)] || null,
            }))}
            onAssign={(pairs) => setWeekTemplateDays(selected.id, pairs.map(([i, dt]) => [weekdayAt(i), dt]))}
          />
        </>
      )}

      <div className="section-label">Preferences</div>
      <div className="group setting-row">
        <div>
          <div style={{ fontWeight: 550 }}>Week starts on</div>
          <div className="faint small">Sets which weekday comes first.</div>
        </div>
        <Select
          label="Week starts on"
          align="right"
          value={settings.weekStartsOn}
          onChange={setWeekStartsOn}
          options={WEEKDAYS.map((d, i) => ({ value: i, label: d }))}
        />
      </div>

      {modal === 'new' && <NameModal title="New week" onSubmit={create} onClose={() => setModal(null)} />}
      {modal === 'rename' && selected && (
        <NameModal title="Rename week" initial={selected.name} onSubmit={(name) => updateWeekTemplate(selected.id, { name })} onClose={() => setModal(null)} />
      )}
    </>
  );
}
