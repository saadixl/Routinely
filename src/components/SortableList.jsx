import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripIcon } from './Icons';

function Row({ id, children, rowClassName }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className={rowClassName}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.85 : 1, zIndex: isDragging ? 2 : 'auto', position: 'relative', boxShadow: isDragging ? 'var(--shadow-lg)' : undefined }}
    >
      <button ref={setActivatorNodeRef} className="handle" aria-label="Drag to reorder" {...attributes} {...listeners}>
        <GripIcon width={16} height={16} />
      </button>
      {children}
    </div>
  );
}

/** Vertical drag-to-reorder list. `items` are ids; `onReorder` receives the new id order. */
export default function SortableList({ items, onReorder, renderItem, className = 'group', rowClassName = 'list-row' }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(items, items.indexOf(active.id), items.indexOf(over.id)));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((id) => <Row key={id} id={id} rowClassName={rowClassName}>{renderItem(id)}</Row>)}
        </div>
      </SortableContext>
    </DndContext>
  );
}
