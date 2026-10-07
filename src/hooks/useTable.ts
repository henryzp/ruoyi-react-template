import type { Key, MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PaginationProps, TableProps } from 'antd';

type Result<T> = { records: T[]; size: number; current: number; total: number };
type FetchResult<T> = { err?: unknown; data?: Result<T> };
type Page = { pageNo: number; pageSize: number; total: number };
type Base<T> = {
  loading: boolean;
  dataSource: T[];
  pagination: PaginationProps;
  handleFetchData: (args: { resetPageNo?: boolean }) => Promise<void>;
  rowKey: string;
};
type Selected<T> = {
  selectedRows: T[];
  rowSelection: TableProps<T>['rowSelection'];
  onRow: TableProps<T>['onRow'];
  resetSelectRowKeysFn: () => void;
};
type Props<T> = {
  fetchData: (
    pagination: Page,
    resetPageNo?: boolean,
  ) => Promise<FetchResult<T>>;
  hasRowSelection?: boolean;
  resetSelectRowKeys?: boolean;
  defaultSelectedRows?: T[];
  rowKey?: string;
  hasFetchAuth?: boolean;
  defaultPagination?: { pageSize?: number; pageNo?: number };
  rowSelectionType?: 'checkbox' | 'radio';
  extraDependencies?: readonly unknown[];
  defaultPageSizeOptions?: string[];
};

const DEFAULT_PAGE = { pageSize: 10, pageNo: 1 };
const DEFAULT_OPTIONS = ['10', '20', '50', '100'];
const INTERACTIVE =
  'button,a,input,textarea,select,[role="button"],[data-stop-propagation="true"],.no-row-click';
const isInteractiveElement = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  const cell = target.closest('td,th');
  if (!cell) return false;
  const found = target.closest(INTERACTIVE);
  return Boolean(found && cell.contains(found));
};

export default function useTable<
  HasSelection extends boolean = false,
  T = Record<string, unknown>,
