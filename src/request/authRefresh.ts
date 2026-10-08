import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  ensureSession,
  getRefreshToken,
  getSessionId,
  setAuthTokens,
  subscribeAuthLifecycle,
  type AuthTokens,
} from "@/utils/authSession";

interface AuthRequestConfig extends InternalAxiosRequestConfig {
  __sessionId?: string | null;
  __isRetryAfterRefresh?: boolean;
  __hybridRequest?: boolean;
}

interface RefreshResponse {
  code: number;
  data?: AuthTokens;
  msg?: string;
}

interface RefreshError extends Error {
  __authHandled?: boolean;
}

interface AuthRefreshOptions {
  baseURL: string;
  timeout: number;
  refreshHeaders: () => Record<string, string>;
  onUnauthorized: (
    message: string | undefined,
    sessionId: string | null,
  ) => boolean;
}

class SessionChangedError extends Error {
  constructor() {
    super("Authentication session changed during the request");
    this.name = "SessionChangedError";
  }
}

class RefreshExpiredError extends Error {
  constructor(message?: string) {
    super(message || "Login session expired");
    this.name = "RefreshExpiredError";
  }
}

const refreshExcludedPaths = new Set([
  "/system/auth/login",
  "/system/auth/refresh-token",
  "/system/auth/logout",
]);
const authHeaderExcludedPaths = new Set([
  "/system/auth/login",
  "/system/auth/refresh-token",
]);

const getPath = (url?: string) => {
  if (!url) return "";
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return url.split("?")[0];
  }
};

export const isRefreshExcludedRequest = (config?: { url?: string }) =>
  refreshExcludedPaths.has(getPath(config?.url));
export const isAuthHeaderExcludedRequest = (config?: { url?: string }) =>
  authHeaderExcludedPaths.has(getPath(config?.url));

const markAuthHandled = (error: unknown) => {
  if (error && typeof error === "object") {
    (error as RefreshError).__authHandled = true;
  }
  return error;
};

const isExpiredRefreshError = (error: unknown): boolean =>
  error instanceof RefreshExpiredError ||
  (error as AxiosError<RefreshResponse> | null)?.response?.status === 401 ||
  (error as AxiosError<RefreshResponse> | null)?.response?.data?.code === 400 ||
  (error as AxiosError<RefreshResponse> | null)?.response?.data?.code === 401;

/**
 * Attach session-aware refresh handling to the app's normal Axios instance.
 * The refresh client is deliberately separate so refresh responses cannot recurse.
 */
