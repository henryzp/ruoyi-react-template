import { makeRequest } from "@/request";

// ==================== 枚举定义 ====================

/**
 * 岗位状态枚举
 */
export enum PostStatusEnum {
  /** 停用 */
  DISABLE = 0,
  /** 正常 */
  ENABLE = 1,
}

// ==================== 类型定义 ====================

/**
 * 岗位 VO
 */
export interface PostVO {
  /** 岗位ID */
  id?: number;
  /** 岗位编码 */
  code: string;
  /** 岗位名称 */
  name: string;
  /** 显示顺序 */
  sort?: number;
  /** 状态（0正常 1停用） */
  status: number;
  /** 备注 */
  remark?: string;
  /** 创建时间 */
  createTime?: string;
}

/**
 * 分页查询参数
 */
export interface PostPageParam {
  pageNo: number;
  pageSize: number;
  /** 岗位编码 */
  code?: string;
  /** 岗位名称 */
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

// ==================== 岗位 API ====================

/**
 * 查询岗位分页列表
 */
export const getPostPage = makeRequest<PageResult<PostVO>, PostPageParam>({
  url: "/system/post/page",
  method: "GET",
});

/**
 * 查询岗位详情
 */
export const getPost = makeRequest<PostVO, { id: number }>({
  url: "/system/post/get",
  method: "GET",
});

/**
 * 新增岗位
 */
export const createPost = makeRequest<void, PostVO>({
  url: "/system/post/create",
  method: "POST",
});

/**
 * 修改岗位
 */
export const updatePost = makeRequest<void, PostVO>({
  url: "/system/post/update",
  method: "PUT",
});

/**
 * 删除岗位
 */
export const deletePost = makeRequest<void, { id: number }>({
  url: "/system/post/delete",
  method: "DELETE",
});

/**
 * 批量删除岗位
 */
export const deletePostList = makeRequest<void, { ids: string }>({
  url: "/system/post/delete-list",
  method: "DELETE",
});

/**
 * 导出岗位
 */
export const exportPost = makeRequest<Blob, PostPageParam>({
  url: "/system/post/export-excel",
  method: "GET",
});
