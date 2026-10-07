import type { RequestConfig, ResultFormat } from '@/request';
import { findMockHandler } from './adapter/registry';
import type { MockRequestConfig } from './types';

export const makeRequest = <Payload>(config: RequestConfig) => async (
  requestConfig?: MockRequestConfig,
): Promise<ResultFormat<Payload>> => {
  const merged = { ...config, ...requestConfig } as RequestConfig & { mockUrl?: string };
  const method = (merged.method || 'GET').toUpperCase();
  const path = merged.mockUrl || merged.url;
  const handler = findMockHandler(method, path);
  if (!handler) return { data: null, err: new Error(`未配置 mock 接口：${method} ${path}`), response: null };
  try {
    const envelope = await handler.handle(merged, requestConfig);
    if (envelope.code !== 0) return { data: null, err: new Error(envelope.msg), response: null };
    return { data: envelope.data as Payload, err: null, response: null };
  } catch (error) {
    return { data: null, err: error instanceof Error ? error : new Error(String(error)), response: null };
  }
};

export const request = async <Payload = unknown>(
  config: RequestConfig,
): Promise<Payload> => {
  const { data, err } = await makeRequest<Payload>(config)();
  if (err) throw err;
  return data as Payload;
};

export default makeRequest;
