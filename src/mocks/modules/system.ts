import type { MockHandler, MockRequestConfig } from '../types';
import { failure, success } from '../utils';

type Row = Record<string, any> & { id: number };
const now = () => Date.now();
const users: Row[] = [
  { id: 1, username: 'admin', nickname: '系统管理员', remark: 'Mock administrator', email: 'admin@example.test', mobile: '13800000001', avatar: '', deptId: 1, deptName: '研发部', postIds: [1], sex: 0, status: 0, loginIp: '127.0.0.1', loginDate: now(), createTime: now() },
  { id: 2, username: 'test', nickname: '测试用户', remark: 'Mock test account', email: 'test@example.test', mobile: '13800000002', avatar: '', deptId: 2, deptName: '产品部', postIds: [2], sex: 2, status: 0, loginIp: '127.0.0.1', loginDate: now(), createTime: now() },
];
const mockPasswords: Record<string, string> = { admin: 'admin123', test: 'test123' };
const roles: Row[] = [
  { id: 1, name: '超级管理员', code: 'super_admin', remark: 'Mock super administrator', sort: 1, status: 0, type: 1, dataScope: 1, dataScopeDeptIds: null, createTime: now() },
  { id: 2, name: '测试角色', code: 'test_user', remark: 'Mock test role', sort: 2, status: 0, type: 2, dataScope: 5, dataScopeDeptIds: null, createTime: now() },
];
const userRoleIds: Record<number, number[]> = { 1: [1], 2: [2] };
const roleMenuIds: Record<number, number[]> = { 1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 2: [1, 2, 3, 4, 5, 6] };
const menus: Row[] = [
  { id: 1, parentId: 0, type: 1, sort: 1, status: 0, name: '系统管理', permission: '', path: 'system', icon: 'SettingOutlined', component: '', componentName: null, visible: true, keepAlive: false, alwaysShow: true, createTime: now() },
  { id: 2, parentId: 1, type: 2, sort: 1, status: 0, name: '用户管理', permission: '', path: 'user', icon: 'UserOutlined', component: 'system/user/index', componentName: 'SystemUser', visible: true, keepAlive: false, alwaysShow: false, createTime: now() },
  { id: 3, parentId: 1, type: 2, sort: 2, status: 0, name: '角色管理', permission: '', path: 'role', icon: 'TeamOutlined', component: 'system/role/index', componentName: 'SystemRole', visible: true, keepAlive: false, alwaysShow: false, createTime: now() },
  { id: 4, parentId: 1, type: 2, sort: 3, status: 0, name: '菜单管理', permission: '', path: 'menu', icon: 'MenuOutlined', component: 'system/menu/index', componentName: 'SystemMenu', visible: true, keepAlive: false, alwaysShow: false, createTime: now() },
  { id: 5, parentId: 1, type: 2, sort: 4, status: 0, name: '字典管理', permission: '', path: 'dict', icon: 'BookOutlined', component: 'system/dict/index', componentName: 'SystemDictType', visible: true, keepAlive: false, alwaysShow: false, createTime: now() },
  { id: 6, parentId: 2, type: 3, sort: 1, status: 0, name: '查询用户', permission: 'system:user:query', path: '', icon: '', component: '', componentName: null, visible: true, keepAlive: false, alwaysShow: false, createTime: now() },
  { id: 7, parentId: 2, type: 3, sort: 2, status: 0, name: '新增用户', permission: 'system:user:create', path: '', icon: '', component: '', componentName: null, visible: true, keepAlive: false, alwaysShow: false, createTime: now() },
  { id: 8, parentId: 2, type: 3, sort: 3, status: 0, name: '修改用户', permission: 'system:user:update', path: '', icon: '', component: '', componentName: null, visible: true, keepAlive: false, alwaysShow: false, createTime: now() },
  { id: 9, parentId: 2, type: 3, sort: 4, status: 0, name: '删除用户', permission: 'system:user:delete', path: '', icon: '', component: '', componentName: null, visible: true, keepAlive: false, alwaysShow: false, createTime: now() },
  { id: 10, parentId: 5, type: 3, sort: 1, status: 0, name: '查询字典', permission: 'system:dict:query', path: '', icon: '', component: '', componentName: null, visible: true, keepAlive: false, alwaysShow: false, createTime: now() },
  { id: 11, parentId: 5, type: 3, sort: 2, status: 0, name: '新增字典', permission: 'system:dict:create', path: '', icon: '', component: '', componentName: null, visible: true, keepAlive: false, alwaysShow: false, createTime: now() },
  { id: 12, parentId: 5, type: 3, sort: 3, status: 0, name: '修改字典', permission: 'system:dict:update', path: '', icon: '', component: '', componentName: null, visible: true, keepAlive: false, alwaysShow: false, createTime: now() },
  { id: 13, parentId: 5, type: 3, sort: 4, status: 0, name: '删除字典', permission: 'system:dict:delete', path: '', icon: '', component: '', componentName: null, visible: true, keepAlive: false, alwaysShow: false, createTime: now() },
];
const departments: Row[] = [
  { id: 1, name: '研发部', parentId: 0, sort: 1, leaderUserId: 1, phone: '010-5550001', email: 'dev@example.test', status: 0, createTime: now() },
  { id: 2, name: '产品部', parentId: 1, sort: 1, leaderUserId: 2, phone: '010-5550002', email: 'product@example.test', status: 0, createTime: now() },
];
const posts: Row[] = [
  { id: 1, code: 'DEV', name: '开发工程师', sort: 1, status: 0, remark: '', createTime: now() },
  { id: 2, code: 'PM', name: '产品经理', sort: 2, status: 0, remark: '', createTime: now() },
];

