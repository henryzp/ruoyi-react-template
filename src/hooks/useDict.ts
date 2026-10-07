import { useCallback, useSyncExternalStore } from 'react';

import { getSimpleDictDataList } from '@/api/dict';
import type { SimpleDictItem } from '@/api/dict';

type DictValueType = 'string' | 'number' | 'boolean';

interface DictEntry {
  options: SimpleDictItem[];
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  promise: Promise<void> | null;
  listeners: Set<() => void>;
}

const entry: DictEntry = {
  options: [],
  loading: false,
  refreshing: false,
  error: null,
  promise: null,
  listeners: new Set(),
};
let currentSnapshot = { ...entry };
let generation = 0;

const notify = () => {
  currentSnapshot = { ...entry };
  entry.listeners.forEach((listener) => listener());
};

const load = async (): Promise<void> => {
  if (entry.promise) return entry.promise;
  const requestGeneration = generation;
  entry.loading = entry.options.length === 0;
  entry.refreshing = entry.options.length > 0;
  entry.error = null;
  notify();
  const request = getSimpleDictDataList()
    .then(({ err, data }) => {
      if (err) throw err;
      if (requestGeneration === generation) entry.options = data ?? [];
    })
    .catch((error: unknown) => {
      if (requestGeneration === generation) {
        entry.error =
          error instanceof Error ? error : new Error('字典加载失败');
      }
    })
    .finally(() => {
      if (requestGeneration === generation) {
        entry.loading = false;
        entry.refreshing = false;
        entry.promise = null;
        notify();
      }
    });
  entry.promise = request;
  return entry.promise;
};

const subscribe = (listener: () => void) => {
  entry.listeners.add(listener);
  load().catch(() => undefined);
  return () => {
    entry.listeners.delete(listener);
  };
};

const snapshot = () => currentSnapshot;

export const refreshDict = () => load();
export const clearDict = () => {
  generation += 1;
  entry.promise = null;
  entry.options = [];
  entry.error = null;
  notify();
  if (entry.listeners.size > 0) load().catch(() => undefined);
};

/**
 * 返回一个按字典类型取选项的函数，供配置驱动的表单使用：
 * 字段的字典类型来自配置而非固定写死时，无法为每个类型单独调用 useDict。
 */
export const useDictGetter = () => {
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  return useCallback(
    (type: string) =>
      state.options
        .filter((item) => item.dictType === type)
        .map((item) => ({ label: item.label, value: String(item.value) })),
    [state.options],
  );
};

export const useDict = (type: string, valueType: DictValueType = 'string') => {
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  const options = state.options
    .filter((item) => item.dictType === type)
    .map((item) => ({ ...item, value: convertValue(item.value, valueType) }))
    .filter((item) => {
      if (valueType === 'number') return typeof item.value === 'number';
      return valueType !== 'boolean' || typeof item.value === 'boolean';
    });

  const getOption = (value: string | number | boolean | undefined) =>
    options.find((item) => String(item.value) === String(value));
  const getLabel = (value: string | number | boolean | undefined) =>
    getOption(value)?.label;

  return {
    options,
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    refresh: useCallback(() => refreshDict(), []),
    getOption,
    getLabel,
  };
};

const convertValue = (
  value: string | number,
  valueType: DictValueType,
): string | number | boolean | undefined => {
  if (valueType === 'string') return String(value);
  if (valueType === 'boolean') {
    if (String(value) === 'true') return true;
    if (String(value) === 'false') return false;
    return undefined;
  }
  if (String(value).trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};
