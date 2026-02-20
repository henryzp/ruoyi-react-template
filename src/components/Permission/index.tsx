import { ReactElement, ReactNode, cloneElement, isValidElement } from 'react'
import { useHasPermission, useHasRole, useIsAuthenticated } from '@/hooks/usePermission'

/**
 * Permission 组件属性
 */
export interface PermissionProps {
  /** 子组件 */
  children: ReactNode
  /** 权限标识（支持单个或数组） */
  permission?: string | string[]
  /** 角色标识（支持单个或数组） */
  role?: string | string[]
  /** 无权限时的回退内容 */
  fallback?: ReactNode
  /** 是否需要登录 */
  requireAuth?: boolean
}

/**
 * 权限控制组件
 * 替代 Vue 的 v-hasPermi 指令
 *
 * @example
 * ```tsx
 * // 权限控制
 * <Permission permission="system:user:add">
 *   <Button>添加用户</Button>
 * </Permission>
 *
 * // 角色控制
 * <Permission role="admin">
 *   <Button>管理员功能</Button>
 * </Permission>
 *
 * // 自定义回退
 * <Permission permission="system:user:delete" fallback={<span>无权限</span>}>
 *   <Button>删除</Button>
 * </Permission>
 * ```
 */
export function Permission({
  children,
  permission,
  role,
  fallback = null,
  requireAuth = false,
}: PermissionProps) {
  // 检查登录状态
  const isAuthenticated = useIsAuthenticated()
  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>
  }

  // 检查权限
  const hasPermission = permission ? useHasPermission(permission) : true

  // 检查角色
  const hasRole = role ? useHasRole(role) : true

  // 如果没有权限，返回回退内容
  if (!hasPermission || !hasRole) {
    return <>{fallback}</>
  }

  // 渲染子组件
  if (isValidElement(children)) {
    return children
  }

  return <>{children}</>
}

/**
 * 权限控制的高阶组件版本
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  props: Omit<PermissionProps, 'children'>
) {
  return (props: P) => (
    <Permission {...props}>
      <Component {...props} />
    </Permission>
  )
}

export default Permission
