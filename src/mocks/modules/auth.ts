import type { LoginDto } from '@/types/auth';
import type { MockHandler } from '../types';
import { failure, success } from '../utils';
import { findMockUser, mockPermissionData, verifyMockPassword } from './system';
const accessToken = 'mock-access-token';
const refreshTokenValue = 'mock-refresh-token';
let activeUserId: number | null = null;

const login: MockHandler['handle'] = async (_config, requestConfig) => {
  const body = (requestConfig?.data || {}) as LoginDto;
  const user = body.username ? findMockUser(body.username.trim()) : undefined;
  if (!user || !verifyMockPassword(user.username, body.password) || user.status !== 0) {
    return failure('用户名或密码错误', 1001004000);
  }
  activeUserId = user.id;
  return success({ accessToken, refreshToken: refreshTokenValue, userId: user.id, expiresTime: Date.now() + 3600_000 });
};

const getPermissionInfo: MockHandler['handle'] = async () => {
  if (activeUserId === null) return failure('未登录', 401);
  const info = mockPermissionData(activeUserId);
  return info ? success(info) : failure('用户不存在', 401);
};

const refreshToken: MockHandler['handle'] = async (_config, requestConfig) => {
  if (activeUserId === null || requestConfig?.params?.refreshToken !== refreshTokenValue) {
    return failure('刷新令牌无效', 401);
  }
  return success({ accessToken, refreshToken: refreshTokenValue, expiresTime: Date.now() + 3600_000 });
};

const logout: MockHandler['handle'] = async () => {
  activeUserId = null;
  return success(true);
};

const handlers: MockHandler[] = [
  { method: 'POST', path: '/system/auth/login', handle: login },
  { method: 'GET', path: '/system/auth/get-permission-info', handle: getPermissionInfo },
  { method: 'POST', path: '/system/auth/refresh-token', handle: refreshToken },
  { method: 'POST', path: '/system/auth/logout', handle: logout },
];

export default handlers;
