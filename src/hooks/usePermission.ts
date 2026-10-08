import { useAuthStore } from "@/store/authStore";
import { checkPermission, type PermissionRule } from "@/utils";

export const usePermission = (rule: PermissionRule) => {
  const { userInfo, permissionStatus, initUserInfo } = useAuthStore();
  const permissions = userInfo?.permissions ?? [];
  const roles = userInfo?.roles ?? [];

  return {
    allowed:
      permissionStatus === "ready" &&
      checkPermission(permissions, rule, { roles }),
    pending: permissionStatus === "idle" || permissionStatus === "loading",
    error: permissionStatus === "error",
    reload: initUserInfo,
  };
};

/** 是否已登录 */
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);

/** 是否拥有指定权限（空数组表示不限制） */
export const useHasPermission = (permission: string | string[]) => {
  const { userInfo } = useAuthStore();
  return checkPermission(userInfo?.permissions ?? [], permission, {
    roles: userInfo?.roles ?? [],
  });
};

/** 是否拥有指定角色（空数组表示不限制） */
export const useHasRole = (role: string | string[]) => {
  const { userInfo } = useAuthStore();
  return checkPermission(
    userInfo?.permissions ?? [],
    { role },
    {
      roles: userInfo?.roles ?? [],
    },
  );
};
