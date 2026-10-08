import { makeRequest } from "@/request";

// ==================== 枚举定义 ====================

/**
 * 菜单类型枚举
 */
export enum MenuTypeEnum {
  /** 目录 */
  DIR = "dir",
  /** 菜单 */
  MENU = "menu",
  /** 按钮 */
  BUTTON = "button",
}

/**
 * 显示状态枚举
 */
export const VisibleEnum = {
  /** 显示 */
  SHOW: true,
  /** 隐藏 */
  HIDE: false,
} as const;
export type VisibleEnum = (typeof VisibleEnum)[keyof typeof VisibleEnum];

/**
 * 是否缓存枚举
 */
export enum KeepAliveEnum {
  /** 缓存 */
  YES = 1,
  /** 不缓存 */
  NO = 0,
}

// ==================== 类型定义 ====================

/**
 * 菜单 VO
 */
export interface MenuVO {
  /** 菜单ID */
  id?: number;
  /** 菜单名称 */
  name: string;
  /** 父菜单ID */
  parentId: number;
  /** 显示顺序 */
  sort?: number;
  /** 菜单类型（dir目录 menu菜单 button按钮） */
  type: string;
  /** 路由地址 */
  path?: string;
  /** 组件路径 */
  component?: string;
  /** 路由参数 */
  query?: string;
  /** 是否为外链（0是 1否） */
  isFrame?: number;
  /** 是否缓存（0缓存 1不缓存） */
  keepAlive?: number;
  /** 菜单状态（0显示 1隐藏） */
  visible?: boolean;
  /** 菜单状态（0正常 1停用） */
  status: string;
  /** 权限标识 */
  permission?: string;
  /** 菜单图标 */
  icon?: string;
  /** 备注 */
  remark?: string;
  /** 创建时间 */
  createTime?: number | string;
  componentName?: string | null;
  alwaysShow?: boolean;
  /** 子菜单 */
  children?: MenuVO[];
}

/**
 * 简单的菜单选项（用于下拉选择）
 */
export interface MenuOption {
  id?: number;
  name: string;
  parentId: number;
}

// ==================== 菜单 API ====================

/**
 * 查询菜单列表（平铺结构，前端构建树）
 */
interface MenuDTO extends Omit<MenuVO, 'type' | 'status' | 'keepAlive' | 'isFrame' | 'visible' | 'children'> {
  type: number;
  status: number;
  visible: boolean;
  keepAlive: boolean;
  path?: string | null;
  component?: string | null;
  alwaysShow?: boolean;
  componentName?: string | null;
  children?: MenuDTO[] | null;
}

const menuSnapshots = new Map<number, MenuDTO>();
const menuTypeFromDTO = (type: number) => ({ 1: MenuTypeEnum.DIR, 2: MenuTypeEnum.MENU, 3: MenuTypeEnum.BUTTON })[type] || MenuTypeEnum.MENU;
const menuTypeToDTO = (type: string) => ({ [MenuTypeEnum.DIR]: 1, [MenuTypeEnum.MENU]: 2, [MenuTypeEnum.BUTTON]: 3 })[type] || 2;
export const fromMenuDTO = (raw: MenuDTO): MenuVO => {
  if (raw.id !== undefined) menuSnapshots.set(raw.id, { ...raw });
  return {
    ...raw,
    type: menuTypeFromDTO(raw.type),
    status: String(raw.status),
    keepAlive: raw.keepAlive ? KeepAliveEnum.YES : KeepAliveEnum.NO,
    visible: raw.visible,
    path: raw.path || '',
    component: raw.component || '',
    isFrame: /^https?:\/\//i.test(raw.path || '') ? 1 : 0,
    children: raw.children?.map(fromMenuDTO),
  };
};
export const toMenuDTO = (input: MenuVO): MenuDTO => {
  const previous = input.id === undefined ? undefined : menuSnapshots.get(input.id);
  const { type, status, keepAlive, visible } = input;
  const fields: Partial<MenuDTO> = {
    ...(previous || {}),
    ...(input.id !== undefined ? { id: input.id } : {}),
    name: input.name,
    parentId: input.parentId,
    sort: input.sort,
    path: input.path,
    component: input.component || '',
    icon: input.icon,
    permission: input.permission,
    remark: input.remark,
    type: menuTypeToDTO(type),
    status: Number(status),
    visible: visible ?? true,
    keepAlive: keepAlive === KeepAliveEnum.YES,
  };
  delete fields.createTime;
  delete fields.children;
  return fields as MenuDTO;
};
const getMenuListRaw = makeRequest<MenuDTO[]>({
  url: "/system/menu/list",
  method: "GET",
});

/**
 * 查询菜单详情
 */
const getMenuRaw = makeRequest<MenuDTO, { id: number }>({
  url: "/system/menu/get",
  method: "GET",
});

/**
 * 新增菜单
 */
const createMenuRaw = makeRequest<void, MenuDTO>({
  url: "/system/menu/create",
  method: "POST",
});

/**
 * 修改菜单
 */
const updateMenuRaw = makeRequest<void, MenuDTO>({
  url: "/system/menu/update",
  method: "PUT",
});

export const getMenuList = async (config?: Parameters<typeof getMenuListRaw>[0]) => {
  const result = await getMenuListRaw(config);
  return { ...result, data: result.data?.map(fromMenuDTO) ?? null };
};
export const getMenu = async (config?: Parameters<typeof getMenuRaw>[0]) => {
  const result = await getMenuRaw(config);
  return { ...result, data: result.data ? fromMenuDTO(result.data) : null };
};
export const createMenu = async (config?: Parameters<typeof createMenuRaw>[0]) =>
  createMenuRaw({ ...config, data: config?.data ? toMenuDTO(config.data) : config?.data });
export const updateMenu = async (config?: Parameters<typeof updateMenuRaw>[0]) =>
  updateMenuRaw({ ...config, data: config?.data ? toMenuDTO(config.data) : config?.data });

/**
 * 删除菜单
 */
export const deleteMenu = makeRequest<void, { id: number }>({
  url: "/system/menu/delete",
  method: "DELETE",
});
