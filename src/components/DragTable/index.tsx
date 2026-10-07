import { createContext, useCallback, useContext, useMemo } from 'react';
import { MenuOutlined } from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { Table } from 'antd';
import type { DragHandleProps, DragRowProps, DragTableProps } from './types';
import './index.less';

const DRAG_HANDLE_COLUMN_KEY = '__drag-table-sort-handle__';

const DragContext = createContext<DragHandleProps | null>(null);
/* dnd-kit requires render-time ref/listener bindings for sortable elements. */
/* eslint-disable react-hooks/refs */
const DragHandle = () => {
  const drag = useContext(DragContext);
  if (!drag) return null;
  return (
    <button
      type="button"
      className="drag-table__handle"
      aria-label="拖拽排序"
      ref={drag.setActivatorNodeRef}
      {...drag.attributes}
      {...drag.listeners}
    >
      <MenuOutlined aria-hidden />
    </button>
  );
};
const DraggableRow = (props: DragRowProps) => {
  const id = props['data-row-key'];
  const sortable = useSortable({ id: String(id ?? '') });
  const style = {
    transform: sortable.transform
      ? `translate3d(${sortable.transform.x}px, ${sortable.transform.y}px, 0) scaleX(${sortable.transform.scaleX}) scaleY(${sortable.transform.scaleY})`
      : undefined,
    transition: sortable.transition,
  };
  return (
    <DragContext.Provider
      value={{
        attributes: sortable.attributes,
        listeners: sortable.listeners,
        setActivatorNodeRef: sortable.setActivatorNodeRef,
      }}
    >
      <tr
        {...props}
        ref={sortable.setNodeRef}
        style={{ ...props.style, ...style }}
        className={`${props.className ?? ''} drag-table__row${sortable.isDragging ? ' drag-table__row--dragging' : ''}`}
      />
    </DragContext.Provider>
  );
};
/* eslint-enable react-hooks/refs */
const DragTable = <T extends object>({
  loading,
  dataSource,
  columns,
  rowKey,
  hasSortAuth = true,
  onSortEnd,
}: DragTableProps<T>) => {
  const keyOf = useCallback(
    (row: T) =>
      String(
        typeof rowKey === 'function'
          ? rowKey(row)
          : (row[rowKey as keyof T] ?? ''),
      ),
    [rowKey],
  );
  const { ids, idByRow } = useMemo(() => {
    const rawKeys = dataSource.map((row) => {
      const value = keyOf(row);
      return value === null || value === undefined || value === ''
        ? null
        : `${typeof value}:${String(value)}`;
    });
    const counts = new Map<string, number>();
    rawKeys.forEach((key) => {
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const used = new Set<string>();
    const ids = rawKeys.map((rawKey, index) => {
      const base =
        rawKey && counts.get(rawKey) === 1
          ? `key:${rawKey}`
          : `__drag-table-row-${index}`;
      let id = base;
      let suffix = 1;
      while (used.has(id)) id = `${base}-${suffix++}`;
      used.add(id);
      return id;
    });
    const idByRow = new WeakMap<T, string>();
    dataSource.forEach((row, index) => idByRow.set(row, ids[index]));
    return { ids, idByRow };
  }, [dataSource, keyOf]);
  const resolvedRowKey = useCallback(
    (row: T) => idByRow.get(row) ?? '__drag-table-row-missing',
    [idByRow],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const cols = useMemo(
    () =>
      hasSortAuth
        ? [
            {
              title: '',
              key: DRAG_HANDLE_COLUMN_KEY,
              width: 48,
              render: () => <DragHandle />,
            },
            ...columns,
          ]
        : columns,
    [columns, hasSortAuth],
  );
  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id || !hasSortAuth) return;
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex >= 0 && newIndex >= 0) onSortEnd({ oldIndex, newIndex });
    },
    [hasSortAuth, ids, onSortEnd],
  );
  const body = (
    <Table
      loading={loading}
      pagination={false}
      dataSource={dataSource}
      columns={cols}
      rowKey={resolvedRowKey}
      components={hasSortAuth ? { body: { row: DraggableRow } } : undefined}
    />
  );
  return hasSortAuth ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {body}
      </SortableContext>
    </DndContext>
  ) : (
    body
  );
};
export default DragTable;