const bodyOf = (config: MockRequestConfig) => (config?.data || {}) as Record<string, any>;
const paramsOf = (config: MockRequestConfig) => (config?.params || {}) as Record<string, any>;
const handlers: MockHandler[] = [];
const add = (method: string, path: string, handle: MockHandler['handle']) => handlers.push({ method, path, handle });
const nextId = (rows: Row[]) => Math.max(0, ...rows.map((row) => row.id)) + 1;
const removeIds = (rows: Row[], ids: number[]) => rows.filter((row) => !ids.includes(row.id));
const filteredPage = (rows: Row[], params: Record<string, any>, keys: string[]) => {
  const matches = rows.filter((row) => keys.every((key) => {
    if (params[key] === undefined || params[key] === '') return true;
    if (key === 'roleId') return (userRoleIds[row.id] || []).includes(Number(params[key]));
    if (key === 'createTime' && Array.isArray(params[key]) && params[key].length >= 2) {
      const start = new Date(params[key][0]).getTime();
      const end = new Date(params[key][1]).getTime();
      return row.createTime >= start && row.createTime <= end;
    }
    if (['status', 'deptId'].includes(key)) return String(row[key]) === String(params[key]);
    return String(row[key] ?? '').toLowerCase().includes(String(params[key]).toLowerCase());
  }));
  const pageNo = Math.max(1, Number(params.pageNo || params.page || 1));
  const pageSize = Math.max(1, Number(params.pageSize || 10));
  return success({ list: matches.slice((pageNo - 1) * pageSize, pageNo * pageSize), total: matches.length });
};
const byId = (rows: Row[], id: unknown) => rows.find((row) => row.id === Number(id));
const withUserDeptName = (user: Row) => ({ ...user, deptName: departments.find((dept) => dept.id === user.deptId)?.name ?? null });
const idsOf = (params: Record<string, any>) => String(params.ids || '').split(',').map(Number).filter(Number.isFinite);
const userHasRole = (id: number) => Object.values(userRoleIds).some((ids) => ids.includes(id));
const menuHasChildren = (id: number) => menus.some((menu) => menu.parentId === id);

