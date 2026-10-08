import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserInfo, LoginDto, LoginResponse } from "@/types/auth";
import {
  USER_INFO_KEY,
  TENANT_ID_KEY,
  VISIT_TENANT_ID_KEY,
  MENUS_CACHE_KEY,
  USER_CACHE_KEY,
} from "@/types/auth";
import { request } from "@/request";
import { message } from "antd";
import { useAppStore } from "@/store/appStore";
import { mapPermissionInfo, type PermissionInfoDTO } from "@/utils/authAdapter";
import {
  clearSession,
  establishSession,
  ensureSession,
  getAccessToken,
  getSessionId,
  getRefreshToken as getStoredRefreshToken,
  subscribeAuthLifecycle,
} from "@/utils/authSession";

/**
 * 认证状态接口
 */
interface AuthState {
  /** 用户信息 */
  userInfo: UserInfo | null;
  /** 是否加载中 */
  loading: boolean;
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 是否已初始化用户信息（类似 hr-front 的 isSetUser） */
  isUserInfoInitialized: boolean;
  /** 是否正在初始化用户信息（防止重复请求） */
  isInitializing: boolean;
  /** 用户权限信息加载状态 */
  permissionStatus: "idle" | "loading" | "ready" | "error";
}

/**
 * 认证操作接口
 */
interface AuthActions {
  /** 设置用户信息 */
  setUserInfo: (userInfo: UserInfo) => void;
  /** 登录 */
  login: (credentials: LoginDto) => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 获取用户信息 */
  getUserInfo: () => Promise<UserInfo>;
  /** 初始化用户信息和权限（类似 hr-front 的 setUserInfoAction） */
  initUserInfo: () => Promise<boolean>;
  /** 清除认证信息 */
  clearAuth: (expectedSessionId?: string | null) => boolean;
  /** 设置用户信息已初始化标志 */
  setUserInfoInitialized: (initialized: boolean) => void;
}

/**
 * 认证 Store 类型
 */
type AuthStore = AuthState & AuthActions;

let permissionRequestGeneration = 0;
let permissionRequest: {
  sessionId: string;
  generation: number;
  promise: Promise<UserInfo>;
} | null = null;

function clearPermissionCache() {
  localStorage.removeItem(USER_INFO_KEY);
  localStorage.removeItem(MENUS_CACHE_KEY);
  localStorage.removeItem(USER_CACHE_KEY);
}

function invalidatePermissionRequest() {
  permissionRequestGeneration += 1;
  permissionRequest = null;
}

function resetLocalAuthState(event: "cleared" | "changed" | "established") {
  invalidatePermissionRequest();
  clearPermissionCache();
  localStorage.removeItem("app-storage");
  if (event === "cleared") {
    localStorage.removeItem("userId");
    localStorage.removeItem(VISIT_TENANT_ID_KEY);
  }
  localStorage.removeItem("auth-storage");
  useAppStore.getState().reset();
  useAuthStore.setState({
    userInfo: null,
    isAuthenticated: event !== "cleared" && Boolean(getAccessToken()),
    isUserInfoInitialized: false,
    isInitializing: false,
    permissionStatus: "idle",
  });
}

