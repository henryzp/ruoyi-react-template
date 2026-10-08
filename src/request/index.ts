import axios, { type AxiosResponse, type AxiosError } from "axios";
import type { BackendResultFormat, RequestConfig } from "./types";
import { message } from "antd";
import { getToken, getRefreshToken, clearAuth } from "@/store/authStore";

export type { BackendResultFormat, RequestConfig, ResultFormat } from "./types";
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TENANT_ID_KEY,
  VISIT_TENANT_ID_KEY,
} from "@/types/auth";

/**
 * 创建 axios 实例
 */
const instance = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API || "/admin-api",
  timeout: 30000,
});

/**
 * 是否正在刷新 token
 */
let isRefreshing = false;

/**
 * 刷新 token 的请求列表
 */
let requestList: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

type AuthSession = { accessToken: string | null; refreshToken: string | null };

class RefreshExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefreshExpiredError";
  }
}

function getCurrentSession(): AuthSession {
  return { accessToken: getToken(), refreshToken: getRefreshToken() };
}

function isSameSession(session: AuthSession): boolean {
  const current = getCurrentSession();
  return (
    current.accessToken === session.accessToken &&
    current.refreshToken === session.refreshToken
  );
}

function isExpiredRefreshError(error: any): boolean {
  return (
    error instanceof RefreshExpiredError ||
    error?.response?.status === 401 ||
    error?.response?.data?.code === 400 ||
    error?.response?.data?.code === 401
  );
}

/**
 * 处理 401 错误：刷新 token 并重试请求
 */
async function handle401Error(_error: any, config?: any): Promise<any> {
  // 如果正在刷新 token，将请求加入队列
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      requestList.push({
        resolve: (newToken: string) => {
          if (config?.headers) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
          resolve(instance(config!));
        },
        reject,
      });
    });
  }

  // 开始刷新 token
  isRefreshing = true;
  const session = getCurrentSession();

  try {
    const refreshed = await refreshAccessToken(session.refreshToken);
    if (!isSameSession(session)) {
      throw new Error("Authentication session changed during token refresh");
    }
    localStorage.setItem(TOKEN_KEY, refreshed.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshed.refreshToken);
    isRefreshing = false;

    // 执行队列中的请求
    requestList.forEach(({ resolve }) => resolve(refreshed.accessToken));
    requestList = [];

    // 重试当前请求
    if (config?.headers) {
      config.headers.Authorization = `Bearer ${refreshed.accessToken}`;
    }
    return instance(config!);
  } catch (refreshError) {
    // 所有等待请求都失败；仅确认当前会话仍是发起刷新时的会话后才清理。
    isRefreshing = false;
    requestList.forEach(({ reject }) => reject(refreshError));
    requestList = [];
    if (isSameSession(session) && isExpiredRefreshError(refreshError)) {
      clearAuth();
      message.error("登录已过期，请重新登录");
      window.location.href = "/login";
    }

    return Promise.reject(refreshError);
  }
}

/**
 * 刷新 token
 */
async function refreshAccessToken(
  refreshToken: string | null,
): Promise<{ accessToken: string; refreshToken: string }> {
  if (!refreshToken) {
    throw new RefreshExpiredError("No refresh token available");
  }

  const response = await instance.post<{
    code: number;
    data: any;
    msg: string;
  }>(`/system/auth/refresh-token`, null, {
    __isRefreshRequest: true,
    params: {
      refreshToken: refreshToken,
    },
  } as any);

  if (response.data.code === 0 && response.data.data) {
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    return { accessToken, refreshToken: newRefreshToken };
  }

  if (response.data.code === 400 || response.data.code === 401) {
    throw new RefreshExpiredError("Refresh token failed: " + response.data.msg);
  }
  const error = new Error("Refresh token failed: " + response.data.msg);
  Object.assign(error, { businessCode: response.data.code });
  throw error;
}

/**
 * 请求拦截器：注入 token 和租户信息
 */
