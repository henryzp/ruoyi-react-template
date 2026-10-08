export const getToken = () => globalThis.__authTestToken ?? null;
export const getRefreshToken = () => globalThis.__authTestRefreshToken ?? null;
export const clearAuth = () => {
  globalThis.__authTestClearCount = (globalThis.__authTestClearCount ?? 0) + 1;
  globalThis.__authTestToken = null;
  globalThis.__authTestRefreshToken = null;
};
