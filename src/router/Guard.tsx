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
  const { isAuthenticated, isUserInfoInitialized, initUserInfo } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      const currentPath = location.pathname

      // 检查是否在白名单中
      const isInWhiteList = whiteList.some((path) => {
        // 简单的路径匹配
        if (path === currentPath) return true
        // 支持通配符匹配（如 /404）
        if (path.endsWith('*') && currentPath.startsWith(path.slice(0, -1))) {
          return true
        }
        return false
      })

      // 如果已登录且访问登录页，跳转到首页
      if (isAuthenticated && currentPath === '/login') {
        navigate('/home', { replace: true })
        return
      }

      // 如果未登录且不在白名单中，跳转到登录页
      if (!isAuthenticated && !isInWhiteList) {
        navigate('/login', { replace: true, state: { from: currentPath } })
        return
      }

      // 如果已登录但用户信息未初始化，初始化用户信息
      if (isAuthenticated && !isUserInfoInitialized) {
        const success = await initUserInfo()
        if (!success) {
          // 初始化失败，跳转登录页
          navigate('/login', { replace: true })
          return
        }
      }
    }

    initAuth()
  }, [isAuthenticated, location.pathname, isUserInfoInitialized])

  // 渲染子组件
  return <>{children}</>
}

export default Guard
