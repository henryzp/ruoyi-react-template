import type { RequestConfig, ResultFormat } from "@/request";
import { findMockHandler } from "./adapter/registry";
import type { MockEnvelope, MockRequestConfig } from "./types";
import { toSafeResponse } from "./responseSummary";
import { makeRequestForHybrid } from "../request";

const logMockResponse = (
  method: string,
  path: string,
  status: "success" | "error",
  envelope: MockEnvelope,
) => {
  try {
    const safeEnvelope = toSafeResponse(envelope);
    const color = status === "success" ? "#138a36" : "#c62828";
    console.groupCollapsed(
      `%c【Mock 请求返回】 %c${method} ${path} %c${status === "success" ? "成功" : "失败"}`,
      "color:#1677ff;font-weight:700",
      "color:#1e3c72;font-weight:600",
      `color:${color};font-weight:700`,
    );
    console.log("响应数据", safeEnvelope);
  } catch {
    // Logging must never affect the mock request result.
  } finally {
    try {
      console.groupEnd();
    } catch {
      // Logging must never affect the mock request result.
    }
  }
};

export const makeHybridRequest =
  <Payload>(config: RequestConfig) =>
  async (requestConfig?: MockRequestConfig): Promise<ResultFormat<Payload>> => {
    const merged = {
      ...config,
      ...requestConfig,
      params: { ...config.params, ...requestConfig?.params },
      headers: { ...config.headers, ...requestConfig?.headers },
    } as RequestConfig & { mockUrl?: string };
    const method = (merged.method || "GET").toUpperCase();
    const path = merged.mockUrl || merged.url;

    const realResult =
      await makeRequestForHybrid<Payload>(config)(requestConfig);
    if (realResult.response?.status !== 404) {
      return { ...realResult, response: realResult.response ?? null };
    }

    const handler = findMockHandler(method, path);
    if (!handler) {
      const message = `Hybrid 真实接口返回 404，且未配置 mock 接口：${method} ${path}`;
      return {
        data: null,
        err: new Error(message),
        response: realResult.response ?? null,
      };
    }
    try {
      const envelope = await handler.handle(merged, merged);
      if (envelope.code !== 0) {
        logMockResponse(method, path, "error", envelope);
        return {
          data: null,
          err: new Error(envelope.msg),
          response: realResult.response ?? null,
        };
      }
      logMockResponse(method, path, "success", envelope);
      return {
        data: envelope.data as Payload,
        err: null,
        response: realResult.response ?? null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logMockResponse(method, path, "error", {
        code: -1,
        data: { error: message },
        msg: message,
      });
      return {
        data: null,
        err: error instanceof Error ? error : new Error(message),
        response: realResult.response ?? null,
      };
    }
  };

export const makeRequest =
  <Payload>(config: RequestConfig) =>
  async (requestConfig?: MockRequestConfig): Promise<ResultFormat<Payload>> => {
    if (import.meta.env.MODE === "hybrid") {
      return makeHybridRequest<Payload>(config)(requestConfig);
    }

    const merged = {
      ...config,
      ...requestConfig,
      params: { ...config.params, ...requestConfig?.params },
      headers: { ...config.headers, ...requestConfig?.headers },
    } as RequestConfig & { mockUrl?: string };
    const method = (merged.method || "GET").toUpperCase();
    const path = merged.mockUrl || merged.url;
    const handler = findMockHandler(method, path);
    if (!handler) {
      const message = `未配置 mock 接口：${method} ${path}`;
      logMockResponse(method, path, "error", {
        code: 1,
        data: null,
        msg: message,
      });
      return { data: null, err: new Error(message), response: null };
    }
    try {
      const envelope = await handler.handle(merged, merged);
      if (envelope.code !== 0) {
        logMockResponse(method, path, "error", envelope);
        return { data: null, err: new Error(envelope.msg), response: null };
      }
      logMockResponse(method, path, "success", envelope);
      return { data: envelope.data as Payload, err: null, response: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logMockResponse(method, path, "error", {
        code: -1,
        data: { error: message },
        msg: message,
      });
      return {
        data: null,
        err: error instanceof Error ? error : new Error(message),
        response: null,
      };
    }
  };

export const request = async <Payload = unknown>(
  config: RequestConfig,
): Promise<Payload> => {
  const { data, err } = await makeRequest<Payload>(config)();
  if (err) throw err;
  return data as Payload;
};

export default makeRequest;
