import { makeRequest } from "@/request";

// ==================== 枚举定义 ====================

/**
 * 角色状态枚举
 */
export enum RoleStatusEnum {
  /** 停用 */
  DISABLE = 0,
  /** 正常 */
  ENABLE = 1,
}

/**
 * 数据范围枚举
 */
export enum DataScopeEnum {
  /** 全部数据权限 */
  ALL = 1,
  /** 自定义数据权限 */
  CUSTOM = 2,
  /** 本部门数据权限 */
  DEPT = 3,
  /** 本部门及以下数据权限 */
  DEPT_AND_CHILD = 4,
  /** 仅本人数据权限 */
  SELF = 5,
}

// ==================== 类型定义 ====================

/**
 * 角色 VO
 */
export interface RoleVO {
  /** 角色ID */
  id?: number;
  /** 角色编码 */
  code: string;
  /** 角色名称 */
  name: string;
  /** 显示顺序 */
  sort?: number;
  /** 状态（0正常 1停用） */
  status: number;
  /** 数据范围（1:全部,2:自定义,3:本部门,4:本部门及以下,5:仅本人） */
  dataScope?: number;
  /** 备注 */
  remark?: string;
  /** 创建时间 */
  createTime?: string;
}

/**
 * 分页查询参数
 */
export interface RolePageParam {
  pageNo: number;
  pageSize: number;
  /** 角色编码 */
  code?: string;
  /** 角色名称 */
  name?: string;
  /** 状态 */
  status?: number;
}

/**
 * 分页结果（后端返回格式）
 */
export interface PageResult<T> {
  list: T[];
  total: number;
}

/**
 * 分页结果（useTable 期望格式）
 */
export interface TablePageResult<T> {
  records: T[];
  size: number;
  current: number;
  total: number;
}

/**
 * 将后端分页结果转换为 useTable 期望格式
 */
export function toTablePageResult<T>(
  data: PageResult<T>,
  pageSize: number,
  pageNo: number,
): TablePageResult<T> {
  return {
    records: data.list,
    size: pageSize,
    current: pageNo,
    total: data.total,
  };
}

// ==================== 角色 API ====================

/**
 * 查询角色分页列表
 */
export const getRolePage = makeRequest<PageResult<RoleVO>, RolePageParam>({
  url: "/system/role/page",
  method: "GET",
});

/**
 * 查询角色详情
 */
export const getRole = makeRequest<RoleVO, { id: number }>({
  url: "/system/role/get",
  method: "GET",
});

/**
 * 新增角色
 */
export const createRole = makeRequest<void, RoleVO>({
  url: "/system/role/create",
  method: "POST",
});

/**
 * 修改角色
 */
export const updateRole = makeRequest<void, RoleVO>({
  url: "/system/role/update",
  method: "PUT",
});

/**
 * 删除角色
 */
export const deleteRole = makeRequest<void, { id: number }>({
  url: "/system/role/delete",
  method: "DELETE",
});

/**
 * 批量删除角色
 */
export const deleteRoleList = makeRequest<void, { ids: string }>({
  url: "/system/role/delete-list",
  method: "DELETE",
});

/**
 * 导出角色
 */
export const exportRole = makeRequest<Blob, RolePageParam>({
  url: "/system/role/export-excel",
  method: "GET",
});
