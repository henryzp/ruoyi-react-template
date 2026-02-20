import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RouteItem } from '@/router/types'
import type { MenuItem } from '@/router/types'

/**
 * 权限状态接口
 */
interface PermissionState {
  /** 路由列表 */
  routes: RouteItem[]
  /** 菜单列表 */
  menus: MenuItem[]
  /** 权限标识列表 */
  permissions: string[]
  /** 角色标识列表 */
  roles: string[]
  /** 是否已加载 */
  isLoaded: boolean
  /** 是否加载中 */
  loading: boolean
}

/**
 * 权限操作接口
 */
interface PermissionActions {
  /** 设置路由列表 */
  setRoutes: (routes: RouteItem[]) => void
  /** 设置菜单列表 */
  setMenus: (menus: MenuItem[]) => void
  /** 设置权限列表 */
  setPermissions: (permissions: string[]) => void
  /** 设置角色列表 */
  setRoles: (roles: string[]) => void
  /** 清空权限信息 */
  clearPermissions: () => void
}

/**
 * 权限 Store 类型
 */
type PermissionStore = PermissionState & PermissionActions

/**
 * 权限 Store
 */
export const usePermissionStore = create<PermissionStore>()(
  persist(
    (set) => ({
      // 初始状态
      routes: [],
      menus: [],
      permissions: [],
      roles: [],
      isLoaded: false,
      loading: false,

      // 设置路由列表
      setRoutes: (routes) => set({ routes }),

      // 设置菜单列表
      setMenus: (menus) => set({ menus }),

      // 设置权限列表
      setPermissions: (permissions) => set({ permissions }),

      // 设置角色列表
      setRoles: (roles) => set({ roles }),

      // 清空权限信息
      clearPermissions: () => {
        set({
          routes: [],
          menus: [],
          permissions: [],
          roles: [],
          isLoaded: false,
        })
      },
    }),
    {
      name: 'permission-storage', // localStorage key
      partialize: (state) => ({
        routes: state.routes,
        menus: state.menus,
        permissions: state.permissions,
        roles: state.roles,
        isLoaded: state.isLoaded,
      }),
    }
  )
)

/**
 * 快捷方法：获取权限列表
 */
export const getPermissions = () => {
  return usePermissionStore.getState().permissions
}

/**
 * 快捷方法：获取角色列表
 */
export const getRoles = () => {
  return usePermissionStore.getState().roles
}

/**
 * 快捷方法：清空权限信息
 */
export const clearPermissions = () => {
  usePermissionStore.getState().clearPermissions()
}

export default usePermissionStore