for (const [resource, base, rows, filters] of [
  ['user', '/system/user', users, ['username', 'mobile', 'status', 'deptId', 'roleId', 'createTime']],
  ['role', '/system/role', roles, ['code', 'name', 'status']],
  ['post', '/system/post', posts, ['code', 'name', 'status']],
] as const) {
  add('GET', `${base}/page`, async (_c, rc) => {
    const result = filteredPage(rows, paramsOf(rc), [...filters]);
    return resource === 'user' ? success({ ...result.data, list: result.data.list.map(withUserDeptName) }) : result;
  });
  add('GET', `${base}/get`, async (_c, rc) => {
    const row = byId(rows, paramsOf(rc).id);
    return row ? success(resource === 'user' ? withUserDeptName(row) : { ...row }) : failure(`${resource}不存在`, 404);
  });
  add('POST', `${base}/create`, async (_c, rc) => {
    const input = bodyOf(rc);
    if (resource === 'user' && users.some((user) => user.username === input.username)) return failure('用户名已存在');
    if (resource === 'user' && (typeof input.password !== 'string' || !input.password)) return failure('初始密码不能为空');
    if (resource === 'role' && roles.some((role) => role.code === input.code)) return failure('角色编码已存在');
    const { password, ...record } = input;
    rows.push({ ...record, id: nextId(rows), createTime: now() });
    if (resource === 'user') {
      userRoleIds[rows[rows.length - 1].id] = [];
      mockPasswords[input.username] = password;
    }
    return success(true);
  });
  add('PUT', `${base}/update`, async (_c, rc) => {
    const input = bodyOf(rc);
    const index = rows.findIndex((row) => row.id === Number(input.id));
    if (index < 0) return failure(`${resource}不存在`, 404);
    if (resource === 'user' && users.some((user) => user.id !== input.id && user.username === input.username)) return failure('用户名已存在');
    if (resource === 'role' && roles.some((role) => role.id !== input.id && role.code === input.code)) return failure('角色编码已存在');
    const updateInput = { ...input };
    if (resource === 'user') delete updateInput.password;
    rows[index] = { ...rows[index], ...updateInput, id: rows[index].id };
    return success(true);
  });
  for (const action of ['delete', 'delete-list']) add('DELETE', `${base}/${action}`, async (_c, rc) => {
    const ids = action === 'delete' ? [Number(paramsOf(rc).id)] : idsOf(paramsOf(rc));
    if (resource === 'user' && ids.includes(1)) return failure('不能删除默认管理员');
    if (resource === 'role' && ids.some(userHasRole)) return failure('角色仍被用户使用');
    const removed = rows.filter((row) => ids.includes(row.id));
    const kept = removeIds(rows, ids);
    rows.splice(0, rows.length, ...kept);
    if (resource === 'user') removed.forEach((user) => {
      delete userRoleIds[user.id];
      delete mockPasswords[user.username];
    });
    return success(true);
  });
  add('GET', `${base}/export-excel`, async () => success([]));
}

add('GET', '/system/dept/list', async () => success(departments.map((row) => ({ ...row }))));
add('GET', '/system/dept/get', async (_c, rc) => {
  const row = byId(departments, paramsOf(rc).id);
  return row ? success({ ...row }) : failure('部门不存在', 404);
});
const isDeptDescendant = (candidateParentId: number, deptId: number) => {
  let current = byId(departments, candidateParentId);
  const visited = new Set<number>();
  while (current && current.parentId !== 0 && !visited.has(current.id)) {
    if (current.parentId === deptId) return true;
    visited.add(current.id);
    current = byId(departments, current.parentId);
  }
  return false;
};
const validateDeptParent = (parentId: unknown, deptId?: number) => {
  const normalizedParentId = Number(parentId ?? 0);
  if (!Number.isFinite(normalizedParentId)) return '上级部门不存在';
  if (normalizedParentId === 0) return null;
  if (!byId(departments, normalizedParentId)) return '上级部门不存在';
  if (deptId !== undefined && (normalizedParentId === deptId || isDeptDescendant(normalizedParentId, deptId))) {
    return '不能将部门移动到自身或其子级';
  }
  return null;
};
for (const action of ['create', 'update']) add(action === 'create' ? 'POST' : 'PUT', `/system/dept/${action}`, async (_c, rc) => {
  const input = bodyOf(rc);
  if (action === 'create') {
    const parentError = validateDeptParent(input.parentId);
    if (parentError) return failure(parentError);
    departments.push({ ...input, id: nextId(departments), createTime: now() });
  } else {
    const index = departments.findIndex((row) => row.id === Number(input.id));
    if (index < 0) return failure('部门不存在', 404);
    const parentError = validateDeptParent(input.parentId ?? departments[index].parentId, departments[index].id);
    if (parentError) return failure(parentError);
    departments[index] = { ...departments[index], ...input, id: departments[index].id };
  }
  return success(true);
});
for (const action of ['delete', 'delete-list']) add('DELETE', `/system/dept/${action}`, async (_c, rc) => {
  const ids = action === 'delete' ? [Number(paramsOf(rc).id)] : idsOf(paramsOf(rc));
  if (ids.some((id) => departments.some((row) => row.parentId === id))) return failure('部门包含子部门，不能删除');
  if (ids.some((id) => users.some((user) => Number(user.deptId) === id))) return failure('部门存在关联用户，不能删除');
  const kept = removeIds(departments, ids);
  departments.splice(0, departments.length, ...kept);
  return success(true);
});

