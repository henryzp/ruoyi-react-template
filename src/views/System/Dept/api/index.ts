import { makeRequest } from "@/request";

// ==================== 枚举定义 ====================

/**
 * 部门状态枚举
 */
export enum DeptStatusEnum {
  /** 正常 */
  ENABLE = 0,
  /** 停用 */
  DISABLE = 1,
}

// ==================== 类型定义 ====================

/**
 * 部门 VO
 */
export interface DeptVO {
  /** 部门ID */
  id?: number;
  /** 部门名称 */
  name: string;
  /** 父部门ID */
  parentId: number;
  /** 显示顺序 */
  sort?: number;
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

// ==================== 部门 API ====================

/**
 * 查询部门列表（平铺结构，前端构建树）
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

/**
 * 新增部门
 */
export const createDept = makeRequest<void, DeptVO>({
  url: "/system/dept/create",
  method: "POST",
});

/**
 * 修改部门
 */
export const updateDept = makeRequest<void, DeptVO>({
  url: "/system/dept/update",
  method: "PUT",
});

/**
 * 删除部门
 */
export const deleteDept = makeRequest<void, { id: number }>({
  url: "/system/dept/delete",
  method: "DELETE",
});

/**
 * 批量删除部门
 */
export const deleteDeptList = makeRequest<void, { ids: string }>({
  url: "/system/dept/delete-list",
  method: "DELETE",
});
