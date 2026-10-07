export type PermissionRule =
  | string
  | string[]
  | { permission?: string | string[]; role?: string | string[] };

export function checkPermission(
  permissions: string[],
  rule: PermissionRule,
  options: { roles: string[] } = { roles: [] },
): boolean {
  if (options.roles.includes("admin")) return true;
  if (typeof rule === "string") return permissions.includes(rule);
  if (Array.isArray(rule))
    return rule.length === 0 || rule.some((item) => permissions.includes(item));
  const permission = rule.permission;
  const role = rule.role;
  const permissionAllowed = !permission || checkPermission(permissions, permission, options);
  const roleAllowed =
    !role ||
    (Array.isArray(role)
      ? role.length === 0 || role.some((item) => options.roles.includes(item))
      : options.roles.includes(role));
  return permissionAllowed && roleAllowed;
}
