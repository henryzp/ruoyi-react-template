export type RouterMode = 'hash' | 'browser';

export const resolveRouterMode = (
  configuredMode: string | undefined,
  appMode: string,
): RouterMode => {
  if (configuredMode === 'hash' || configuredMode === 'browser') return configuredMode;
  return appMode === 'mock' ? 'hash' : 'browser';
};
