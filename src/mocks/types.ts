import type { RequestConfig } from '@/request';

export type MockRequestConfig = Partial<RequestConfig> | undefined;

export interface MockEnvelope<T = unknown> {
  code: number;
  data: T;
  msg: string;
}

export interface MockHandler {
  method: string;
  path: string;
  handle: (
    config: RequestConfig,
    requestConfig: MockRequestConfig,
  ) => Promise<MockEnvelope>;
}
