import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserInfo, LoginDto, LoginResponse } from "@/types/auth";
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
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
  clearAuth: () => void;
  /** 设置用户信息已初始化标志 */
  setUserInfoInitialized: (initialized: boolean) => void;
}

/**
 * 认证 Store 类型
 */
type AuthStore = AuthState & AuthActions;

let authGeneration = 0;
let permissionRequest: {
  generation: number;
  promise: Promise<UserInfo>;
} | null = null;

function clearPermissionCache() {
  localStorage.removeItem(USER_INFO_KEY);
  localStorage.removeItem(MENUS_CACHE_KEY);
  localStorage.removeItem(USER_CACHE_KEY);
}

function invalidatePermissionRequest() {
  authGeneration += 1;
  permissionRequest = null;
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

          // A new successful login invalidates any permission response from an older auth state.
          invalidatePermissionRequest();
          clearPermissionCache();

          // Login succeeds independently from permission loading.
          localStorage.setItem(TOKEN_KEY, response.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);

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
        try {
          // 调用登出接口
          await request({
            url: "/system/auth/logout",
            method: "POST",
          });
        } catch (error) {
          console.error("登出接口调用失败:", error);
        } finally {
          // 清除本地数据
          get().clearAuth();
          message.success("已退出登录");
        }
      },

      // 获取用户信息
      getUserInfo: async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
          throw new Error("No authentication token available");
        }

        const generation = authGeneration;
        if (permissionRequest?.generation === generation) {
          return permissionRequest.promise;
        }

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

            if (generation !== authGeneration) {
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
            if (generation === authGeneration) {
              clearPermissionCache();
              set({
                userInfo: null,
                isUserInfoInitialized: false,
                permissionStatus: "error",
              });
            }
            throw error;
          } finally {
            if (generation === authGeneration) {
              set({ isInitializing: false });
            }
          }
        })();

        permissionRequest = { generation, promise };
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
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
          get().clearAuth();
          return false;
        }
        const generation = authGeneration;

        try {
          await get().getUserInfo();
          if (
            generation !== authGeneration ||
            !localStorage.getItem(TOKEN_KEY)
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
      clearAuth: () => {
        invalidatePermissionRequest();
        console.log("[clearAuth] 被调用！调用栈:", new Error().stack);
        // 清除所有 localStorage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_INFO_KEY);
        localStorage.removeItem(VISIT_TENANT_ID_KEY);
        localStorage.removeItem(MENUS_CACHE_KEY);
        localStorage.removeItem(USER_CACHE_KEY);
        localStorage.removeItem("userId");
        localStorage.removeItem("app-storage");
        localStorage.removeItem("auth-storage"); // 清除 zustand persist 存储的 auth 状态

        // 清除 appStore 状态（包括 tabs）
        useAppStore.getState().reset();

        // 清除 authStore 状态
        set({
          userInfo: null,
          isAuthenticated: false,
          isUserInfoInitialized: false,
          isInitializing: false,
          permissionStatus: "idle",
        });

        // 强制触发 zustand 的持久化更新，确保状态被清除
        setTimeout(() => {
          // 通过发送 storage 事件触发 zustand persist 中间件同步
          window.dispatchEvent(new Event("storage"));
        }, 0);
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

/**
 * 快捷方法：获取 token
 * 直接从 localStorage 读取，不依赖 store
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * 快捷方法：获取刷新 token
 * 直接从 localStorage 读取，不依赖 store
 */
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * 快捷方法：清除认证信息
 */
export const clearAuth = () => {
  useAuthStore.getState().clearAuth();
};

export default useAuthStore;
