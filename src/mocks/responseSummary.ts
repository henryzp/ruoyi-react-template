const MAX_DEPTH = 4;
const MAX_ITEMS = 20;
const MAX_STRING_LENGTH = 400;
const MAX_OUTPUT_LENGTH = 480;
const TRUNCATED = '…[已截断]';
const SENSITIVE_PARTS = [
  'token',
  'password',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'accesstoken',
  'refreshtoken',
];

const isSensitive = (key: string) => {
  const normalized = key.replace(/[-_\s]/g, '').toLowerCase();
  return SENSITIVE_PARTS.some((part) => normalized.includes(part));
};

const safeValue = (
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown => {
  if (value instanceof Blob)
    return { type: value.type || 'application/octet-stream', size: value.size };
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH)
      return `${value.slice(0, MAX_STRING_LENGTH)}${TRUNCATED}`;
    return value;
  }
  if (seen.has(value)) return '[Circular]';
  if (depth >= MAX_DEPTH) return '[MaxDepth]';
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      const items = value
        .slice(0, MAX_ITEMS)
        .map((item) => safeValue(item, depth + 1, seen));
      if (value.length > MAX_ITEMS)
        items.push(`[已截断：超过 ${MAX_ITEMS} 项]`);
      return items;
    }
    const result: Record<string, unknown> = {};
    const keys = Object.keys(value);
    keys.slice(0, MAX_ITEMS).forEach((key) => {
      try {
        const safe = isSensitive(key)
          ? '[REDACTED]'
          : safeValue((value as Record<string, unknown>)[key], depth + 1, seen);
        Object.defineProperty(result, key, {
          configurable: true,
          enumerable: true,
          value: safe,
          writable: true,
        });
      } catch {
        Object.defineProperty(result, key, {
          configurable: true,
          enumerable: true,
          value: '[Unserializable]',
          writable: true,
        });
      }
    });
    if (keys.length > MAX_ITEMS)
      result.__truncated = `[已截断：超过 ${MAX_ITEMS} 项]`;
    return result;
  } finally {
    seen.delete(value);
  }
};

export const toSafeResponse = (value: unknown) => {
  try {
    return safeValue(value, 0, new WeakSet<object>());
  } catch {
    return '[Unserializable]';
  }
};

const summarizeSafe = (safe: unknown) => {
  let text: string;
  try {
    text = JSON.stringify(safe) ?? 'undefined';
  } catch {
    text = '[Unserializable]';
  }
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > MAX_OUTPUT_LENGTH
    ? `${compact.slice(0, MAX_OUTPUT_LENGTH - TRUNCATED.length)}${TRUNCATED}`
    : compact;
};

export const formatResponseSummary = (value: unknown) =>
  summarizeSafe(toSafeResponse(value));

export const formatSafeResponseSummary = (value: unknown) =>
  summarizeSafe(value);