instance.interceptors.request.use(
  (config) => {
    // 注入访问令牌
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 注入租户信息（从 localStorage 或默认值）
    const storage = typeof localStorage === "undefined" ? null : localStorage;
    const tenantId = storage?.getItem(TENANT_ID_KEY) || "1";
    const visitTenantId = storage?.getItem(VISIT_TENANT_ID_KEY);

    if (tenantId && config.headers) {
      config.headers["Tenant-id"] = tenantId;
    }

    if (visitTenantId && config.headers) {
      config.headers["Visit-Tenant-id"] = visitTenantId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * 响应拦截器：处理 token 刷新和错误
 */
instance.interceptors.response.use(
  (response: AxiosResponse<BackendResultFormat>) => {
    // 检查业务错误码 401（HTTP 200 但 code: 401）
    if (
      response.data?.code === 401 &&
      !(response.config as typeof response.config & { __isRefreshRequest?: boolean })
        .__isRefreshRequest
    ) {
      return handle401Error(null, response.config);
    }
    return response;
  },
  async (error: AxiosError<BackendResultFormat>) => {
    const { response, config } = error;

    if (
      (config as (typeof config & { __isRefreshRequest?: boolean }) | undefined)
        ?.__isRefreshRequest
    ) {
      return Promise.reject(error);
    }

    // Hybrid owns HTTP 404 fallback; leave it to its caller without a toast.
    if (
      response?.status === 404 &&
      (config as (typeof config & { __hybridRequest?: boolean }) | undefined)
        ?.__hybridRequest
    ) {
      return Promise.reject(error);
    }

    // 处理 401 未认证错误
    if (response?.status === 401 || response?.data?.code === 401) {
      return handle401Error(error, config);
    }

    // 处理 403 无权限错误
    if (response?.status === 403 || response?.data?.code === 403) {
      message.error(response.data.msg || "无权限访问");
      return Promise.reject(error);
    }

    // 处理其他错误
    if (response?.data?.msg) {
      message.error(response.data.msg);
    } else {
      message.error("请求失败，请稍后重试");
    }

    return Promise.reject(error);
  },
);

/**
 * 自定义错误类
 */
export class CodeNotZeroError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "CodeNotZeroError";
  }
}

/**
 * 请求结果格式
 */
export interface RequestResult<T = any> {
  data: T | null;
  err: Error | null;
  response?: AxiosResponse | null;
}

/**
 * makeRequest 函数
 * 参考 whole-course-front 的实现，返回一个预设配置的请求函数
 */
interface MakeRequest {
  <Payload = any>(
    config: RequestConfig,
  ): (
    requestConfig?: Partial<RequestConfig>,
  ) => Promise<RequestResult<Payload>>;

  <Payload, Params = any>(
    config: RequestConfig,
  ): (
    requestConfig: Partial<Omit<RequestConfig, "params">> & { params?: Params },
  ) => Promise<RequestResult<Payload>>;

  <Payload, Data = any>(
    config: RequestConfig,
  ): (
    requestConfig: Partial<Omit<RequestConfig, "data">> & { data?: Data },
  ) => Promise<RequestResult<Payload>>;

  <Payload, Data = any, Params = any>(
    config: RequestConfig,
  ): (
    requestConfig: Partial<Omit<RequestConfig, "data" | "params">> & {
      data?: Data;
      params?: Params;
    },
  ) => Promise<RequestResult<Payload>>;

  <Payload, Data = any, Params = any, Args = any>(
    config: RequestConfig,
  ): (
    requestConfig: Partial<Omit<RequestConfig, "data" | "params" | "args">> & {
      data?: Data;
      params?: Params;
      args?: Args;
    },
  ) => Promise<RequestResult<Payload>>;
}

/**
 * makeRequest：创建一个预设配置的请求函数
 * @example
 * // 基础用法
 * export const getUserInfo = makeRequest({
 *   url: '/user/info',
 *   method: 'GET',
 * });
 *
 * // 使用
 * const { data, err } = await getUserInfo();
 *
 * @example
 * // 带参数
 * export const getUserList = makeRequest({
 *   url: '/user/list',
 *   method: 'GET',
 * });
 * const { data, err } = await getUserList({
 *   params: { pageNo: 1, pageSize: 10 },
 * });
 */
const makeRequestInternal = <T>(config: RequestConfig, hybrid = false) => {
  return async (requestConfig?: Partial<RequestConfig>) => {
    // 合并配置
    const mergedConfig: RequestConfig = {
      ...config,
      ...requestConfig,
      params: {
        ...config.params,
        ...requestConfig?.params,
      },
      headers: {
        ...config.headers,
        ...requestConfig?.headers,
      },
    };

    try {
      let response: AxiosResponse<BackendResultFormat<T>>;
      try {
        const transportConfig = hybrid
          ? { ...mergedConfig, __hybridRequest: true }
          : mergedConfig;
        response =
          await instance.request<BackendResultFormat<T>>(transportConfig);
      } catch (error) {
        // Hybrid owns HTTP 404 fallback and retains the response for that decision.
        if (hybrid && (error as AxiosError).response?.status === 404) {
          return {
            data: null,
            err: error as Error,
            response: (error as AxiosError).response,
          };
        }
        throw error;
      }
      const res = response.data;

      if (mergedConfig.rawResponse) {
        return { data: res as T, err: null, response };
      }

      // 成功码判断（适配后端响应格式，成功码为 0）
      if (res.code === 0) {
        return { data: res.data, err: null, response };
      } else {
        // 业务错误
        const error = new CodeNotZeroError(res.code, res.msg || "请求失败");
        return { data: null, err: error, response };
      }
    } catch (err: any) {
      // 网络错误或其他错误
      return { data: null, err, response: err?.response ?? null };
    }
  };
};

export const makeRequest: MakeRequest = <T>(config: RequestConfig) =>
  makeRequestInternal<T>(config);

/** Real transport entrypoint used by hybrid mode before a possible mock fallback. */
export const makeRequestForHybrid = <T>(config: RequestConfig) =>
  makeRequestInternal<T>(config, true);

/**
 * request 函数（兼容性保留）
 * 直接发送请求，返回 Promise<T>
 */
export function request<T = any>(config: RequestConfig): Promise<T> {
  return new Promise((resolve, reject) => {
    instance
      .request<BackendResultFormat<T>>(config)
      .then((response) => {
        const { data } = response;

        // 成功码判断（适配后端响应格式，成功码为 0）
        if (data.code === 0) {
          resolve(data.data);
        } else {
          // 业务错误
          const error = new CodeNotZeroError(data.code, data.msg || "请求失败");
          message.error(data.msg || "请求失败");
          reject(error);
        }
      })
      .catch((error: AxiosError<BackendResultFormat>) => {
        // 网络错误或其他错误
        if (error.response?.data?.msg) {
          message.error(error.response.data.msg);
        }
        reject(error);
      });
  });
}

/**
 * GET 请求快捷方法
 */
export function get<T = any>(
  url: string,
  params?: Record<string, any>,
  config?: Partial<Omit<RequestConfig, "url" | "method" | "params">>,
): Promise<T> {
  return request<T>({ ...config, url, method: "GET", params });
}

/**
 * POST 请求快捷方法
 */
export function post<T = any>(
  url: string,
  data?: any,
  config?: Partial<Omit<RequestConfig, "url" | "method" | "data">>,
): Promise<T> {
  return request<T>({ ...config, url, method: "POST", data });
}

/**
 * PUT 请求快捷方法
 */
export function put<T = any>(
  url: string,
  data?: any,
  config?: Partial<Omit<RequestConfig, "url" | "method" | "data">>,
): Promise<T> {
  return request<T>({ ...config, url, method: "PUT", data });
}

/**
 * DELETE 请求快捷方法
 */
export function del<T = any>(
  url: string,
  params?: Record<string, any>,
  config?: Partial<Omit<RequestConfig, "url" | "method" | "params">>,
): Promise<T> {
  return request<T>({ ...config, url, method: "DELETE", params });
}

export default instance;
