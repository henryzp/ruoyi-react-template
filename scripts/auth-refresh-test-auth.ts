export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const getToken = () => globalThis.__authTestToken ?? null;
export const getAccessToken = getToken;
export const getRefreshToken = () => globalThis.__authTestRefreshToken ?? null;
export const getSessionId = () => globalThis.__authTestSessionId ?? null;
export const ensureSession = () => {
  if (!getToken()) return null;
  if (!getSessionId()) {
    globalThis.__authTestSessionId = `session-${Date.now()}`;
  }
  return getSessionId();
};
export const establishSession = (tokens: AuthTokens) => {
  globalThis.__authTestSessionId = `session-${Date.now()}-${Math.random()}`;
  setAuthTokens(tokens, globalThis.__authTestSessionId);
  emitAuthTestLifecycle("established");
  return globalThis.__authTestSessionId;
};
export const setAuthTokens = (
  tokens: AuthTokens,
  expectedSessionId?: string | null,
) => {
  if (expectedSessionId !== undefined && getSessionId() !== expectedSessionId) {
    return false;
  }
  globalThis.__authTestToken = tokens.accessToken;
  globalThis.__authTestRefreshToken = tokens.refreshToken;
  return true;
};
export const clearSession = (expectedSessionId?: string | null) => {
  if (expectedSessionId !== undefined && getSessionId() !== expectedSessionId) {
    return false;
  }
  globalThis.__authTestToken = null;
  globalThis.__authTestRefreshToken = null;
  globalThis.__authTestSessionId = null;
  emitAuthTestLifecycle("cleared");
  return true;
};
export const subscribeAuthLifecycle = (listener: (event: string) => void) => {
  const listeners = (globalThis.__authTestSessionListeners ??= new Set());
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const emitAuthTestLifecycle = (event: string) => {
  globalThis.__authTestSessionListeners?.forEach(
    (listener: (value: string) => void) => listener(event),
  );
};
export const clearAuth = (expectedSessionId?: string | null) => {
  if (expectedSessionId !== undefined && getSessionId() !== expectedSessionId) {
    return false;
  }
  globalThis.__authTestClearCount = (globalThis.__authTestClearCount ?? 0) + 1;
  return clearSession(expectedSessionId);
};
