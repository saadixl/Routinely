import { useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, pointerWithin, rectIntersection,
  useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import { useData } from '../context/DataContext';
import DayPicker from './DayPicker';
import Pill from './Pill';
import { formatTotal } from '../lib/duration';

function Draggable({ id, dayTemplateId, children }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { dayTemplateId } });
  // Keyboard users pick via the menu instead; keep the wrapper out of the tab order.
  const { tabIndex, role, ...a11y } = attributes;
  return (
    <span ref={setNodeRef} className={`drag-pill${isDragging ? ' dragging' : ''}`} {...a11y} {...listeners}>
      {children}
    </span>
  );
}

function DayRow({ index, row, onAssign }) {
  const { dayTemplateById, activityById } = useData();
  const { setNodeRef, isOver } = useDroppable({ id: `drop:${index}` });
  const valid = row.dayTemplateId && dayTemplateById[row.dayTemplateId] ? row.dayTemplateId : null;
  const entries = valid ? (dayTemplateById[valid].items || []).filter((e) => activityById[e.activityId]) : [];
  const dayMinutes = entries.reduce((sum, e) => sum + (e.minutes || 0), 0);

  const picker = (
    <DayPicker value={valid} onChange={(id) => onAssign([[index, id]])} onReset={row.onReset} placeholder="Rest day" />
  );

  return (
    <div ref={setNodeRef} className={`day-row${isOver ? ' over' : ''}${row.today ? ' today' : ''}`}>
      <div className="when">
        <div className="wd">{row.label}</div>
        {row.sub && <div className="dt">{row.sub}</div>}
      </div>
      <div className="slot">
        {valid ? <Draggable id={`row:${index}`} dayTemplateId={valid}>{picker}</Draggable> : picker}
        {row.changed && <span className="changed">Changed</span>}
      </div>
      {valid && dayMinutes > 0 && <span className="day-total">{formatTotal(dayMinutes)}</span>}
      {valid && (
        <div className="emoji-strip" aria-hidden="true">
          {entries.slice(0, 6).map((e) => (
            <span key={e.id} title={activityById[e.activityId].name}>{activityById[e.activityId].emoji}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Seven day rows. Pick a day type from each row's menu, or drag a day type
 * from the palette (or from another row — the two swap).
 */
export default function WeekBoard({ rows, onAssign }) {
  const { dayTemplates, dayTemplateById } = useData();
  const [active, setActive] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const onDragEnd = ({ active: a, over }) => {
    setActive(null);
    if (!over) return;
    const dtId = a.data.current?.dayTemplateId;
    const to = Number(String(over.id).slice(5));
    const from = String(a.id).startsWith('row:') ? Number(String(a.id).slice(4)) : null;
    if (from === null) return onAssign([[to, dtId]]);
    if (from === to) return undefined;
    const target = rows[to].dayTemplateId && dayTemplateById[rows[to].dayTemplateId] ? rows[to].dayTemplateId : null;
    return onAssign([[to, dtId], [from, target]]); // swap in a single write
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
      {dayTemplates.length > 0 && (
        <div className="palette">
          <span className="hint">Drag onto a day</span>
          {dayTemplates.map((t) => (
            <Draggable key={t.id} id={`pal:${t.id}`} dayTemplateId={t.id}>
              <Pill color={t.color}>{t.name}</Pill>
            </Draggable>
          ))}
        </div>
      )}
      <div className="group week-list">
        {rows.map((row, i) => <DayRow key={i} index={i} row={row} onAssign={onAssign} />)}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeT ? <span className="drag-pill overlay pill" style={{ '--c': activeT.color }}><span className="dot" /><span className="label">{activeT.name}</span></span> : null}
      </DragOverlay>
    </DndContext>
  );
}
