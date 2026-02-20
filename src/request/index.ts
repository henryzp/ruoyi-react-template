import axios, { type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'
import type { BackendResultFormat, ResultFormat, RequestConfig } from './types'
import { message } from 'antd'
import { getToken, getRefreshToken, clearAuth } from '@/store/authStore'
import { TOKEN_KEY, REFRESH_TOKEN_KEY, TENANT_ID_KEY, VISIT_TENANT_ID_KEY } from '@/types/auth'

/**
 * 创建 axios 实例
 */
const instance = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API || '/admin-api',
  timeout: 30000,
})

/**
 * 是否正在刷新 token
 */
let isRefreshing = false

/**
 * 刷新 token 的请求列表
 */
let requestList: Array<(token: string) => void> = []

/**
 * 刷新 token
 */
async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await axios.post<{
    code: number
    data: { accessToken: string; refreshToken: string }
    msg: string
  }>(`${import.meta.env.VITE_APP_BASE_API}/auth/refresh`, {
    refreshToken,
  })

  if (response.data.code === 0 && response.data.data) {
    const { accessToken, refreshToken: newRefreshToken } = response.data.data
    // 保存新 token
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
    return accessToken
  }

  throw new Error('Refresh token failed')
}

/**
 * 请求拦截器：注入 token 和租户信息
 */
instance.interceptors.request.use(
  (config) => {
    // 注入访问令牌
    const token = getToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 注入租户信息（从 localStorage 或默认值）
    const tenantId = localStorage.getItem(TENANT_ID_KEY) || '1'
    const visitTenantId = localStorage.getItem(VISIT_TENANT_ID_KEY)

    if (tenantId && config.headers) {
      config.headers['Tenant-id'] = tenantId
    }

    if (visitTenantId && config.headers) {
      config.headers['Visit-Tenant-id'] = visitTenantId
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * 响应拦截器：处理 token 刷新和错误
 */
instance.interceptors.response.use(
  (response: AxiosResponse<BackendResultFormat>) => {
    return response
  },
  async (error: AxiosError<BackendResultFormat>) => {
    const { response, config } = error

    // 处理 401 未认证错误
    if (response?.status === 401 || response?.data?.code === 401) {
      // 如果正在刷新 token，将请求加入队列
      if (isRefreshing) {
        return new Promise((resolve) => {
          requestList.push((newToken: string) => {
            if (config?.headers) {
              config.headers.Authorization = `Bearer ${newToken}`
            }
            resolve(instance(config!))
          })
        })
      }

      // 开始刷新 token
      isRefreshing = true

      try {
        const newToken = await refreshAccessToken()
        isRefreshing = false

        // 执行队列中的请求
        requestList.forEach((callback) => callback(newToken))
        requestList = []

        // 重试当前请求
        if (config?.headers) {
          config.headers.Authorization = `Bearer ${newToken}`
        }
        return instance(config!)
      } catch (refreshError) {
        // 刷新失败，清除认证信息并跳转登录页
        isRefreshing = false
        requestList = []
        clearAuth()

        message.error('登录已过期，请重新登录')
        window.location.href = '/login'

        return Promise.reject(refreshError)
      }
    }

    // 处理 403 无权限错误
    if (response?.status === 403 || response?.data?.code === 403) {
      message.error(response.data.msg || '无权限访问')
      return Promise.reject(error)
    }

    // 处理其他错误
    if (response?.data?.msg) {
      message.error(response.data.msg)
    } else {
      message.error('请求失败，请稍后重试')
    }

    return Promise.reject(error)
  }
)

/**
 * 自定义错误类
 */
export class CodeNotZeroError extends Error {
  code: number

  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'CodeNotZeroError'
  }
}

/**
 * makeRequest 函数
 * 统一的请求封装，参考 whole-course-front 的实现
 */
export function request<T = any>(
  config: RequestConfig
): Promise<T> {
  return new Promise((resolve, reject) => {
    instance
      .request<BackendResultFormat<T>>(config)
      .then((response) => {
        const { data } = response

        // 成功码判断（适配后端响应格式，成功码为 0）
        if (data.code === 0) {
          resolve(data.data)
        } else {
          // 业务错误
          const error = new CodeNotZeroError(data.code, data.msg || '请求失败')
          message.error(data.msg || '请求失败')
          reject(error)
        }
      })
      .catch((error: AxiosError<BackendResultFormat>) => {
        // 网络错误或其他错误
        if (error.response?.data?.msg) {
          message.error(error.response.data.msg)
        }
        reject(error)
      })
  })
}

/**
 * GET 请求快捷方法
 */
export function get<T = any>(
  url: string,
  params?: Record<string, any>,
  config?: Partial<Omit<RequestConfig, 'url' | 'method' | 'params'>>
): Promise<T> {
  return request<T>({ ...config, url, method: 'GET', params })
}

/**
 * POST 请求快捷方法
 */
export function post<T = any>(
  url: string,
  data?: any,
  config?: Partial<Omit<RequestConfig, 'url' | 'method' | 'data'>>
): Promise<T> {
  return request<T>({ ...config, url, method: 'POST', data })
}

/**
 * PUT 请求快捷方法
 */
export function put<T = any>(
  url: string,
  data?: any,
  config?: Partial<Omit<RequestConfig, 'url' | 'method' | 'data'>>
): Promise<T> {
  return request<T>({ ...config, url, method: 'PUT', data })
}

/**
 * DELETE 请求快捷方法
 */
export function del<T = any>(
  url: string,
  params?: Record<string, any>,
  config?: Partial<Omit<RequestConfig, 'url' | 'method' | 'params'>>
): Promise<T> {
  return request<T>({ ...config, url, method: 'DELETE', params })
}

export default instance
