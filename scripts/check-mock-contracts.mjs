import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { matchRoutes } from 'react-router-dom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const createMockVite = () => createServer({
  configFile: false,
  root,
  mode: 'mock',
  resolve: {
    alias: [
      { find: /^@\/request$/, replacement: path.join(root, 'src/mocks/request.ts') },
      { find: '@', replacement: path.join(root, 'src') },
    ],
  },
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: 'error',
});
let vite = await createMockVite();

const check = (condition, message) => assert.ok(condition, message);
const eq = (actual, expected, message) => assert.deepEqual(actual, expected, message);
const rawResponse = async (method, path, requestConfig = {}) => {
  const { default: modules } = await vite.ssrLoadModule('/src/mocks/modules/system.ts');
  const handler = modules.find((item) => item.method === method && item.path === path);
  assert.ok(handler, `missing mock handler ${method} ${path}`);
  return handler.handle({ method, url: path }, requestConfig);
};
const endpoint = async (method, path, requestConfig = {}, configOverrides = {}) => {
  const { findMockHandler } = await vite.ssrLoadModule('/src/mocks/adapter/registry.ts');
  const handler = findMockHandler(method, path);
  assert.ok(handler, `missing mock handler ${method} ${path}`);
  return handler.handle({ method, url: path, ...configOverrides }, requestConfig);
};
const ok = (result, message = 'mock endpoint should succeed') => {
  assert.equal(result.code, 0, `${message}: ${result.msg}`);
  return result.data;
};

