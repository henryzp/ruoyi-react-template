import type { MenuItem } from '@/router/utils';

export interface PermissionMenuDTO {
  id: number;
  parentId: number;
  type?: number;
  sort?: number;
  name: string;
  path: string | null;
  component: string | null;
  componentName?: string | null;
  icon?: string;
  permission?: string;
  visible?: boolean;
  keepAlive?: boolean;
  alwaysShow?: boolean;
  children?: PermissionMenuDTO[] | null;
}

export interface PermissionInfoDTO {
  user: {
    id: number;
    username: string;
    nickname?: string;
    avatar?: string;
    deptId?: number | null;
    email?: string;
  };
  roles: string[];
  permissions: string[];
  menus: PermissionMenuDTO[];
}

const menuType = (type: number | undefined, hasComponent: boolean) =>
  type === undefined ? (hasComponent ? 'C' : 'M') : ({ 1: 'M', 2: 'C', 3: 'F' })[type] || 'C';

export const mapPermissionMenu = (menu: PermissionMenuDTO): MenuItem => ({
  menuId: menu.id,
  menuName: menu.name,
  parentId: menu.parentId,
  orderNum: menu.sort ?? 0,
  path: menu.path || '',
  ...(menu.component ? { component: menu.component } : {}),
  menuType: menuType(menu.type, Boolean(menu.component)),
  visible: menu.visible === false ? '1' : '0',
  status: '0',
  ...(menu.permission ? { perms: menu.permission } : {}),
  ...(menu.icon ? { icon: menu.icon } : {}),
  isCache: menu.keepAlive ? '0' : '1',
  children: (menu.children || []).filter((child) => child.type !== 3).map(mapPermissionMenu),
});

export const mapPermissionInfo = (raw: PermissionInfoDTO) => ({
  userId: raw.user.id,
  username: raw.user.username,
  nickname: raw.user.nickname,
  avatar: raw.user.avatar,
  deptId: raw.user.deptId ?? undefined,
  email: raw.user.email,
  roles: raw.roles,
  permissions: raw.permissions,
  menus: (raw.menus || []).filter((menu) => menu.type !== 3).map(mapPermissionMenu),
});
