import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, pointerWithin, rectIntersection,
  useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import Empty from '../components/Empty';
import Menu from '../components/Menu';
import ColorPicker from '../components/ColorPicker';
import DurationPicker from '../components/DurationPicker';
import { DayIcon, EditIcon, GripIcon, PlusIcon, TrashIcon, XIcon } from '../components/Icons';
import { randomColor } from '../lib/palette';
import { formatTotal } from '../lib/duration';
import { groupByPart, partOf } from '../lib/parts';

const NAME_IDEAS = ['Work day', 'Weekend', 'Vacation', 'Travel day'];

/* Drag ids: palette chips "pal:<activityId>", entries "ent:<dayId>:<entryId>",
   sections (drop zones) "sec:<dayId>:<part>". */
const parse = (id) => {
  const [kind, a, b] = String(id).split(':');
  return { kind, a, b };
};

function DayTemplateForm({ initial, title, onSubmit, onClose }) {
  const { dayTemplates } = useData();
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || randomColor());
  const ideas = NAME_IDEAS.filter((n) => !dayTemplates.some((d) => d.name.toLowerCase() === n.toLowerCase()));

  const submit = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), color });
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
        {!initial && <p className="faint small">After saving, drag activities into the day.</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function PaletteChip({ activity }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `pal:${activity.id}` });
  return (
    <span
      ref={setNodeRef}
      className={`chip palette-chip${isDragging ? ' dragging' : ''}`}
      {...attributes}
      {...listeners}
      aria-label={`Drag ${activity.name} into a day`}
    >
      <span>{activity.emoji}</span>{activity.name}
    </span>
  );
}

function EntryRow({ dayId, entry, showHintBefore }) {
  const { activityById, removeEntry, setDuration } = useData();
  const a = activityById[entry.activityId];
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: `ent:${dayId}:${entry.id}` });

  return (
    <>
      {showHintBefore && <div className="drop-line" />}
      <div
        ref={setNodeRef}
        className={`mini-row${isDragging ? ' dragging' : ''}`}
        style={{ transform: CSS.Transform.toString(transform), transition }}
      >
        <button ref={setActivatorNodeRef} className="handle" aria-label={`Drag ${a.name}`} {...attributes} {...listeners}>
          <GripIcon width={16} height={16} />
        </button>
        <span>{a.emoji}</span>
        <span className="entry-name">{a.name}</span>
        <DurationPicker label={`${a.name} duration`} value={entry.minutes || null} onChange={(m) => setDuration(dayId, entry.id, m)} />
        <button className="btn ghost icon sm x" onClick={() => removeEntry(dayId, entry.id)} aria-label={`Remove ${a.name}`}>
          <XIcon width={14} height={14} />
        </button>
      </div>
    </>
  );
}

function AddToSection({ dayId, part, label }) {
  const { activities, addEntry } = useData();
  return (
    <Menu
      align="right"
      minWidth={220}
      trigger={({ open, toggle }) => (
        <button className="btn ghost icon sm section-add" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label={`Add activity to ${label}`}>
          <PlusIcon width={14} height={14} />
        </button>
      )}
    >
      {(close) => activities.map((a) => (
        <button key={a.id} className="menu-item" onClick={() => { addEntry(dayId, a.id, part); close(); }}>
          <span>{a.emoji}</span>{a.name}
        </button>
      ))}
    </Menu>
  );
}

function Section({ dayId, group, hintIndex, dragging }) {
  const { setNodeRef, isOver } = useDroppable({ id: `sec:${dayId}:${group.part}` });
  const total = group.items.reduce((sum, e) => sum + (e.minutes || 0), 0);
  const empty = group.items.length === 0;

  return (
    <div ref={setNodeRef} className={`day-section${isOver || hintIndex >= 0 ? ' over' : ''}`}>
      <div className="section-head">
        <span className="section-name">{group.label}</span>
        {total > 0 && <span className="faint small">{formatTotal(total)}</span>}
        <span className="spacer" />
        {group.part !== 'anytime' && <AddToSection dayId={dayId} part={group.part} label={group.label} />}
      </div>
      <SortableContext items={group.items.map((e) => `ent:${dayId}:${e.id}`)} strategy={verticalListSortingStrategy}>
        {group.items.map((e, i) => <EntryRow key={e.id} dayId={dayId} entry={e} showHintBefore={hintIndex === i} />)}
      </SortableContext>
      {hintIndex >= group.items.length && !empty && <div className="drop-line" />}
      {empty && <div className={`section-empty${dragging ? ' active' : ''}${hintIndex >= 0 ? ' over' : ''}`}>Drop here</div>}
    </div>
  );
}

