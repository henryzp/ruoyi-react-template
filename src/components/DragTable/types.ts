import type { TableColumnsType } from 'antd';
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core';
export interface DragTableProps<T extends object> {
  loading: boolean;
  dataSource: T[];
  columns: TableColumnsType<T>;
  rowKey: string | ((record: T) => React.Key);
  hasSortAuth?: boolean;
  onSortEnd: (result: { oldIndex: number; newIndex: number }) => void;
}
export interface DragRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key'?: React.Key;
}
export interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners | undefined;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
}
