import { Button, Result, Spin } from "antd";
import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { TOKEN_KEY } from "@/types/auth";

const DEFAULT_WHITE_LIST = ["/login", "/404", "/403"];

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
  whiteList = DEFAULT_WHITE_LIST,
}: GuardProps) {
  const location = useLocation();
  const { permissionStatus, isInitializing, initUserInfo } = useAuthStore();

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

    const token = localStorage.getItem(TOKEN_KEY);
    if (!isInWhiteList && token && permissionStatus === "idle") {
      initUserInfo();
    }
  }, [
    initUserInfo,
    isInitializing,
    location.pathname,
    permissionStatus,
    whiteList,
  ]);

  const isInWhiteList = whiteList.some((path) => {
    if (path === location.pathname) return true;
    return (
      path.endsWith("*") && location.pathname.startsWith(path.slice(0, -1))
    );
  });

  if (isInWhiteList) return <>{children}</>;

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (permissionStatus === "error") {
    return (
      <Result
        extra={
          <Button loading={isInitializing} onClick={async () => initUserInfo()}>
            重新加载权限
          </Button>
        }
        status="error"
        subTitle="账号已登录，但权限信息暂时无法加载。请检查网络后重试。"
        title="权限信息加载失败"
      />
    );
  }

  if (permissionStatus !== "ready") return <Spin fullscreen />;

  return <>{children}</>;
}

export default Guard;
