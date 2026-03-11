import axios, { type AxiosResponse, type AxiosError } from "axios";
import type { BackendResultFormat, RequestConfig } from "./types";
import { message } from "antd";
import { getToken, getRefreshToken, clearAuth } from "@/store/authStore";
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
let requestList: Array<(token: string) => void> = [];

/**
 * 处理 401 错误：刷新 token 并重试请求
 */
async function handle401Error(error: any, config?: any): Promise<any> {
  console.log("[handle401Error] 开始处理 401 错误", {
    isRefreshing,
    hasConfig: !!config,
    url: config?.url,
  });

  // 如果正在刷新 token，将请求加入队列
  if (isRefreshing) {
    console.log("[handle401Error] 正在刷新，将请求加入队列");
    return new Promise((resolve) => {
      requestList.push((newToken: string) => {
        console.log("[handle401Error] 队列中的请求准备重试", {
          url: config?.url,
        });
        if (config?.headers) {
          config.headers.Authorization = `Bearer ${newToken}`;
        }
        resolve(instance(config!));
      });
    });
  }

  // 开始刷新 token
  isRefreshing = true;
  console.log("[handle401Error] 开始刷新 token 流程");

  try {
    const newToken = await refreshAccessToken();
    isRefreshing = false;
    console.log("[handle401Error] token 刷新成功，准备重试请求", {
      newToken: newToken?.substring(0, 20) + "...",
      url: config?.url,
    });

    // 执行队列中的请求
    console.log(
      "[handle401Error] 执行队列中的请求，队列长度:",
      requestList.length,
    );
    requestList.forEach((callback) => callback(newToken));
    requestList = [];

    // 重试当前请求
    if (config?.headers) {
      config.headers.Authorization = `Bearer ${newToken}`;
    }
    console.log("[handle401Error] 开始重试当前请求:", config?.url);
    return instance(config!);
  } catch (refreshError) {
    // 刷新失败，清除认证信息并跳转登录页
    isRefreshing = false;
    requestList = [];
    clearAuth();

    console.log("[handle401Error] token 刷新失败，清除认证信息");
    message.error("登录已过期，请重新登录");
    window.location.href = "/login";

    return Promise.reject(refreshError);
  }
}

/**
 * 刷新 token
 */
async function refreshAccessToken(): Promise<string> {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      const log = "[refreshAccessToken] 没有 refresh token";
      console.log(log);
      localStorage.setItem("debug_refresh_token", log);
      throw new Error("No refresh token available");
    }

    const log1 = "[refreshAccessToken] 开始刷新 token";
    console.log(log1);
    localStorage.setItem("debug_refresh_token", log1);

    const response = await instance.post<{
      code: number;
      data: any;
      msg: string;
    }>(`/system/auth/refresh-token`, null, {
      params: {
        refreshToken: refreshToken,
      },
    });

    const log2 =
      "[refreshAccessToken] 收到响应: " +
      JSON.stringify({
        status: response.status,
        code: response.data.code,
        msg: response.data.msg,
        hasData: !!response.data.data,
      });
    console.log(log2);
    localStorage.setItem("debug_refresh_token_response", log2);

    if (response.data.code === 0 && response.data.data) {
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      const log3 = "[refreshAccessToken] 刷新成功";
      console.log(log3);
      localStorage.setItem("debug_refresh_token", log3);

      // 保存新 token 到 localStorage
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);

      const log4 = "[refreshAccessToken] 新 token 已保存";
      console.log(log4);
      localStorage.setItem("debug_refresh_token", log4);
      return accessToken;
    }

    const log5 = "[refreshAccessToken] 刷新失败 - code 不为 0 或没有 data";
    console.log(log5);
    localStorage.setItem("debug_refresh_token", log5);
    throw new Error("Refresh token failed: " + response.data.msg);
  } catch (error: any) {
    const log = "[refreshAccessToken] 捕获异常: " + error.message;
    console.log(log);
    localStorage.setItem("debug_refresh_token_error", log);
    throw error;
  }
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
    const tenantId = localStorage.getItem(TENANT_ID_KEY) || "1";
    const visitTenantId = localStorage.getItem(VISIT_TENANT_ID_KEY);

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
    if (response.data?.code === 401) {
      console.log("[axios interceptor] 业务错误码 401，开始刷新 token", {
        url: response.config?.url,
        msg: response.data.msg,
      });
      return handle401Error(null, response.config);
    }
    return response;
  },
  async (error: AxiosError<BackendResultFormat>) => {
    const { response, config } = error;

    console.log("[axios interceptor] 响应错误:", {
      url: config?.url,
      status: response?.status,
      code: response?.data?.code,
      msg: response?.data?.msg,
    });

    // 处理 401 未认证错误
    if (response?.status === 401 || response?.data?.code === 401) {
      console.log("[axios interceptor] 检测到 401 错误，开始刷新 token");
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
export const makeRequest: MakeRequest = <T>(config: RequestConfig) => {
  return async (requestConfig?: Partial<RequestConfig>) => {
    // 合并配置
    const mergedConfig: RequestConfig = {
      ...config,
      ...requestConfig,
      headers: {
        ...config.headers,
        ...requestConfig?.headers,
      },
    };

    try {
      const response =
        await instance.request<BackendResultFormat<T>>(mergedConfig);
      const res = response.data;

      // 成功码判断（适配后端响应格式，成功码为 0）
      if (res.code === 0) {
        return { data: res.data, err: null };
      } else {
        // 业务错误
        const error = new CodeNotZeroError(res.code, res.msg || "请求失败");
        return { data: null, err: error };
      }
    } catch (err: any) {
      // 网络错误或其他错误
      return { data: null, err };
    }
  };
};

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