>(
  props: Props<T>,
): Base<T> & (HasSelection extends true ? Selected<T> : Partial<Selected<T>>) {
  const {
    fetchData,
    hasRowSelection = false,
    resetSelectRowKeys = true,
    defaultSelectedRows = [],
    rowKey = 'id',
    hasFetchAuth = true,
    defaultPagination = DEFAULT_PAGE,
    defaultPageSizeOptions = DEFAULT_OPTIONS,
    rowSelectionType = 'checkbox',
    extraDependencies = [],
  } = props;
  const fetchRef = useRef(fetchData);
  fetchRef.current = fetchData;
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<T[]>([]);
  const [page, setPage] = useState<Page>({
    ...DEFAULT_PAGE,
    ...defaultPagination,
    total: 0,
  });
  const pageRef = useRef(page);
  pageRef.current = page;
  const dependencySnapshot = useRef<readonly unknown[]>(extraDependencies);
  const dependencyVersion = useRef(0);
  if (
    dependencySnapshot.current.length !== extraDependencies.length ||
    extraDependencies.some(
      (item, index) => !Object.is(item, dependencySnapshot.current[index]),
    )
  ) {
    dependencySnapshot.current = extraDependencies;
    dependencyVersion.current += 1;
  }
  const [selectedRows, setSelectedRows] = useState<T[]>(defaultSelectedRows);
  const sequence = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const handleFetchData = useCallback(
    async ({ resetPageNo }: { resetPageNo?: boolean }) => {
      if (resetPageNo && pageRef.current.pageNo !== 1) {
        sequence.current += 1;
        setPage((current) => ({ ...current, pageNo: 1 }));
        return;
      }
      const id = ++sequence.current;
      setLoading(true);
      if (hasRowSelection && resetSelectRowKeys) setSelectedRows([]);
      try {
        const result = await fetchRef.current(pageRef.current, resetPageNo);
        if (id !== sequence.current || !mounted.current) return;
        const resultData = result.data;
        if (!result.err && resultData) {
          const pageSize = resultData.size > 0 ? resultData.size : 1;
          const lastPage = Math.max(1, Math.ceil(resultData.total / pageSize));
          const effectivePage = Math.min(resultData.current, lastPage);
          setDataSource(resultData.records);
          setPage((p) => ({
            ...p,
            pageSize: resultData.size,
            pageNo: effectivePage,
            total: resultData.total,
          }));
        }
      } finally {
        if (id === sequence.current && mounted.current) setLoading(false);
      }
    },
    [hasRowSelection, resetSelectRowKeys],
  );
  const selectedKeys = useMemo(
    () => selectedRows.map((row) => row[rowKey as keyof T] as Key),
    [selectedRows, rowKey],
  );
  const onSelect = useCallback(
    (record: T, selected: boolean) =>
      setSelectedRows((rows) => {
        if (rowSelectionType === 'radio') return selected ? [record] : [];
        const isOtherRow = (row: T) =>
          row[rowKey as keyof T] !== record[rowKey as keyof T];
        return selected
          ? [...rows.filter(isOtherRow), record]
          : rows.filter(isOtherRow);
      }),
    [rowKey, rowSelectionType],
  );
  const rowSelection = useMemo<TableProps<T>['rowSelection']>(
    () =>
      hasRowSelection
        ? {
            type: rowSelectionType,
            fixed: true,
            selectedRowKeys: selectedKeys,
            onSelect,
            onSelectAll: (selected, rows, changeRows) =>
              setSelectedRows((current) => {
                const valid = (selected ? rows : changeRows).filter(Boolean);
                if (selected) {
                  const merged = new Map<Key, T>(
                    current.map((row) => [row[rowKey as keyof T] as Key, row]),
                  );
                  valid.forEach((row) =>
                    merged.set(row[rowKey as keyof T] as Key, row),
                  );
                  return [...merged.values()];
                }
                const removed = new Set(
                  valid.map((row) => row[rowKey as keyof T] as Key),
                );
                return current.filter(
                  (row) => !removed.has(row[rowKey as keyof T] as Key),
                );
              }),
          }
        : undefined,
    [hasRowSelection, onSelect, rowKey, rowSelectionType, selectedKeys],
  );
  const onRow = useMemo<TableProps<T>['onRow']>(
    () =>
      hasRowSelection
        ? (record) => ({
            onClick: (event: MouseEvent) => {
              if (!isInteractiveElement(event.target))
                onSelect(
                  record,
                  rowSelectionType === 'radio' ||
                    !selectedKeys.includes(record[rowKey as keyof T] as Key),
                );
            },
          })
        : undefined,
    [hasRowSelection, onSelect, rowKey, rowSelectionType, selectedKeys],
  );
  const extraDependenciesVersion = dependencyVersion.current;
  const previousExtraDependenciesVersion = useRef(extraDependenciesVersion);
  useEffect(() => {
    const dependenciesChanged =
      previousExtraDependenciesVersion.current !== extraDependenciesVersion;
    previousExtraDependenciesVersion.current = extraDependenciesVersion;
    if (dependenciesChanged && page.pageNo !== 1) {
      sequence.current += 1;
      setPage((current) => ({ ...current, pageNo: 1 }));
      return;
    }
    if (hasFetchAuth) handleFetchData({}).catch(() => undefined);
  }, [
    hasFetchAuth,
    handleFetchData,
    page.pageNo,
    page.pageSize,
    extraDependenciesVersion,
  ]);
  const pagination = useMemo<PaginationProps>(
    () => ({
      pageSize: page.pageSize,
      current: page.pageNo,
      total: page.total,
      showSizeChanger: true,
      showQuickJumper: true,
      pageSizeOptions: defaultPageSizeOptions,
      showTotal: (total) => `共 ${total} 条`,
      onChange: (current, size) => {
        if (size !== page.pageSize) setDataSource([]);
        setPage((p) => ({
          ...p,
          pageNo: size !== p.pageSize ? 1 : current,
          pageSize: size,
        }));
      },
    }),
    [defaultPageSizeOptions, page],
  );
  const resetSelectRowKeysFn = useCallback(() => setSelectedRows([]), []);
  return {
    loading,
    dataSource,
    pagination,
    handleFetchData,
    rowKey,
    ...(hasRowSelection
      ? { selectedRows, rowSelection, onRow, resetSelectRowKeysFn }
      : {}),
  } as Base<T> &
    (HasSelection extends true ? Selected<T> : Partial<Selected<T>>);
}
