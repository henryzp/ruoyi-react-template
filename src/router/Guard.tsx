import { useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/**
 * 路由守卫组件属性
 */
export interface GuardProps {
  /** 子组件 */
  children: ReactNode
  /** 白名单路由（不需要认证的路由） */
  whiteList?: string[]
}

/**
 * 路由守卫组件
 * 用于控制路由访问权限
 */
export function Guard({ children, whiteList = ['/login', '/404', '/403'] }: GuardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isUserInfoInitialized, userInfo, initUserInfo } = useAuthStore()

  // 初始化认证逻辑（只在关键状态变化时执行）
  useEffect(() => {
    const currentPath = location.pathname

    // 检查是否在白名单中
    const isInWhiteList = whiteList.some((path) => {
      if (path === currentPath) return true
      if (path.endsWith('*') && currentPath.startsWith(path.slice(0, -1))) {
        return true
      }
      return false
    })

    // 如果已登录且有用户信息，说明已经从 localStorage 恢复了，不需要再次初始化
    if (isAuthenticated && userInfo && userInfo.menus) {
      // 标记为已初始化，避免重复请求
      if (!isUserInfoInitialized) {
        useAuthStore.getState().setUserInfoInitialized(true)
      }
      return
    }

    // 如果未登录且不在白名单中，跳转到登录页
    if (!isAuthenticated && !isInWhiteList) {
      navigate('/login', { replace: true, state: { from: currentPath } })
      return
    }

    // 如果已登录但用户信息未初始化，初始化用户信息
    if (isAuthenticated && !isUserInfoInitialized) {
      initUserInfo().then((success) => {
        if (!success) {
          // 初始化失败，跳转登录页
          navigate('/login', { replace: true })
        }
      })
      return
    }
  // 只依赖关键状态
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isUserInfoInitialized, userInfo])

  // 监听路径变化，处理已登录访问登录页的情况
  useEffect(() => {
    const currentPath = location.pathname

    // 如果已登录且访问登录页，跳转到首页
    if (isAuthenticated && currentPath === '/login') {
      navigate('/home', { replace: true })
    }
  }, [location.pathname, isAuthenticated])

  // 渲染子组件
  return <>{children}</>
}

export default Guard
