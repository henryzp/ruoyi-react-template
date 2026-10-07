import { useMemo, useRef, useState } from 'react';
import { Select } from 'antd';
import type { CreatableSelectProps } from './types';

const normalizeLabel = (label: string) => label.trim();
const getLabelKey = (label: string) => normalizeLabel(label).toLowerCase();

function appendUnique(
  target: Map<string, string>,
  labels: string[] | undefined,
) {
  for (const rawLabel of labels ?? []) {
    const label = normalizeLabel(rawLabel);
    if (!label) continue;
    const key = getLabelKey(label);
    if (!target.has(key)) target.set(key, label);
  }
}

const arraysEqual = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((item, index) => item === right[index]);

/**
 * 可创建选项的多选下拉：输入回车即把未知值收为选项，
 * 并回调 onCreate 交由外部后台尽力持久化；持久化失败不影响表单值。
 */
export default function CreatableSelect({
  value,
  onChange,
  options,
  onCreate,
  placeholder,
  disabled,
  className,
}: CreatableSelectProps) {
  // 当前页面会话中新建的选项：即使外部 options 不再重新请求，新选项也立即出现在下拉中
  const [localOptions, setLocalOptions] = useState<string[]>([]);
  const pendingCreateKeys = useRef(new Set<string>());

  // 外部可选项、本地新增项和当前选中项始终取并集
  const mergedOptionMap = useMemo(() => {
    const map = new Map<string, string>();
    appendUnique(map, options);
    appendUnique(map, localOptions);
    appendUnique(map, value);
    return map;
  }, [options, localOptions, value]);

  const mergedOptions = useMemo(
    () => Array.from(mergedOptionMap.values()),
    [mergedOptionMap],
  );

  // 表单值和本地选项先同步更新，持久化在后台尽力执行
  const persistLabel = async (label: string) => {
    const key = getLabelKey(label);
    if (!onCreate || pendingCreateKeys.current.has(key)) return;
    pendingCreateKeys.current.add(key);
    try {
      await onCreate(label);
    } finally {
      pendingCreateKeys.current.delete(key);
    }
  };

  const handleChange = (labels: string[]) => {
    const normalizedMap = new Map<string, string>();
    for (const rawLabel of labels) {
      const label = normalizeLabel(rawLabel);
      if (!label) continue;
      const key = getLabelKey(label);
      if (!normalizedMap.has(key)) {
        normalizedMap.set(key, mergedOptionMap.get(key) ?? label);
      }
    }
    const normalizedLabels = Array.from(normalizedMap.values());

    if (!arraysEqual(value ?? [], normalizedLabels)) {
      onChange?.(normalizedLabels);
    }

    const createdLabels = normalizedLabels.filter(
      (label) => !mergedOptionMap.has(getLabelKey(label)),
    );
    if (createdLabels.length === 0) return;
    setLocalOptions((prev) => [...prev, ...createdLabels]);
    Promise.all(createdLabels.map((label) => persistLabel(label))).catch(
      () => undefined,
    );
  };

  return (
    <Select
      mode="tags"
      value={value ?? []}
      onChange={handleChange}
      options={mergedOptions.map((label) => ({ label, value: label }))}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
