import { makeRequest } from "@/request";

// ==================== 枚举定义 ====================

/**
 * 用户状态枚举
 */
export enum UserStatusEnum {
  /** 停用 */
  DISABLE = 0,
  /** 正常 */
  ENABLE = 1,
}

/**
 * 用户性别枚举
 */
export enum UserSexEnum {
  /** 男 */
  MALE = 0,
  /** 女 */
  FEMALE = 1,
  /** 未知 */
  UNKNOWN = 2,
}

/**
 * 部门状态枚举
 */
export enum DeptStatusEnum {
  /** 停用 */
  DISABLE = 1,
  /** 正常 */
  ENABLE = 0,
}

// ==================== 类型定义 ====================

/**
 * 部门 VO
 */
export interface DeptVO {
  /** 部门ID */
  id?: number;
  /** 部门名称（后端字段：name） */
  name?: string;
  /** 部门名称（前端字段） */
  deptName?: string;
  /** 父部门ID */
  parentId: number;
  /** 显示顺序（后端字段：sort） */
  sort?: number;
  /** 显示顺序（前端字段） */
  orderNum?: number;
  /** 负责人用户ID */
  leaderUserId?: number | null;
  /** 负责人 */
  leader?: string;
  /** 联系电话 */
  phone?: string;
  /** 邮箱 */
  email?: string;
  /** 部门状态（0正常 1停用） */
  status: number;
  /** 删除标志（0存在 2删除） */
  delFlag?: string;
  /** 创建时间 */
  createTime?: string;
  /** 子部门 */
  children?: DeptVO[];
}

/**
 * 用户 VO
 */
export interface UserVO {
  /** 用户ID */
  id?: number;
  /** 部门ID */
  deptId: number;
  /** 用户账号 */
  username: string;
  /** 用户昵称 */
  nickname: string;
  /** 用户邮箱 */
  email?: string;
  /** 手机号码 */
  phone?: string;
  /** 用户性别（0男 1女 2未知） */
  sex?: number;
  /** 帐号状态（0正常 1停用） */
  status: number;
  /** 部门名称 */
  deptName?: string;
  /** 最后登录时间 */
  loginDate?: string;
  /** 创建时间 */
  createTime?: string;
  /** 备注 */
  remark?: string;
}

/**
 * 分页查询参数
 */
export interface UserPageParam {
  pageNo: number;
  pageSize: number;
  /** 用户账号 */
  username?: string;
  /** 手机号码 */
  phone?: string;
  /** 用户状态（0正常 1停用） */
  status?: number;
  /** 部门ID */
  deptId?: number;
  /** 时间范围 */
  createTime?: string[];
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

// ==================== 部门 API ====================

/**
 * 查询部门列表（平铺结构，前端构建树）
 */
export const getDeptTree = makeRequest<DeptVO[]>({
  url: "/system/dept/list",
  method: "GET",
});

/**
 * 将平铺的部门列表转换为树形结构
 * @param list 平铺的部门列表
 * @returns 树形结构的部门列表
 */
export function buildDeptTree(list: DeptVO[]): DeptVO[] {
  const map = new Map<number, DeptVO>();
  const tree: DeptVO[] = [];

  // 第一遍：创建映射，并标准化字段
  list.forEach((item) => {
    const normalized: DeptVO = {
      ...item,
      // 统一字段名
      deptName: item.deptName || item.name || "",
      orderNum: item.orderNum ?? item.sort ?? 0,
      children: [],
    };
    map.set(item.id!, normalized);
  });

  // 第二遍：构建树形结构
  map.forEach((item) => {
    const parent = map.get(item.parentId);
    if (parent) {
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(item);
    } else {
      // parentId 为 0 或找不到父节点的，作为根节点
      tree.push(item);
    }
  });

  // 按 orderNum 排序
  const sortByOrder = (nodes: DeptVO[]) => {
    nodes.sort((a, b) => (a.orderNum || 0) - (b.orderNum || 0));
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        sortByOrder(node.children);
      }
    });
  };

  sortByOrder(tree);

  return tree;
}

/**
 * 查询部门列表（平铺列表）
 */
export const getDeptList = makeRequest<DeptVO[]>({
  url: "/system/dept/list",
  method: "GET",
});

/**
 * 查询部门详情
 */
export const getDept = makeRequest<DeptVO, { id: number }>({
  url: "/system/dept/get",
  method: "GET",
});

// ==================== 用户 API ====================

/**
 * 查询用户分页列表
 */
export const getUserPage = makeRequest<PageResult<UserVO>, UserPageParam>({
  url: "/system/user/page",
  method: "GET",
});

/**
 * 查询用户详情
 */
export const getUser = makeRequest<UserVO, { id: number }>({
  url: "/system/user/get",
  method: "GET",
});

/**
 * 新增用户
 */
export const createUser = makeRequest<void, UserVO>({
  url: "/system/user/create",
  method: "POST",
});

/**
 * 修改用户
 */
export const updateUser = makeRequest<void, UserVO>({
  url: "/system/user/update",
  method: "PUT",
});

/**
 * 删除用户
 */
export const deleteUser = makeRequest<void, { id: number }>({
  url: "/system/user/delete",
  method: "DELETE",
});

/**
 * 批量删除用户
 */
export const deleteUserList = makeRequest<void, { ids: string }>({
  url: "/system/user/delete-list",
  method: "DELETE",
});

/**
 * 重置用户密码
 */
export const resetUserPassword = makeRequest<
  void,
  { id: number; password: string }
>({
  url: "/system/user/reset-password",
  method: "PUT",
});

/**
 * 导出用户
 */
export const exportUser = makeRequest<Blob, UserPageParam>({
  url: "/system/user/export-excel",
  method: "GET",
});