add('GET', '/system/menu/list', async () => success(menus.map((row) => ({ ...row }))));
add('GET', '/system/menu/get', async (_c, rc) => {
  const row = byId(menus, paramsOf(rc).id);
  return row ? success({ ...row }) : failure('菜单不存在', 404);
});
const isMenuDescendant = (candidateParentId: number, menuId: number) => {
  let current = byId(menus, candidateParentId);
  const visited = new Set<number>();
  while (current && current.parentId !== 0 && !visited.has(current.id)) {
    if (current.parentId === menuId) return true;
    visited.add(current.id);
    current = byId(menus, current.parentId);
  }
  return false;
};
for (const action of ['create', 'update']) add(action === 'create' ? 'POST' : 'PUT', `/system/menu/${action}`, async (_c, rc) => {
  const input = bodyOf(rc);
  const parentId = Number(input.parentId || 0);
  if (parentId && !byId(menus, parentId)) return failure('上级菜单不存在');
  if (action === 'create') menus.push({ ...input, id: nextId(menus), createTime: now() });
  else {
    const index = menus.findIndex((row) => row.id === Number(input.id));
    if (index < 0) return failure('菜单不存在', 404);
    if (Number(input.id) === parentId || isMenuDescendant(parentId, Number(input.id))) return failure('不能将菜单移动到自身或其子级');
    menus[index] = { ...menus[index], ...input, id: menus[index].id };
  }
  return success(true);
});
add('DELETE', '/system/menu/delete', async (_c, rc) => {
  const id = Number(paramsOf(rc).id);
  if (!byId(menus, id)) return failure('菜单不存在', 404);
  if (menuHasChildren(id)) return failure('菜单包含子菜单，不能删除');
  const kept = removeIds(menus, [id]);
  menus.splice(0, menus.length, ...kept);
  return success(true);
});
add('PUT', '/system/user/update-password', async (_c, rc) => {
  const input = bodyOf(rc);
  const user = byId(users, input.id);
  if (!user) return failure('用户不存在', 404);
  if (typeof input.password !== 'string' || !input.password) return failure('密码不能为空');
  mockPasswords[user.username] = input.password;
  return success(true);
});

const treeOf = (parentId: number, allowed: Set<number>): Row[] => menus
  .filter((menu) => menu.parentId === parentId && allowed.has(menu.id) && menu.type !== 3)
  .sort((a, b) => a.sort - b.sort || a.id - b.id)
  .map((menu) => ({ ...menu, children: treeOf(menu.id, allowed) }));

export const findMockUser = (username: string) => users.find((user) => user.username === username);
export const verifyMockPassword = (username: string, password: string) => mockPasswords[username] === password;
export const mockUserRoles = (userId: number) => (userRoleIds[userId] || []).map((id) => roles.find((role) => role.id === id)).filter((role): role is Row => Boolean(role));
export const mockPermissionData = (userId: number) => {
  const allowed = new Set(mockUserRoles(userId).flatMap((role) => roleMenuIds[role.id] || []));
  const user = byId(users, userId);
  if (!user) return null;
  const permissionMenus = menus.filter((menu) => allowed.has(menu.id));
  return {
    user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, deptId: user.deptId, email: user.email },
    roles: mockUserRoles(userId).map((role) => role.code),
    permissions: [...new Set(permissionMenus.filter((menu) => menu.type === 3 && menu.permission).map((menu) => menu.permission as string))],
    menus: treeOf(0, allowed),
  };
};

export default handlers;