export function attachAuthRefreshInterceptors(
  requestInstance: AxiosInstance,
  options: AuthRefreshOptions,
) {
  const refreshClient = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout,
  });
  let refreshState: {
    sessionId: string | null;
    promise: Promise<AuthTokens>;
  } | null = null;
  let isHandlingUnauthorized = false;

  subscribeAuthLifecycle(() => {
    isHandlingUnauthorized = false;
  });

  const refreshAccessToken = async (
    refreshToken: string,
    sessionId: string | null,
  ): Promise<AuthTokens> => {
    try {
      const response = await refreshClient.post<RefreshResponse>(
        `/system/auth/refresh-token?refreshToken=${encodeURIComponent(refreshToken)}`,
        null,
        { headers: options.refreshHeaders() },
      );
      const { code, data, msg } = response.data;
      if (code === 400 || code === 401) {
        throw new RefreshExpiredError(msg);
      }
      if (code !== 0 || !data?.accessToken || !data.refreshToken) {
        throw new Error(msg || "Refresh token failed");
      }
      if (
        getSessionId() !== sessionId ||
        getRefreshToken() !== refreshToken ||
        !setAuthTokens(data, sessionId)
      ) {
        throw new SessionChangedError();
      }
      isHandlingUnauthorized = false;
      return data;
    } catch (error) {
      if (error instanceof SessionChangedError) throw error;
      if (getSessionId() !== sessionId || getRefreshToken() !== refreshToken) {
        throw new SessionChangedError();
      }
      if (isExpiredRefreshError(error)) {
        const refreshResponse = (error as AxiosError<RefreshResponse> | null)
          ?.response;
        const unauthorizedMessage = refreshResponse
          ? refreshResponse.data?.msg
          : (error as Error).message;
        showUnauthorized(unauthorizedMessage, sessionId, error);
      }
      throw error;
    }
  };

  const getRefreshPromise = () => {
    const sessionId = getSessionId();
    if (refreshState && refreshState.sessionId === sessionId) {
      return refreshState.promise;
    }
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return Promise.reject(new RefreshExpiredError("Missing refresh token"));
    }
    const promise = refreshAccessToken(refreshToken, sessionId).finally(() => {
      if (refreshState?.promise === promise) refreshState = null;
    });
    refreshState = { sessionId, promise };
    return promise;
  };

  const showUnauthorized = (
    message: string | undefined,
    sessionId: string | null,
    cause: unknown,
  ) => {
    if (isHandlingUnauthorized) {
      throw markAuthHandled(cause);
    }
    if (sessionId !== getSessionId()) {
      throw markAuthHandled(new SessionChangedError());
    }
    if (options.onUnauthorized(message, sessionId))
      isHandlingUnauthorized = true;
    throw markAuthHandled(cause);
  };

  const replayRequest = (
    config: AuthRequestConfig,
    sessionId: string | null,
    accessToken: string,
  ) => {
    if (sessionId !== getSessionId()) {
      return Promise.reject(markAuthHandled(new SessionChangedError()));
    }
    config.__isRetryAfterRefresh = true;
    config.headers.Authorization = `Bearer ${accessToken}`;
    return requestInstance.request(config);
  };

  const handleUnauthorized = async (
    config: AuthRequestConfig | undefined,
    message: string | undefined,
    cause: unknown,
  ) => {
    if (!config) return Promise.reject(cause);
    const sessionId = config.__sessionId ?? null;
    if (sessionId !== getSessionId()) {
      return Promise.reject(markAuthHandled(new SessionChangedError()));
    }

    if (config.__isRetryAfterRefresh || !getRefreshToken()) {
      return showUnauthorized(message, sessionId, cause);
    }

    try {
      const tokens = await getRefreshPromise();
      if (sessionId !== getSessionId()) {
        throw new SessionChangedError();
      }
      return replayRequest(config, sessionId, tokens.accessToken);
    } catch (refreshError) {
      if (isAuthRefreshHandledError(refreshError)) {
        return Promise.reject(refreshError);
      }
      if (refreshError instanceof SessionChangedError) {
        return Promise.reject(markAuthHandled(refreshError));
      }
      return Promise.reject(refreshError);
    }
  };

  requestInstance.interceptors.request.use((config) => {
    const authConfig = config as AuthRequestConfig;
    if (!Object.prototype.hasOwnProperty.call(authConfig, "__sessionId")) {
      authConfig.__sessionId = getSessionId() ?? ensureSession();
    }
    if (authConfig.__sessionId !== getSessionId()) {
      return Promise.reject(markAuthHandled(new SessionChangedError()));
    }
    return config;
  });

  requestInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      const config = response.config as AuthRequestConfig;
      const code = (response.data as RefreshResponse | undefined)?.code;
      if (getPath(config.url) === "/system/auth/login" && code === 0) {
        isHandlingUnauthorized = false;
      }
      if (
        isRefreshExcludedRequest(config) ||
        config.__sessionId !== getSessionId() ||
        code !== 401
      ) {
        return response;
      }
      return handleUnauthorized(
        config,
        (response.data as RefreshResponse).msg,
        new RefreshExpiredError((response.data as RefreshResponse).msg),
      );
    },
    (error: AxiosError<RefreshResponse>) => {
      const config = error.config as AuthRequestConfig | undefined;
      if (
        !config ||
        isRefreshExcludedRequest(config) ||
        (error.response?.status !== 401 && error.response?.data?.code !== 401)
      ) {
        return Promise.reject(error);
      }
      return handleUnauthorized(config, error.response?.data?.msg, error);
    },
  );
}

export const isAuthRefreshHandledError = (error: unknown): boolean =>
  Boolean((error as RefreshError | null)?.__authHandled);
