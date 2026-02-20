import { usePermissionStore } from '@/store/permissionStore'
import { useAuthStore } from '@/store/authStore'

/**
 * 检查是否有指定权限
 * @param permission 权限标识（支持单个或数组）
 * @returns 是否有权限
 */
export function useHasPermission(permission: string | string[]): boolean {
  const { permissions } = usePermissionStore()
  const { userInfo } = useAuthStore()

  // 超级管理员拥有所有权限
  if (userInfo?.roles?.includes('admin')) {
    return true
  }

  if (!permissions || permissions.length === 0) {
    return false
  }

  if (Array.isArray(permission)) {
    // 检查是否拥有其中任意一个权限
    return permission.some((p) => permissions.includes(p))
  }

  return permissions.includes(permission)
}

/**
 * 检查是否有指定角色
 * @param role 角色标识（支持单个或数组）
 * @returns 是否有角色
 */
export function useHasRole(role: string | string[]): boolean {
  const { roles } = usePermissionStore()
  const { userInfo } = useAuthStore()

  // 超级管理员拥有所有角色
  if (userInfo?.roles?.includes('admin')) {
    return true
  }

  if (!roles || roles.length === 0) {
    return false
  }

  if (Array.isArray(role)) {
    // 检查是否拥有其中任意一个角色
    return role.some((r) => roles.includes(r))
  }

  return roles.includes(role)
}

/**
 * 获取用户权限列表
 */
export function usePermissions(): string[] {
  const { permissions } = usePermissionStore()
  return permissions
}

/**
 * 获取用户角色列表
 */
export function useRoles(): string[] {
  const { roles } = usePermissionStore()
  return roles
}

/**
 * 检查是否已登录
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated, token } = useAuthStore()
  return isAuthenticated || !!token
}

export default useHasPermission
