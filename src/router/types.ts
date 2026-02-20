import type { ComponentType, ReactNode } from 'react'
import type { PathRouteProps } from 'react-router-dom'

/**
 * 路由配置项
 */
export interface RouteItem {
  /** 路由ID，用于程序化跳转 */
  id: string
  /** 路由路径 */
  path: string
  /** 路由组件（支持懒加载） */
  component?: ComponentType | ReactNode | (() => Promise<{ default: ComponentType }>);
  /** 路由名称 */
  name?: string
  /** 路由标题 */
  title?: string
  /** 图标 */
  icon?: ReactNode
  /** 是否隐藏 */
  hidden?: boolean
  /** 重定向路径 */
  redirect?: string
  /** 子路由 */
  routes?: RouteItem[]
  /** 元数据 */
  meta?: RouteMeta
  /** 是否需要认证 */
  auth?: boolean
  /** 权限标识 */
  permission?: string[]
  /** 角色标识 */
  roles?: string[]
  /** 路由参数 */
  props?: PathRouteProps
}

/**
 * 路由元数据
 */
export interface RouteMeta {
  /** 标题 */
  title?: string
  /** 图标 */
  icon?: ReactNode
  /** 是否隐藏 */
  hidden?: boolean
  /** 是否不需要缓存 */
  noCache?: boolean
  /** 是否固定标签页 */
  affix?: boolean
  /** 链接地址 */
  link?: string
  /** 是否在面包屑中隐藏 */
  breadcrumb?: boolean
  /** 是否在菜单中隐藏 */
  hideInMenu?: boolean
}

/**
 * 路由结构数据项（后端返回）
 */
export interface RoutesStructDataItem {
  /** 路由ID */
  id: string
  /** 路由路径 */
  path: string
  /** 路由名称 */
  name?: string
  /** 组件名称 */
  componentName?: string
  /** 路由标题 */
  title?: string
  /** 图标 */
  icon?: string
  /** 是否隐藏 */
  hidden?: boolean
  /** 排序 */
  sort?: number
  /** 重定向 */
  redirect?: string
  /** 子路由 */
  children?: RoutesStructDataItem[]
  /** 元数据 */
  meta?: RouteMeta
  /** 是否需要认证 */
  auth?: boolean
  /** 权限标识 */
  permission?: string[]
  /** 角色标识 */
  roles?: string[]
}

/**
 * 路由ID类型（使用字面量类型提供类型提示）
 */
export type ROUTE_ID_KEY =
  | 'HOME'
  | 'LOGIN'
  | '404'
  | '403'
  | 'DASHBOARD'
  | 'SYSTEM'
  | 'SYSTEM_USER'
  | 'SYSTEM_ROLE'
  | 'SYSTEM_MENU'
  | 'SYSTEM_DEPT'
  | 'SYSTEM_POST'
  | 'SYSTEM_DICT'
  | 'SYSTEM_CONFIG'
  | 'SYSTEM_NOTICE'
  | 'SYSTEM_LOG'
  | string

/**
 * 菜单项
 */
export interface MenuItem {
  /** 菜单key */
  key: string
  /** 菜单标题 */
  label: string
  /** 菜单图标 */
  icon?: ReactNode
  /** 路由路径 */
  path?: string
  /** 子菜单 */
  children?: MenuItem[]
  /** 是否禁用 */
  disabled?: boolean
  /** 是否隐藏 */
  hidden?: boolean
}

/**
 * 面包屑项
 */
export interface BreadcrumbItem {
  /** 标题 */
  title: string
  /** 路径 */
  path?: string
  /** 图标 */
  icon?: ReactNode
}
