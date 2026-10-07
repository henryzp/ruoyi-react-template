import type { MockHandler } from '../types';
import { failure, success } from '../utils';

type Row = Record<string, any> & { id: number };
const tables: Record<string, Row[]> = {};
const seed = (name: string) => (tables[name] ||= Array.from({ length: 8 }, (_, i): Row => ({
  id: i + 1, name: `${name}-${i + 1}`, status: 0, sort: i + 1,
  createTime: '2026-01-01 10:00:00',
})));

const bodyOf = (config: any) => (config?.data || {}) as Record<string, any>;
const paramsOf = (config: any) => (config?.params || {}) as Record<string, any>;
const handlers: MockHandler[] = [];
const add = (method: string, path: string, handle: MockHandler['handle']) => handlers.push({ method, path, handle });

for (const [resource, base] of Object.entries({
  user: '/system/user', role: '/system/role', post: '/system/post',

})) {
  add('GET', `${base}/page`, async (_c, rc) => {
    const rows = seed(resource); const b = paramsOf(rc);
    const page = Number(b.pageNo || b.page || 1); const size = Number(b.pageSize || 10);
    return success({ list: rows.slice((page - 1) * size, page * size), total: rows.length });
  });
  add('GET', `${base}/get`, async (_c, rc) => {
    const row = seed(resource).find((x) => x.id === Number(paramsOf(rc).id));
    return row ? success(row) : failure('数据不存在');
  });
  for (const action of ['create', 'update']) add(action === 'create' ? 'POST' : 'PUT', `${base}/${action}`, async (_c, rc) => {
    const b = bodyOf(rc); const rows = seed(resource);
    if (action === 'create') rows.push({ ...b, id: Math.max(0, ...rows.map((x) => x.id)) + 1 });
    else { const i = rows.findIndex((x) => x.id === Number(b.id)); if (i >= 0) rows[i] = { ...rows[i], ...b }; }
    return success(true);
  });
  for (const action of ['delete', 'delete-list']) add('DELETE', `${base}/${action}`, async (_c, rc) => {
    const params = paramsOf(rc);
    const ids = action === 'delete' ? [Number(params.id)] : String(params.ids || '').split(',').map(Number).filter(Number.isFinite);
    tables[resource] = seed(resource).filter((x) => !ids.includes(x.id)); return success(true);
  });
  add('GET', `${base}/export-excel`, async () => success([]));
}

add('GET', '/system/dept/list', async () => success(seed('dept')));
add('GET', '/system/dept/get', async (_c, rc) => success(seed('dept').find((x) => x.id === Number(paramsOf(rc).id)) || seed('dept')[0]));
for (const action of ['create', 'update']) add(action === 'create' ? 'POST' : 'PUT', `/system/dept/${action}`, async (_c, rc) => {
  const b = bodyOf(rc); const rows = seed('dept');
  if (action === 'create') rows.push({ ...b, id: rows.length + 1 }); else { const i = rows.findIndex((x) => x.id === Number(b.id)); if (i >= 0) rows[i] = { ...rows[i], ...b }; }
  return success(true);
});
for (const action of ['delete', 'delete-list']) add('DELETE', `/system/dept/${action}`, async (_c, rc) => { const params = paramsOf(rc); const ids = action === 'delete' ? [Number(params.id)] : String(params.ids || '').split(',').map(Number).filter(Number.isFinite); tables.dept = seed('dept').filter((x) => !ids.includes(x.id)); return success(true); });
add('GET', '/system/menu/list', async () => success(seed('menu')));
add('GET', '/system/menu/get', async (_c, rc) => success(seed('menu').find((x) => x.id === Number(paramsOf(rc).id)) || seed('menu')[0]));
for (const action of ['create', 'update']) add(action === 'create' ? 'POST' : 'PUT', `/system/menu/${action}`, async () => success(true));
add('DELETE', '/system/menu/delete', async (_c, rc) => { const id = Number(paramsOf(rc).id); tables.menu = seed('menu').filter((x) => x.id !== id); return success(true); });
add('PUT', '/system/user/update-password', async () => success(true));
export default handlers;
