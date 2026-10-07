import type { MockEnvelope, MockHandler } from './types';

export const success = <T>(data: T): MockEnvelope<T> => ({
  code: 0,
  data,
  msg: '成功',
});

export const failure = <T = never>(
  message: string,
  code = 1,
): MockEnvelope<T | null> => ({
  code,
  data: null,
  msg: message,
});

export const get =
  <T>(handler: () => T): MockHandler['handle'] =>
  async () =>
    success(handler());

export const post =
  <T, Body>(
    handler: (body: Body) => MockEnvelope<T | null>,
  ): MockHandler['handle'] =>
  async (_config, requestConfig) =>
    handler((requestConfig?.data || {}) as Body);
