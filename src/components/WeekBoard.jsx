import { useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, pointerWithin, rectIntersection,
  useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import { useData } from '../context/DataContext';

function DayCard({ t, overlay, dragging, ...rest }) {
  const count = (t.activities || []).length;
  return (
    <div className={`day-card${overlay ? ' overlay' : ''}${dragging ? ' dragging' : ''}`} style={{ background: t.color }} {...rest}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
      <span className="count">{count}</span>
    </div>
  );
}

function DraggableDay({ id, t }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { dayTemplateId: t.id } });
  return <DayCard ref={setNodeRef} t={t} dragging={isDragging} {...attributes} {...listeners} />;
}

function Slot({ index, slot, onAssign, dayTemplates, dayTemplateById }) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop:${index}` });
  const t = slot.dayTemplateId ? { id: slot.dayTemplateId, ...dayTemplateById[slot.dayTemplateId] } : null;
  const valid = t && dayTemplateById[slot.dayTemplateId];

  return (
    <div ref={setNodeRef} className={`slot${isOver ? ' over' : ''}${valid ? ' filled' : ''}${slot.today ? ' today' : ''}`}>
      <div className="slot-label">
        <span>{slot.label}</span>
        {slot.sub && <span className="date">{slot.sub}</span>}
      </div>
      {valid ? <DraggableDay id={`slot:${index}`} t={t} /> : <div className="slot-empty">Drop a day</div>}
      {(slot.note || slot.onReset) && (
        <div className="faint small slot-note">
          {slot.note}
          {slot.onReset && <button className="link-btn" onClick={slot.onReset}>Reset</button>}
        </div>
      )}
      <select
        className="slot-select"
        value={valid ? slot.dayTemplateId : ''}
        onChange={(e) => onAssign(index, e.target.value || null)}
        aria-label={`Day template for ${slot.label}`}
      >
        <option value="">— None —</option>
        {dayTemplates.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
    </div>
  );
}

/**
 * Seven droppable day slots plus a palette of draggable day templates.
 *  - drag palette → slot: assign
 *  - drag slot → slot: swap the two days
 *  - drag slot → outside (when `clearOnDropOutside`): clear the slot
 * Every slot also has a select as a tap-friendly fallback.
 */
export default function WeekBoard({ slots, onAssign, clearOnDropOutside = false }) {
  const { dayTemplates, dayTemplateById } = useData();
  const [active, setActive] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const onDragEnd = ({ active: a, over }) => {
    setActive(null);
    const dtId = a.data.current?.dayTemplateId;
    const from = String(a.id).startsWith('slot:') ? Number(String(a.id).slice(5)) : null;
    if (!over) {
      if (from !== null && clearOnDropOutside) onAssign(from, null);
      return;
    }
    const to = Number(String(over.id).slice(5));
    if (from === null) {
      onAssign(to, dtId);
    } else if (from !== to) {
      const targetDt = slots[to].dayTemplateId && dayTemplateById[slots[to].dayTemplateId] ? slots[to].dayTemplateId : null;
      onAssign(to, dtId);
      onAssign(from, targetDt);
    }
  };

  const activeT = active ? dayTemplateById[active] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => (pointerWithin(args).length ? pointerWithin(args) : rectIntersection(args))}
      onDragStart={({ active: a }) => setActive(a.data.current?.dayTemplateId)}
      onDragCancel={() => setActive(null)}
      onDragEnd={onDragEnd}
    >
      <div className="palette">
        {dayTemplates.length === 0 && <span className="muted small">Create day templates first, then drag them onto the week.</span>}
        {dayTemplates.map((t) => <DraggableDay key={t.id} id={`pal:${t.id}`} t={t} />)}
      </div>
      <div className="week-board">
        {slots.map((slot, i) => (
          <Slot key={i} index={i} slot={slot} onAssign={onAssign} dayTemplates={dayTemplates} dayTemplateById={dayTemplateById} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeT ? <DayCard t={activeT} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