/**
 * 认证 Store
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      userInfo: null,
      loading: false,
      isAuthenticated: false,
      isUserInfoInitialized: false,
      isInitializing: false,
      permissionStatus: "idle",

      // 设置用户信息
      setUserInfo: (userInfo: UserInfo) => {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
        set({ userInfo });
      },

      // 登录
      login: async (credentials: LoginDto) => {
        set({ loading: true });
        try {
          // 调用登录接口
          const response = await request<LoginResponse>({
            url: "/system/auth/login",
            method: "POST",
            data: credentials,
          });

          // Login succeeds independently from permission loading.
          localStorage.removeItem(VISIT_TENANT_ID_KEY);
          establishSession({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
          });

          // 保存 userId（用于后续请求）
          if (response.userId) {
            localStorage.setItem("userId", String(response.userId));
          }

          set({
            userInfo: null,
            isAuthenticated: true,
            isUserInfoInitialized: false,
            isInitializing: false,
            permissionStatus: "idle",
          });

          // 设置访问租户ID（登录时）
          const tenantId = localStorage.getItem(TENANT_ID_KEY);
          if (tenantId) {
            localStorage.setItem(VISIT_TENANT_ID_KEY, tenantId);
          }
        } catch (error: any) {
          message.error(error.message || "登录失败，请检查用户名和密码");
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // 登出
      logout: async () => {
        const expectedSessionId = getSessionId();
        try {
          // 调用登出接口
          await request({
            url: "/system/auth/logout",
            method: "POST",
          });
        } catch (error) {
          console.error("登出接口调用失败:", error);
        } finally {
          if (get().clearAuth(expectedSessionId)) {
            message.success("已退出登录");
          }
        }
      },

      // 获取用户信息
      getUserInfo: async () => {
        const token = ensureSession();
        if (!token) {
          throw new Error("No authentication token available");
        }

        const sessionId = getSessionId();
        if (!sessionId) {
          throw new Error("No authentication session available");
        }
        if (permissionRequest?.sessionId === sessionId) {
          return permissionRequest.promise;
        }
        const generation = ++permissionRequestGeneration;

        clearPermissionCache();
        set({
          userInfo: null,
          isUserInfoInitialized: false,
          isInitializing: true,
          permissionStatus: "loading",
        });

        const promise = (async () => {
          try {
            const response = await request<PermissionInfoDTO>({
              url: "/system/auth/get-permission-info",
              method: "GET",
            });
            const userInfo = mapPermissionInfo(response);

            if (
              generation !== permissionRequestGeneration ||
              sessionId !== getSessionId()
            ) {
              return userInfo;
            }

            get().setUserInfo(userInfo);
            set({
              isAuthenticated: true,
              isUserInfoInitialized: true,
              permissionStatus: "ready",
            });
            if (userInfo.menus) {
              localStorage.setItem(
                MENUS_CACHE_KEY,
                JSON.stringify(userInfo.menus),
              );
            }
            localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userInfo));
            return userInfo;
          } catch (error) {
            if (
              generation === permissionRequestGeneration &&
              sessionId === getSessionId()
            ) {
              clearPermissionCache();
              set({
                userInfo: null,
                isUserInfoInitialized: false,
                permissionStatus: "error",
              });
            }
            throw error;
          } finally {
            if (
              generation === permissionRequestGeneration &&
              sessionId === getSessionId()
            ) {
              set({ isInitializing: false });
            }
          }
        })();

        permissionRequest = { sessionId, generation, promise };
        try {
          return await promise;
        } finally {
          if (permissionRequest?.promise === promise) {
            permissionRequest = null;
          }
        }
      },

      // 初始化用户信息和权限（类似 hr-front 的 setUserInfoAction）
      initUserInfo: async () => {
        // 检查是否有 token
        const token = ensureSession();
        if (!token) {
          get().clearAuth();
          return false;
        }
        const sessionId = getSessionId();

        try {
          const userInfoPromise = get().getUserInfo();
          const generation = permissionRequest?.generation;
          await userInfoPromise;
          if (
            generation !== permissionRequestGeneration ||
            sessionId !== getSessionId() ||
            !getAccessToken()
          ) {
            return false;
          }
          set({ isAuthenticated: true });
          return true;
        } catch {
          return false;
        }
      },

      // 设置用户信息已初始化标志
      setUserInfoInitialized: (initialized: boolean) => {
        set({ isUserInfoInitialized: initialized });
      },

      // 清除认证信息
      clearAuth: (expectedSessionId) => {
        return clearSession(expectedSessionId);
      },
    }),
    {
      name: "auth-storage", // localStorage key
      partialize: (state) => ({
        userInfo: state.userInfo,
        // 不持久化 isAuthenticated，每次刷新都要重新验证
        // isAuthenticated: state.isAuthenticated,
        // 不持久化 isUserInfoInitialized，每次刷新都要重新检查
        // isUserInfoInitialized: state.isUserInfoInitialized,
      }),
    },
  ),
);

subscribeAuthLifecycle((event) => resetLocalAuthState(event));

/**
 * 快捷方法：获取 token
 * 直接从 localStorage 读取，不依赖 store
 */
export const getToken = () => {
  return getAccessToken();
};

/**
 * 快捷方法：获取刷新 token
 * 直接从 localStorage 读取，不依赖 store
 */
export const getRefreshToken = () => {
  return getStoredRefreshToken();
};

/**
 * 快捷方法：清除认证信息
 */
export const clearAuth = (expectedSessionId?: string | null) => {
  return useAuthStore.getState().clearAuth(expectedSessionId);
};

export default useAuthStore;