try {
  const auth = (await vite.ssrLoadModule('/src/mocks/modules/auth.ts')).default;
  const mockRequest = await vite.ssrLoadModule('/src/mocks/request.ts');
  const callAuth = async (method, path, requestConfig = {}) => {
    const handler = auth.find((item) => item.method === method && item.path === path);
    assert.ok(handler, `missing auth handler ${method} ${path}`);
    return handler.handle({ method, url: path }, requestConfig);
  };
  const callLogin = (credentials) => callAuth('POST', '/system/auth/login', { data: credentials });
  const requestLogin = (credentials) => mockRequest.request({
    url: '/system/auth/login',
    method: 'POST',
    data: credentials,
  });
  const makeLoginRequest = mockRequest.makeRequest({
    url: '/system/auth/login',
    method: 'POST',
    data: { username: 'unknown', password: 'wrong' },
  });
  check((await callAuth('GET', '/system/auth/get-permission-info')).code !== 0, 'permission endpoint rejects anonymous session');
  await assert.rejects(requestLogin({ username: 'admin', password: 'wrong' }), /用户名或密码错误/, 'default admin rejects an incorrect password');
  await assert.rejects(requestLogin({ username: '', password: 'admin123' }), /用户名或密码错误/, 'login rejects an empty username');
  const runtimeOverrideLogin = await makeLoginRequest({ data: { username: 'admin', password: 'admin123' } });
  check(!runtimeOverrideLogin.err && runtimeOverrideLogin.data?.userId === 1, 'runtime body overrides static mock request body');
  const login = await requestLogin({ username: 'admin', password: 'admin123' });
  check(login.accessToken && login.refreshToken && login.userId === 1 && Number.isFinite(login.expiresTime), 'default admin/admin123 login succeeds through mock request');
  check(!('password' in login), 'login response does not expose password');
  check((await callAuth('POST', '/system/auth/refresh-token', { params: { refreshToken: 'invalid' } })).code !== 0, 'invalid refresh token rejected');
  const refreshResult = await mockRequest.request({ url: '/system/auth/refresh-token', method: 'POST', params: { refreshToken: login.refreshToken } });
  check(Number.isFinite(refreshResult.expiresTime), 'refresh request reads static query params');
  const refresh = ok(await callAuth('POST', '/system/auth/refresh-token', { params: { refreshToken: login.refreshToken } }));
  check(Number.isFinite(refresh.expiresTime), 'refresh returns expiry timestamp');
  const permission = ok(await callAuth('GET', '/system/auth/get-permission-info'));
  eq(permission.roles, ['super_admin'], 'permission response uses actual role code');
  check(permission.menus.some((item) => item.path === 'system' && item.children?.some((child) => child.path === 'user' && child.component === 'system/user/index')), 'auth menu tree contains routable user menu');
  const flattenRawMenus = (items) => items.flatMap((item) => [item, ...flattenRawMenus(item.children || [])]);
  const rawPermissionMenus = flattenRawMenus(permission.menus);
  check(rawPermissionMenus.every((item) => item.type !== 3), 'permission menu tree excludes button nodes');
  check(permission.permissions.includes('system:dict:delete'), 'button permissions are returned');
  const { mapPermissionInfo } = await vite.ssrLoadModule('/src/utils/authAdapter.ts');
  const { transformMenusToRoutes } = await vite.ssrLoadModule('/src/router/utils.tsx');
  const adaptedPermission = mapPermissionInfo(permission);
  check(adaptedPermission.userId === 1 && adaptedPermission.username === 'admin' && adaptedPermission.roles[0] === 'super_admin', 'permission adapter flattens the raw user into UserInfo fields');
  const authRoutes = transformMenusToRoutes(adaptedPermission.menus);
  check(authRoutes.some((route) => route.path === 'system' && route.children?.some((child) => child.path === 'user')), 'adapted permission menus use relative child paths');
  const flattenAdaptedMenus = (items) => items.flatMap((item) => [item, ...flattenAdaptedMenus(item.children || [])]);
  const adaptedMenus = flattenAdaptedMenus(adaptedPermission.menus);
  check(adaptedMenus.every((item) => typeof item.menuName === 'string' && item.menuName.trim()), 'adapted sidebar menus have visible names');
  const registeredRoutes = [
    { path: '/', children: [{ path: '/home' }, ...authRoutes] },
    { path: '*', id: 'not-found' },
  ];
  for (const path of ['/system/user', '/system/role', '/system/menu', '/system/dict']) {
    const matches = matchRoutes(registeredRoutes, path) || [];
    check(matches.length > 0 && matches.at(-1)?.route.id !== 'not-found', `${path} matches a registered menu route`);
    check(Boolean(matches.at(-1)?.route.Component), `${path} resolves to its page component`);
  }
  const doubledDictMatch = matchRoutes(registeredRoutes, '/system/system/dict') || [];
  check(doubledDictMatch.at(-1)?.route.id === 'not-found', 'doubled parent prefix does not register a route');
  const routerMode = await vite.ssrLoadModule('/src/router/mode.ts');
  check(routerMode.resolveRouterMode(undefined, 'mock') === 'hash', 'mock mode defaults to hash routing');
  check(routerMode.resolveRouterMode(undefined, 'development') === 'browser', 'development mode defaults to browser routing');
  check(routerMode.resolveRouterMode('hash', 'development') === 'hash', 'explicit hash routing overrides app mode');
  check(routerMode.resolveRouterMode('browser', 'mock') === 'browser', 'explicit browser routing overrides app mode');

  const userApi = await vite.ssrLoadModule('/src/views/System/User/api/index.ts');
  const requestMock = (method, path, requestConfig = {}) =>
    mockRequest.makeRequest({ url: path, method })(requestConfig);
  const staticUserGet = await mockRequest.request({ url: '/system/user/get', method: 'GET', params: { id: 1 } });
  check(staticUserGet.username === 'admin', 'GET mock request reads static query params');
  const overrideUserGet = await mockRequest.makeRequest({ url: '/system/user/get', method: 'GET', params: { id: 2 } })({ params: { id: 1 } });
  check(!overrideUserGet.err && overrideUserGet.data?.username === 'admin', 'runtime query params override static mock request params');
  const userPage = ok(await endpoint('GET', '/system/user/page', { params: { pageNo: 1, pageSize: 20, mobile: '13800000001' } }));
  check(userPage.list[0].mobile && !('phone' in userPage.list[0]), 'user raw DTO uses mobile');
  const userSearch = await userApi.getUserPage({ params: { pageNo: 1, pageSize: 20, phone: '13800000002' } });
  check(!userSearch.err && userSearch.data.list.length === 1 && userSearch.data.list[0].phone === '13800000002', 'user API maps mobile query and response phone');
  const userDetail = await userApi.getUser({ params: { id: 1 } });
  check(!userDetail.err && userDetail.data.username === 'admin' && userDetail.data.phone === '13800000001', 'user detail maps UserDTO to UserVO');
  const fixtureName = `contract-user-${Date.now()}`;
  const createdUser = await userApi.createUser({ data: { username: fixtureName, nickname: 'Contract user', email: '', phone: '555-0101', deptId: 1, sex: 2, status: 0, password: 'Start123' } });
  check(!createdUser.err, 'user create succeeds');
  const createdUserList = await userApi.getUserPage({ params: { pageNo: 1, pageSize: 20, username: fixtureName } });
  const createdUserRow = createdUserList.data.list[0];
  check(createdUserRow && createdUserRow.phone === '555-0101', 'created user maps phone from mobile');
  const userRawAfterCreate = ok(await rawResponse('GET', '/system/user/get', { params: { id: createdUserRow.id } }));
  check(userRawAfterCreate.mobile === '555-0101' && !('phone' in userRawAfterCreate), 'user write body maps phone to mobile');
  check(!('password' in userRawAfterCreate), 'user response never exposes stored password');
  const seededFixture = await endpoint('PUT', '/system/user/update', { data: { ...userRawAfterCreate, postIds: [2] } });
  ok(seededFixture, 'seed user relation for preservation check');
  const loadedFixture = await userApi.getUser({ params: { id: createdUserRow.id } });
  check(!loadedFixture.err && loadedFixture.data.postIds?.[0] === 2, 'user detail retains postIds');
  const userUpdate = await userApi.updateUser({ data: { ...loadedFixture.data, nickname: 'Contract updated', phone: '555-0102' } });
  check(!userUpdate.err, 'user update succeeds');
  const userRawAfterUpdate = ok(await rawResponse('GET', '/system/user/get', { params: { id: createdUserRow.id } }));
  check(userRawAfterUpdate.mobile === '555-0102', 'user update maps phone to mobile');
  check(Array.isArray(userRawAfterUpdate.postIds), 'user update preserves unedited postIds');
  check(!('password' in userRawAfterUpdate), 'user update does not store password in response row');
  const loginFixture = async (password) => callLogin({ username: fixtureName, password });
  check((await loginFixture('Start123')).code === 0, 'created user can log in with initial password');
  const reset = await userApi.resetUserPassword({ data: { id: createdUserRow.id, password: 'Reset123' } });
  check(!reset.err, 'password reset succeeds');
  check((await loginFixture('Start123')).code !== 0, 'password reset invalidates old password');
  check((await loginFixture('Reset123')).code === 0, 'password reset enables new password');
  await callAuth('POST', '/system/auth/logout');
  await userApi.deleteUser({ params: { id: createdUserRow.id } });
  check((await rawResponse('GET', '/system/user/get', { params: { id: createdUserRow.id } })).code !== 0, 'user delete removes row');
  const bulkIds = [];
  for (const username of [`${fixtureName}-a`, `${fixtureName}-b`]) {
    await userApi.createUser({ data: { username, nickname: username, email: '', phone: '555-0103', deptId: null, sex: 2, status: 0, password: 'Start123' } });
    const page = await userApi.getUserPage({ params: { pageNo: 1, pageSize: 20, username } });
    bulkIds.push(page.data.list[0].id);
  }
  await userApi.deleteUserList({ params: { ids: bulkIds.join(',') } });
  check((await userApi.getUserPage({ params: { pageNo: 1, pageSize: 20, username: fixtureName } })).data.total === 0, 'user batch delete removes fixtures');
  const deptResult = await userApi.getDeptTree({ params: {} });
  check(!deptResult.err && deptResult.data.some((dept) => dept.name && dept.deptName === dept.name), 'user department API decorates deptName while preserving name');
  check((await requestMock('DELETE', '/system/dept/delete', { params: { id: 2 } })).err, 'department with an assigned user cannot be deleted');
  check((await requestMock('POST', '/system/dept/create', { data: { name: 'Invalid parent', parentId: 999, status: 0 } })).err, 'department create rejects a missing parent');
  const createdDept = await requestMock('POST', '/system/dept/create', { data: { name: 'Contract department', parentId: 1, status: 0, sort: 3 } });
  check(!createdDept.err, 'department create accepts an existing parent');
  const deptList = await requestMock('GET', '/system/dept/list');
  const createdDeptRow = deptList.data.find((dept) => dept.name === 'Contract department');
  check(createdDeptRow, 'created department is returned by the request wrapper');
  check((await requestMock('PUT', '/system/dept/update', { data: { id: 1, parentId: 2 } })).err, 'department update rejects moving beneath a descendant');
  check((await requestMock('PUT', '/system/dept/update', { data: { id: 2, parentId: 2 } })).err, 'department update rejects self-parenting');
  check((await requestMock('PUT', '/system/dept/update', { data: { id: 2, parentId: 999 } })).err, 'department update rejects a missing parent');
  const updatedDept = await requestMock('PUT', '/system/dept/update', { data: { ...createdDeptRow, parentId: 0 } });
  check(!updatedDept.err, 'department update accepts a valid root parent');
  check(!(await requestMock('DELETE', '/system/dept/delete', { params: { id: createdDeptRow.id } })).err, 'department fixture can be deleted after moving it to the root');

  const roleApi = await vite.ssrLoadModule('/src/views/System/Role/api/index.ts');
  const { RoleStatusEnum } = roleApi;
  eq([RoleStatusEnum.ENABLE, RoleStatusEnum.DISABLE], [0, 1], 'role status follows CommonStatus');
  const rolePage = await roleApi.getRolePage({ params: { pageNo: 1, pageSize: 20, status: 0, code: 'super_admin' } });
  check(!rolePage.err && rolePage.data.list.some((role) => role.code === 'super_admin' && role.status === 0), 'active super admin uses status zero');
  const roleCreate = await roleApi.createRole({ data: { code: `contract-${Date.now()}`, name: 'Contract role', status: 0, sort: 9, dataScope: 1 } });
  check(!roleCreate.err, 'role create succeeds');
  const newRolePage = await roleApi.getRolePage({ params: { pageNo: 1, pageSize: 20, name: 'Contract role' } });
  const newRole = newRolePage.data.list[0];
  check(newRole?.status === 0, 'role filter and page return raw active status');
  await roleApi.updateRole({ data: { ...newRole, name: 'Contract role updated' } });
  check((await roleApi.getRole({ params: { id: newRole.id } })).data.name === 'Contract role updated', 'role detail reflects update');
  await roleApi.deleteRole({ params: { id: newRole.id } });
  check((await roleApi.getRole({ params: { id: newRole.id } })).err, 'role delete removes row');
  const batchRoleCodes = [`contract-batch-a-${Date.now()}`, `contract-batch-b-${Date.now()}`];
  const batchRoleIds = [];
  for (const code of batchRoleCodes) {
    await roleApi.createRole({ data: { code, name: code, status: 0, sort: 1, dataScope: 1 } });
    const page = await roleApi.getRolePage({ params: { pageNo: 1, pageSize: 20, code } });
    batchRoleIds.push(page.data.list[0].id);
  }
  await roleApi.deleteRoleList({ params: { ids: batchRoleIds.join(',') } });
  check((await roleApi.getRolePage({ params: { pageNo: 1, pageSize: 20, code: 'contract-batch' } })).data.total === 0, 'role batch delete removes fixtures');

  const menuApi = await vite.ssrLoadModule('/src/views/System/Menu/api/index.ts');
  const rawMenus = ok(await endpoint('GET', '/system/menu/list'));
  const userMenu = rawMenus.find((item) => item.path === 'user');
  const viewMenu = (await menuApi.getMenu({ params: { id: userMenu.id } })).data;
  eq([viewMenu.type, viewMenu.status, viewMenu.keepAlive, viewMenu.visible], ['menu', '0', 0, true], 'menu raw fields map to page schema');
  const updatedMenu = { ...viewMenu, name: '用户管理契约', isFrame: 1 };
  const menuUpdate = await menuApi.updateMenu({ data: updatedMenu });
  check(!menuUpdate.err, 'menu update succeeds');
  const rawUpdatedMenu = ok(await rawResponse('GET', '/system/menu/get', { params: { id: userMenu.id } }));
  eq([rawUpdatedMenu.name, rawUpdatedMenu.type, rawUpdatedMenu.status, rawUpdatedMenu.keepAlive], ['用户管理契约', 2, 0, false], 'menu update preserves formal numeric/bool schema and ignores derived isFrame');
  check(rawUpdatedMenu.componentName === 'SystemUser', 'menu update preserves unedited componentName');
  const menuPayload = menuApi.toMenuDTO(updatedMenu);
  check(!('isFrame' in menuPayload) && !('createTime' in menuPayload) && !('children' in menuPayload), 'menu save DTO omits derived/read-only fields');
  check(menuPayload.componentName === 'SystemUser' && menuPayload.alwaysShow === false, 'menu save preserves formal componentName and alwaysShow');
  const flatMenuList = await menuApi.getMenuList({ params: {} });
  check(!flatMenuList.err && flatMenuList.data.some((item) => item.id === userMenu.id && item.type === 'menu'), 'menu list remains flat and page-shaped');
  const parentCreate = await menuApi.createMenu({ data: { name: 'Contract parent', parentId: 0, type: 'dir', sort: 99, status: '0' } });
  check(!parentCreate.err, 'menu parent create succeeds');
  const parentList = (await menuApi.getMenuList({ params: {} })).data;
  const parent = parentList.find((item) => item.name === 'Contract parent');
  const childCreate = await menuApi.createMenu({ data: { name: 'Contract child', parentId: parent.id, type: 'menu', path: 'contract', component: 'system/dict/index', sort: 1, status: '0', visible: true, keepAlive: 1 } });
  check(!childCreate.err, 'menu child create succeeds');
  const rawChild = ok(await rawResponse('GET', '/system/menu/list'));
  const savedChild = rawChild.find((item) => item.name === 'Contract child');
  check(savedChild.type === 2 && savedChild.keepAlive === true && savedChild.visible === true, 'menu create maps type and boolean flags to raw DTO');
  check((await menuApi.deleteMenu({ params: { id: parent.id } })).err, 'menu parent with child cannot be deleted');
  const child = (await menuApi.getMenuList({ params: {} })).data.find((item) => item.parentId === parent.id);
  await menuApi.deleteMenu({ params: { id: child.id } });
  await menuApi.deleteMenu({ params: { id: parent.id } });
  const cycleParent = (await menuApi.getMenuList({ params: {} })).data.find((item) => item.path === 'system');
  const cycleChild = (await menuApi.getMenuList({ params: {} })).data.find((item) => item.path === 'user');
  const cycleAttempt = await menuApi.updateMenu({ data: { ...cycleParent, parentId: cycleChild.id } });
  check(cycleAttempt.err, 'menu update rejects moving a parent beneath its descendant');

  const dictTypesApi = await vite.ssrLoadModule('/src/pages/Admin/Dict/DictType/api/index.ts');
  const dictDataApi = await vite.ssrLoadModule('/src/pages/Admin/Dict/DictData/api/index.ts');
  const dictTypeName = `Contract ${Date.now()}`;
  const dictTypeCode = `contract_${Date.now()}`;
  await dictTypesApi.createDictType({ data: { name: dictTypeName, type: dictTypeCode, status: 0 } });
  const newDictType = (await dictTypesApi.getDictTypePage({ params: { pageNo: 1, pageSize: 20, type: dictTypeCode } })).data.list[0];
  check(newDictType && Number.isFinite(newDictType.createTime), 'dict type uses millisecond timestamp');
  await dictDataApi.createDictData({ data: { dictType: dictTypeCode, label: 'One', value: 'one', sort: 1, status: 0 } });
  const newDictData = (await dictDataApi.getDictDataPage({ params: { pageNo: 1, pageSize: 20, dictType: dictTypeCode } })).data.list[0];
  check(newDictData && Number.isFinite(newDictData.createTime), 'dict data uses millisecond timestamp');
  const simpleDictList = ok(await endpoint('GET', '/system/dict-data/simple-list'));
  check(Array.isArray(simpleDictList) && simpleDictList.some((item) => item.dictType === dictTypeCode && item.value === 'one'), 'simple-list is a flat array of active dict values');
  await dictDataApi.updateDictData({ data: { ...newDictData, label: 'Updated One' } });
  check((await dictDataApi.getDictDataPage({ params: { pageNo: 1, pageSize: 20, dictType: dictTypeCode } })).data.list[0].label === 'Updated One', 'dict data update persists');
  await dictTypesApi.updateDictType({ data: { ...newDictType, name: `${dictTypeName} updated` } });
  check((await dictTypesApi.getDictTypePage({ params: { pageNo: 1, pageSize: 20, type: dictTypeCode } })).data.list[0].name === `${dictTypeName} updated`, 'dict type update persists');
  await dictDataApi.deleteDictData({ params: { id: newDictData.id } });
  await dictTypesApi.deleteDictType({ params: { id: newDictType.id } });

  await callAuth('POST', '/system/auth/logout');
  check((await callAuth('GET', '/system/auth/get-permission-info')).code !== 0, 'permission endpoint rejects after logout');
  await vite.close();
  console.log('Mock contract checks passed.');
} finally {
  await vite.close();
}
