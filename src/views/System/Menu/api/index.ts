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
export enum VisibleEnum {
  /** 显示 */
  SHOW = true,
  /** 隐藏 */
  HIDE = false,
}

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
  createTime?: string;
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
export const getMenuList = makeRequest<MenuVO[]>({
  url: "/system/menu/list",
  method: "GET",
});

/**
 * 查询菜单详情
 */
export const getMenu = makeRequest<MenuVO, { id: number }>({
  url: "/system/menu/get",
  method: "GET",
});

/**
 * 新增菜单
 */
export const createMenu = makeRequest<void, MenuVO>({
  url: "/system/menu/create",
  method: "POST",
});

/**
 * 修改菜单
 */
export const updateMenu = makeRequest<void, MenuVO>({
  url: "/system/menu/update",
  method: "PUT",
});

/**
 * 删除菜单
 */
export const deleteMenu = makeRequest<void, { id: number }>({
  url: "/system/menu/delete",
  method: "DELETE",
});
