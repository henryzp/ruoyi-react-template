import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

/**
 * 菜单项接口（基于若依后端返回的菜单结构）
 */
export interface MenuItem {
  /** 菜单ID */
  menuId: number
  /** 菜单名称 */
  menuName: string
  /** 父菜单ID */
  parentId: number
  /** 显示顺序 */
  orderNum: number
  /** 路由地址 */
  path: string
  /** 组件路径 */
  component?: string
  /** 是否为外链（0是 1否） */
  isFrame?: string
  /** 是否缓存（0缓存 1不缓存） */
  isCache?: string
  /** 菜单类型（M目录 C菜单 F按钮） */
  menuType?: string
  /** 菜单状态（0显示 1隐藏） */
  visible?: string
  /** 菜单状态（0正常 1停用） */
  status?: string
  /** 权限标识 */
  perms?: string
  /** 菜单图标 */
  icon?: string
  /** 子菜单 */
  children?: MenuItem[]
}

/**
 * 组件映射表（需要根据实际页面组件手动配置）
 * 使用映射表而不是动态导入，以确保 Vite 可以正确地进行静态分析
 */
const componentMap: Record<string, React.ComponentType> = {
  // 系统管理模块
  'system/user/index': lazy(() => import('@/views/System/User')),
  'system/role/index': lazy(() => import('@/views/System/Role')),
  'system/menu/index': lazy(() => import('@/views/System/Menu')),
  'system/dept/index': lazy(() => import('@/views/System/Dept')),
  'system/post/index': lazy(() => import('@/views/System/Post')),
  'system/dict/index': lazy(() => import('@/views/System/Dict')),
  'system/config/index': lazy(() => import('@/views/System/Config')),
  'system/notice/index': lazy(() => import('@/views/System/Notice')),
  'system/log/index': lazy(() => import('@/views/System/Log')),
  // 需要时可以添加 operlog 和 logininfor 子模块
  // 'system/log/operlog/index': lazy(() => import('@/views/system/Log/Operlog/index.tsx')),
  // 'system/log/logininfor/index': lazy(() => import('@/views/system/Log/Logininfor/index.tsx')),
  // // 监控模块
  // 'monitor/online/index': lazy(() => import('@/views/monitor/Online/index.tsx')),
  // 'monitor/job/index': lazy(() => import('@/views/monitor/Job/index.tsx')),
  // 'monitor/server/index': lazy(() => import('@/views/monitor/Server/index.tsx')),
  // // 工具模块
  // 'tool/gen/index': lazy(() => import('@/views/tool/Gen/index.tsx')),
  // 可以继续添加其他模块的映射
}

/**
 * 动态导入组件
 * @param componentPath 组件路径（如：system/user/index）
 * @returns 组件
 */
function loadComponent(componentPath: string | undefined): React.ComponentType<any> | undefined {
  if (!componentPath) return undefined

  // 从映射表中获取组件
  const component = componentMap[componentPath]
  if (component) {
    return component
  }

  // 如果映射表中没有，返回一个空的占位组件
  console.warn(`组件 ${componentPath} 未在路由映射表中配置`)
  return lazy(() =>
    Promise.resolve({
      default: () => <div>组件 {componentPath} 尚未实现</div>,
    })
  )
}

/**
 * 将菜单项转换为路由配置
 * @param menu 菜单项
 * @param parentPath 父级路径
 * @returns 路由配置
 */
function transformMenuToRoute(menu: MenuItem, parentPath = ''): RouteObject | null {
  // 跳过按钮类型和隐藏的菜单
  // 注意：后端可能没有 menuType 字段，所以根据 component 和 children 来判断
  const hasComponent = menu.component && menu.component.length > 0
  const hasChildren = menu.children && menu.children.length > 0

  // 如果既没有组件也没有子菜单，跳过
  if (!hasComponent && !hasChildren) {
    return null
  }

  // 构建完整路径：父路径 + 当前 path
  let fullPath = ''
  if (parentPath) {
    fullPath = menu.path.startsWith('/') ? `${parentPath}${menu.path}` : `${parentPath}/${menu.path}`
  } else {
    fullPath = menu.path
  }

  const route: RouteObject = {
    path: fullPath,
  }

  // 如果有组件路径，则加载组件
  if (hasComponent) {
    const Component = loadComponent(menu.component)
    if (Component) {
      route.Component = Component
    }
  }

  // 递归处理子菜单
  if (hasChildren) {
    const childRoutes = menu.children!
      .map(child => transformMenuToRoute(child, fullPath))
      .filter((route): route is RouteObject => route !== null)

    if (childRoutes.length > 0) {
      route.children = childRoutes
    }
  }

  return route
}

/**
 * 将后端返回的菜单数据转换为路由配置
 * @param menus 菜单数据
 * @returns 路由配置数组
 */
export function transformMenusToRoutes(menus: MenuItem[] | undefined): RouteObject[] {
  if (!menus || menus.length === 0) {
    return []
  }

  return menus
    .map(menu => transformMenuToRoute(menu, ''))
    .filter((route): route is RouteObject => route !== null)
}