function DayCard({ t, onEdit, hint, dragging }) {
  const { activityById, deleteDayTemplate } = useData();
  const entries = (t.items || []).filter((e) => activityById[e.activityId]);
  const total = entries.reduce((sum, e) => sum + (e.minutes || 0), 0);
  const groups = groupByPart(entries, { keepEmpty: true });

  const remove = () => {
    if (window.confirm(`Delete “${t.name}”? Weeks using it will have that day cleared.`)) deleteDayTemplate(t.id);
  };

  return (
    <div className={`card tpl-card${hint?.dayId === t.id ? ' drop-target' : ''}`}>
      <div className="tpl-head">
        <div className="title"><span className="swatch-dot" style={{ background: t.color }} />{t.name}</div>
        <span className="faint small" title={`${entries.length} activities`}>{total ? formatTotal(total) : entries.length || ''}</span>
        <button className="btn ghost icon sm" onClick={onEdit} aria-label={`Edit ${t.name}`}><EditIcon width={16} height={16} /></button>
        <button className="btn ghost icon sm danger" onClick={remove} aria-label={`Delete ${t.name}`}><TrashIcon width={16} height={16} /></button>
      </div>
      <div className="tpl-body">
        {groups.map((g) => (
          <Section
            key={g.part}
            dayId={t.id}
            group={g}
            dragging={dragging}
            hintIndex={hint?.dayId === t.id && hint.part === g.part ? hint.index : -1}
          />
        ))}
      </div>
    </div>
  );
}

export default function DayTemplates() {
  const {
    dayTemplates, dayTemplateById, activities, activityById, weekTemplates,
    addDayTemplate, updateDayTemplate, addEntry, moveEntry,
  } = useData();
  const [editing, setEditing] = useState(null);
  const [active, setActive] = useState(null); // activity being dragged
  const [hint, setHint] = useState(null); // { dayId, index } insertion point for palette / cross-day drops

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const entriesIn = (dayId, part) =>
    (dayTemplateById[dayId]?.items || []).filter((e) => activityById[e.activityId] && partOf(e) === part);

  /** Where would `over` drop? Returns { dayId, part, index } (index within that part). */
  const targetOf = (over) => {
    if (!over) return null;
    const o = parse(over.id);
    if (o.kind === 'sec') return { dayId: o.a, part: o.b, index: entriesIn(o.a, o.b).length };
    if (o.kind === 'ent') {
      const entry = (dayTemplateById[o.a]?.items || []).find((e) => e.id === o.b);
      if (!entry) return null;
      const part = partOf(entry);
      return { dayId: o.a, part, index: entriesIn(o.a, part).findIndex((e) => e.id === o.b) };
    }
    return null;
  };

  const sourceOf = (p) => {
    const entry = (dayTemplateById[p.a]?.items || []).find((e) => e.id === p.b);
    return entry ? { dayId: p.a, part: partOf(entry) } : null;
  };

  const onDragStart = ({ active: a }) => {
    const p = parse(a.id);
    setActive(p.kind === 'pal' ? p.a : dayTemplateById[p.a]?.items?.find((e) => e.id === p.b)?.activityId);
  };

  const onDragOver = ({ active: a, over }) => {
    const p = parse(a.id);
    const target = targetOf(over);
    const src = p.kind === 'ent' ? sourceOf(p) : null;
    // Reorders inside one section animate in place; show the insertion line for adds and moves.
    const samePlace = src && target && src.dayId === target.dayId && src.part === target.part;
    setHint(target && !samePlace ? target : null);
  };

  const onDragEnd = ({ active: a, over }) => {
    setActive(null);
    setHint(null);
    const target = targetOf(over);
    if (!target) return;
    const p = parse(a.id);
    if (p.kind === 'pal') {
      addEntry(target.dayId, p.a, target.part, target.index);
    } else if (p.kind === 'ent') {
      if (p.a === target.dayId && parse(over.id).b === p.b) return; // dropped on itself
      moveEntry(p.a, p.b, target.dayId, target.part, target.index);
    }
  };

  const activeActivity = active ? activityById[active] : null;

  return (
    <>
      <div className="toolbar">
        <p>Drag activities into a day. Use one as often as you like.</p>
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
        <DndContext
          sensors={sensors}
          collisionDetection={(args) => (pointerWithin(args).length ? pointerWithin(args) : rectIntersection(args))}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => { setActive(null); setHint(null); }}
        >
          {activities.length > 0 ? (
            <div className="activity-palette" aria-label="Activities">
              {activities.map((a) => <PaletteChip key={a.id} activity={a} />)}
            </div>
          ) : (
            <p className="muted small" style={{ marginBottom: 14 }}>No activities yet. <Link to="/setup/activities">Add some first.</Link></p>
          )}
          <div className="tpl-grid">
            {dayTemplates.map((t) => (
              <DayCard key={t.id} t={t} onEdit={() => setEditing(t.id)} hint={hint} dragging={Boolean(active)} />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeActivity ? (
              <span className="chip palette-chip overlay"><span>{activeActivity.emoji}</span>{activeActivity.name}</span>
            ) : null}
          </DragOverlay>
        </DndContext>
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
