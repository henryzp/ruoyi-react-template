import { useMemo, lazy } from 'react'
import { HashRouter, Navigate, useRoutes } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import BasicLayout from '@/layouts/BasicLayout'
import { staticRoutes } from './staticRoutes'
import { transformMenusToRoutes } from './utils'
import { Guard } from './Guard'
import { useAuthStore } from '@/store/authStore'

/**
 * 内部路由组件（在 Router 上下文中）
 */
function RouterContent() {
  const { isAuthenticated, userInfo } = useAuthStore()

  const routes = useMemo(() => {
    // 如果已登录且有用户信息，生成动态路由
    if (isAuthenticated && userInfo?.menus) {
      // 将后端菜单数据转换为路由配置
      const menuRoutes = transformMenusToRoutes(userInfo.menus)

      const dynamicRoutes: RouteObject[] = [
        {
          path: '/',
          element: <Navigate to="/home" replace />,
        },
        {
          path: '/',
          Component: BasicLayout,  // 直接使用组件，不要 lazy loading
          children: [
            // 首页（默认路由）
            {
              path: '/home',
              Component: lazy(() => import('@/views/Home/index.tsx')),
            },
            // 从菜单数据生成的动态路由
            ...menuRoutes,
          ],
        },
        {
          path: '*',
          element: <Navigate to="/404" replace />,
        },
      ]
      return [...staticRoutes, ...dynamicRoutes]
    }
    // 未登录或无菜单信息，只显示静态路由
    return [...staticRoutes]
  }, [isAuthenticated, userInfo?.menus])

  const element = useRoutes(routes)

  return (
    <Guard>
      {element}
    </Guard>
  )
}

/**
 * 应用路由组件
 */
export function AppRouter() {
  return (
    <HashRouter>
      <RouterContent />
    </HashRouter>
  )
}

export default AppRouter
