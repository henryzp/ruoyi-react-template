import type { MockHandler } from '../types';

const modules = import.meta.glob('../modules/*.ts', { eager: true }) as Record<
  string,
  { default?: MockHandler[] }
>;
const routeMap = new Map<string, MockHandler>();
for (const module of Object.values(modules)) {
  for (const handler of module.default || []) {
    const key = `${handler.method.toUpperCase()} ${handler.path}`;
    if (routeMap.has(key)) throw new Error(`Mock 路由重复：${key}`);
    routeMap.set(key, handler);
  }
}
export const findMockHandler = (method: string, path: string) =>
  routeMap.get(`${method.toUpperCase()} ${path}`);
