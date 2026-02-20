import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo, LoginDto, LoginResponse } from '@/types/auth'
import { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY, TENANT_ID_KEY, VISIT_TENANT_ID_KEY, MENUS_CACHE_KEY, USER_CACHE_KEY } from '@/types/auth'
import { request } from '@/request'
import { message } from 'antd'

/**
 * 认证状态接口
 */
interface AuthState {
  /** 访问令牌 */
  token: string | null
  /** 刷新令牌 */
  refreshToken: string | null
  /** 用户信息 */
  userInfo: UserInfo | null
  /** 是否加载中 */
  loading: boolean
  /** 是否已认证 */
  isAuthenticated: boolean
  /** 是否已初始化用户信息（类似 hr-front 的 isSetUser） */
  isUserInfoInitialized: boolean
  /** 是否正在初始化用户信息（防止重复请求） */
  isInitializing: boolean
}

/**
 * 认证操作接口
 */
interface AuthActions {
  /** 设置token */
  setToken: (token: string) => void
  /** 设置刷新token */
  setRefreshToken: (refreshToken: string) => void
  /** 设置用户信息 */
  setUserInfo: (userInfo: UserInfo) => void
  /** 登录 */
  login: (credentials: LoginDto) => Promise<void>
  /** 登出 */
  logout: () => Promise<void>
  /** 获取用户信息 */
  getUserInfo: () => Promise<UserInfo>
  /** 初始化用户信息和权限（类似 hr-front 的 setUserInfoAction） */
  initUserInfo: () => Promise<boolean>
  /** 清除认证信息 */
  clearAuth: () => void
  /** 设置用户信息已初始化标志 */
  setUserInfoInitialized: (initialized: boolean) => void
}

/**
 * 认证 Store 类型
 */
type AuthStore = AuthState & AuthActions

/**
 * 认证 Store
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      token: null,
      refreshToken: null,
      userInfo: null,
      loading: false,
      isAuthenticated: false,
      isUserInfoInitialized: false,
      isInitializing: false,

      // 设置 token
      setToken: (token: string) => {
        localStorage.setItem(TOKEN_KEY, token)
        set({ token, isAuthenticated: !!token })
      },

      // 设置刷新 token
      setRefreshToken: (refreshToken: string) => {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
        set({ refreshToken })
      },

      // 设置用户信息
      setUserInfo: (userInfo: UserInfo) => {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
        set({ userInfo })
      },

      // 登录
      login: async (credentials: LoginDto) => {
        set({ loading: true, isInitializing: true })
        try {
          // 调用登录接口
          const response = await request<LoginResponse>({
            url: '/system/auth/login',
            method: 'POST',
            data: credentials,
          })

          // 保存 token
          get().setToken(response.accessToken)
          get().setRefreshToken(response.refreshToken)

          // 保存 userId（用于后续请求）
          if (response.userId) {
            localStorage.setItem('userId', String(response.userId))
          }

          // 获取用户信息（getUserInfo 内部会设置 userInfo 和 isUserInfoInitialized）
          await get().getUserInfo()
          // 确保 isAuthenticated 状态正确设置
          set({ isAuthenticated: true })

          // 设置访问租户ID（登录时）
          const tenantId = localStorage.getItem(TENANT_ID_KEY)
          if (tenantId) {
            localStorage.setItem(VISIT_TENANT_ID_KEY, tenantId)
          }
        } catch (error: any) {
          message.error(error.message || '登录失败，请检查用户名和密码')
          throw error
        } finally {
          set({ loading: false, isInitializing: false })
        }
      },

      // 登出
      logout: async () => {
        try {
          // 调用登出接口
          await request({
            url: '/system/auth/logout',
            method: 'POST',
          })
        } catch (error) {
          console.error('登出接口调用失败:', error)
        } finally {
          // 清除本地数据
          get().clearAuth()
          message.success('已退出登录')
        }
      },

      // 获取用户信息
      getUserInfo: async () => {
        try {
          // 调用获取权限信息接口（返回 user、roles、permissions、menus）
          const response = await request<{
            user: any
            roles: string[]
            permissions: string[]
            menus: any[]
          }>({
            url: '/system/auth/get-permission-info',
            method: 'GET',
          })

          // 构造 UserInfo 对象
          const userInfo: any = {
            ...response.user,
            roles: response.roles,
            permissions: response.permissions,
            menus: response.menus,
          }

          get().setUserInfo(userInfo)
          // 标记用户信息已初始化，防止 Guard 组件重复请求
          set({ isUserInfoInitialized: true })

          // 保存用户信息缓存（包含权限和菜单）
          if (userInfo.menus) {
            localStorage.setItem(MENUS_CACHE_KEY, JSON.stringify(userInfo.menus))
          }
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userInfo))

          return userInfo
        } catch (error) {
          console.error('获取用户信息失败:', error)
          throw error
        }
      },

      // 初始化用户信息和权限（类似 hr-front 的 setUserInfoAction）
      initUserInfo: async () => {
        // 防止重复请求
        if (get().isInitializing) {
          console.log('正在初始化用户信息，跳过重复请求')
          return false
        }

        // 检查是否有 token
        const token = get().token || localStorage.getItem(TOKEN_KEY)
        if (!token) {
          get().clearAuth()
          return false
        }

        try {
          // 设置正在初始化标记
          set({ isInitializing: true })

          // 获取用户信息（包含权限和角色）
          const userInfo = await get().getUserInfo()
          // 设置已初始化标志
          get().setUserInfoInitialized(true)
          // 用户信息已经在 getUserInfo 中保存到 store 和 localStorage
          return true
        } catch (error) {
          console.error('初始化用户信息失败:', error)
          get().clearAuth()
          return false
        } finally {
          // 重置正在初始化标记
          set({ isInitializing: false })
        }
      },

      // 设置用户信息已初始化标志
      setUserInfoInitialized: (initialized: boolean) => {
        set({ isUserInfoInitialized: initialized })
      },

      // 清除认证信息
      clearAuth: () => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        localStorage.removeItem(USER_INFO_KEY)
        localStorage.removeItem(VISIT_TENANT_ID_KEY)
        localStorage.removeItem(MENUS_CACHE_KEY)
        localStorage.removeItem(USER_CACHE_KEY)
        localStorage.removeItem('userId')
        set({
          token: null,
          refreshToken: null,
          userInfo: null,
          isAuthenticated: false,
          isUserInfoInitialized: false,
          isInitializing: false,
        })
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        userInfo: state.userInfo,
        isAuthenticated: state.isAuthenticated,
        // 不持久化 isUserInfoInitialized，每次刷新都要重新检查
        // isUserInfoInitialized: state.isUserInfoInitialized,
      }),
    }
  )
)

/**
 * 快捷方法：获取 token
 */
export const getToken = () => {
  return useAuthStore.getState().token || localStorage.getItem(TOKEN_KEY)
}

/**
 * 快捷方法：获取刷新 token
 */
export const getRefreshToken = () => {
  return useAuthStore.getState().refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * 快捷方法：清除认证信息
 */
export const clearAuth = () => {
  useAuthStore.getState().clearAuth()
}

export default useAuthStore
