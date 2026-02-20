import type { AxiosRequestConfig } from 'axios'

/**
 * 后端响应格式
 */
export interface BackendResultFormat<T = any> {
  /** 响应码，200 表示成功 */
  code: number
  /** 响应数据 */
  data: T
  /** 响应消息 */
  msg: string
}

/**
 * 请求结果格式
 */
export interface ResultFormat<T = any> {
  /** 响应数据 */
  data: T | null
  /** 错误信息 */
  err: Error | null
  /** Axios 响应对象 */
  response: any | null
}

/**
 * 请求配置扩展
 */
export interface RequestConfig extends AxiosRequestConfig {
  /** 请求 URL（必填） */
  url: string
  /** 请求描述 */
  desc?: string
  /** 成功时是否显示通知 */
  notifyWhenSuccess?: boolean
  /** 失败时是否显示通知 */
  notifyWhenFailure?: boolean
  /** 请求限流（最大并发数） */
  limit?: number
  /** URL 参数 */
  args?: Record<string, any>
  /** 是否重试 */
  retry?: boolean | number
}
