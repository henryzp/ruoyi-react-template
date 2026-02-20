import { lazy } from 'react'
import { type RouteObject } from 'react-router-dom'

// 懒加载组件
const Login = lazy(() => import('@/views/Login/index.tsx'))
const NotFound = lazy(() => import('@/views/NotFound.tsx'))
const Forbidden = lazy(() => import('@/views/Forbidden.tsx'))
const TestPage = lazy(() => import('@/views/Test/index.tsx'))

/**
 * 静态路由配置（无 Layout 的独立页面）
 */
export const staticRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/test',
    element: <TestPage />,
  },
  {
    path: '/404',
    element: <NotFound />,
  },
  {
    path: '/403',
    element: <Forbidden />,
  },
]