import { createElement, type ComponentType } from 'react'
import type { NavigateFunction, RouteObject } from 'react-router-dom'
import type { RouteItem, ROUTE_ID_KEY } from '@/router/types'

/**
 * 路由辅助工具类
 */
export class RouterHelper {
  /**
   * 路由配置映射表
   */
  private routeMap: Map<string, RouteItem>

  /**
   * navigate 函数（react-router-dom）
   */
  private navigate: NavigateFunction | null = null

  constructor(routes: RouteItem[] = []) {
    this.routeMap = new Map()
    this.buildRouteMap(routes)
  }

  /**
   * 构建路由映射表
   */
  private buildRouteMap(routes: RouteItem[]): void {
    routes.forEach((route) => {
      this.routeMap.set(route.id, route)
      // 递归处理子路由
      if (route.routes && route.routes.length > 0) {
        this.buildRouteMap(route.routes)
      }
    })
  }

  /**
   * 设置 navigate 函数
   */
  public setNavigate(navigate: NavigateFunction): void {
    this.navigate = navigate
  }

  /**
   * 递归渲染路由（用于 react-router 的 RouteObject）
   */
  public toRenderRouteLoop(routeItem: RouteItem): RouteObject {
    const route: RouteObject = {
      path: routeItem.path,
      id: routeItem.id,
    }

    // 处理重定向
    if (routeItem.redirect) {
      route.redirect = routeItem.redirect
    }

    // 处理组件
    if (routeItem.component) {
      if (typeof routeItem.component === 'function') {
        // 如果是懒加载函数，包装在 Suspense 中
        route.element = createElement(
          routeItem.component as ComponentType,
          routeItem.props
        )
      } else {
        // 如果是 ReactNode，直接使用
        route.element = routeItem.component
      }
    }

    // 递归处理子路由
    if (routeItem.routes && routeItem.routes.length > 0) {
      route.children = routeItem.routes.map((child) =>
        this.toRenderRouteLoop(child)
      )
    }

    return route
  }

  /**
   * 批量转换路由配置为 RouteObject
   */
  public toRenderRoutes(routes: RouteItem[]): RouteObject[] {
    return routes.map((route) => this.toRenderRouteLoop(route))
  }

  /**
   * 根据权限创建路由配置
   */
  public createRoutesConfigByPermissions(
    routes: RouteItem[],
    permissions: string[] = [],
    roles: string[] = []
  ): RouteItem[] {
    return routes
      .filter((route) => this.hasPermission(route, permissions, roles))
      .map((route) => {
        const newRoute: RouteItem = { ...route }
        // 递归处理子路由
        if (route.routes && route.routes.length > 0) {
          newRoute.routes = this.createRoutesConfigByPermissions(
            route.routes,
            permissions,
            roles
          )
        }
        return newRoute
      })
  }

  /**
   * 检查路由是否有权限访问
   */
  private hasPermission(
    route: RouteItem,
    permissions: string[],
    roles: string[]
  ): boolean {
    // 如果路由不需要权限，直接返回 true
    if (!route.permission && !route.roles) {
      return true
    }

    // 检查权限
    if (route.permission && route.permission.length > 0) {
      const hasPermission = route.permission.some((p) =>
        permissions.includes(p)
      )
      if (!hasPermission) {
        return false
      }
    }

    // 检查角色
    if (route.roles && route.roles.length > 0) {
      const hasRole = route.roles.some((r) => roles.includes(r))
      if (!hasRole) {
        return false
      }
    }

    return true
  }

  /**
   * 根据路由ID跳转
   */
  public jumpTo(id: ROUTE_ID_KEY, params?: Record<string, string>): void {
    if (!this.navigate) {
      console.warn('RouterHelper: navigate 函数未设置')
      return
    }

    const route = this.routeMap.get(id)
    if (!route) {
      console.warn(`RouterHelper: 未找到路由 ${id}`)
      return
    }

    let path = route.path
    // 替换路径参数
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        path = path.replace(`:${key}`, value)
      })
    }

    this.navigate(path)
  }

  /**
   * 根据路径跳转
   */
  public jumpToByPath(path: string, state?: unknown): void {
    if (!this.navigate) {
      console.warn('RouterHelper: navigate 函数未设置')
      return
    }
    this.navigate(path, { state })
  }

  /**
   * 替换当前路径（不可后退）
   */
  public replaceTo(id: ROUTE_ID_KEY): void {
    if (!this.navigate) {
      console.warn('RouterHelper: navigate 函数未设置')
      return
    }

    const route = this.routeMap.get(id)
    if (!route) {
      console.warn(`RouterHelper: 未找到路由 ${id}`)
      return
    }

    this.navigate(route.path, { replace: true })
  }

  /**
   * 返回上一页
   */
  public back(): void {
    if (!this.navigate) {
      console.warn('RouterHelper: navigate 函数未设置')
      return
    }
    this.navigate(-1)
  }

  /**
   * 获取路由信息
   */
  public getRoute(id: ROUTE_ID_KEY): RouteItem | undefined {
    return this.routeMap.get(id)
  }

  /**
   * 根据路径获取路由
   */
  public getRouteByPath(path: string): RouteItem | undefined {
    return Array.from(this.routeMap.values()).find(
      (route) => route.path === path
    )
  }

  /**
   * 查找面包屑路径
   */
  public getBreadcrumb(path: string): RouteItem[] {
    const breadcrumbs: RouteItem[] = []
    let currentRoute = this.getRouteByPath(path)

    while (currentRoute) {
      breadcrumbs.unshift(currentRoute)
      // 查找父路由（通过 path 前缀匹配）
      const parentPath = this.getParentPath(currentRoute.path)
      if (parentPath) {
        currentRoute = this.getRouteByPath(parentPath)
      } else {
        break
      }
    }

    return breadcrumbs
  }

  /**
   * 获取父路径
   */
  private getParentPath(path: string): string | null {
    const segments = path.split('/').filter(Boolean)
    if (segments.length <= 1) {
      return null
    }
    return '/' + segments.slice(0, -1).join('/')
  }
}

/**
 * 默认路由辅助实例
 * （在路由初始化后配置）
 */
export const routerHelper = new RouterHelper()

/**
 * 快捷方法：根据路由ID跳转
 */
export function jumpTo(id: ROUTE_ID_KEY): void {
  routerHelper.jumpTo(id)
}

/**
 * 快捷方法：根据路径跳转
 */
export function jumpToByPath(path: string): void {
  routerHelper.jumpToByPath(path)
}

/**
 * 快捷方法：替换当前路径
 */
export function replaceTo(id: ROUTE_ID_KEY): void {
  routerHelper.replaceTo(id)
}

/**
 * 快捷方法：返回上一页
 */
export function goBack(): void {
  routerHelper.back()
}

/**
 * 快捷方法：获取路由信息
 */
export function getRoute(id: ROUTE_ID_KEY): RouteItem | undefined {
  return routerHelper.getRoute(id)
}

/**
 * 快捷方法：根据路径获取路由
 */
export function getRouteByPath(path: string): RouteItem | undefined {
  return routerHelper.getRouteByPath(path)
}

/**
 * 快捷方法：查找面包屑路径
 */
export function getBreadcrumb(path: string): RouteItem[] {
  return routerHelper.getBreadcrumb(path)
}

export default routerHelper
