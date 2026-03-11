import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { TOKEN_KEY } from "@/types/auth";

/**
 * 路由守卫组件属性
 */
export interface GuardProps {
  /** 子组件 */
  children: ReactNode;
  /** 白名单路由（不需要认证的路由） */
  whiteList?: string[];
}

/**
 * 路由守卫组件
 * 用于控制路由访问权限
 */
export function Guard({
  children,
  whiteList = ["/login", "/404", "/403"],
}: GuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isAuthenticated,
    isUserInfoInitialized,
    isInitializing,
    initUserInfo,
  } = useAuthStore();

  // 初始化认证逻辑
  useEffect(() => {
    const currentPath = location.pathname;

    // 检查是否在白名单中
    const isInWhiteList = whiteList.some((path) => {
      if (path === currentPath) return true;
      if (path.endsWith("*") && currentPath.startsWith(path.slice(0, -1))) {
        return true;
      }
      return false;
    });

    // 如果在白名单中，不处理
    if (isInWhiteList) {
      return;
    }

    // 检查是否有 token（直接从 localStorage 读取）
    const token = localStorage.getItem(TOKEN_KEY);

    // 如果没有 token，跳转到登录页
    if (!token) {
      navigate("/login", { replace: true, state: { from: currentPath } });
      return;
    }

    // 如果有 token 但用户信息未初始化且未在初始化中，初始化用户信息
    if (!isUserInfoInitialized && !isInitializing) {
      let cancelled = false;
      const promise = initUserInfo();

      promise.then((success) => {
        if (cancelled) {
          return;
        }
        if (!success) {
          // 初始化失败（token 无效或接口返回 401），跳转登录页
          // 注意：如果是因为 401 且有 refresh_token，axios 拦截器会尝试刷新 token
          // 这里只有 refresh_token 不存在或刷新失败时才会执行
          navigate("/login", { replace: true });
        }
      });

      // cleanup 函数：组件卸载时标记为已取消
      return () => {
        cancelled = true;
      };
    }
  }, [navigate, location, isUserInfoInitialized, isInitializing]);

  // 渲染子组件
  return <>{children}</>;
}

export default Guard;
