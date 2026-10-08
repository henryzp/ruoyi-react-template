import { makeRequest } from "@/request";

// ==================== 枚举定义 ====================

/**
 * 用户状态枚举
 */
export enum UserStatusEnum {
  /** 正常 */
  ENABLE = 0,
  /** 停用 */
  DISABLE = 1,
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
  createTime?: number | string;
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
  deptId: number | null;
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
  loginDate?: number | string;
  /** 创建时间 */
  createTime?: number | string;
  avatar?: string;
  postIds?: number[];
  password?: string;
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
  /** 角色ID（query contract; no current page filter control） */
  roleId?: number;
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
const getDeptTreeRaw = makeRequest<DeptVO[]>({
  url: "/system/dept/list",
  method: "GET",
});

/**
 * 查询部门列表（平铺列表）
 */
const getDeptListRaw = makeRequest<DeptVO[]>({
  url: "/system/dept/list",
  method: "GET",
});

/**
 * 查询部门详情
 */
const getDeptRaw = makeRequest<DeptVO, { id: number }>({
  url: "/system/dept/get",
  method: "GET",
});

// ==================== 用户 API ====================

/**
 * 查询用户分页列表
 */
interface UserDTO extends Omit<UserVO, 'phone' | 'deptName' | 'loginDate' | 'createTime'> {
  deptName?: string | null;
  loginDate?: number | null;
  createTime?: number;
  mobile?: string;
  postIds?: number[];
  avatar?: string;
  loginIp?: string;
}

const userSnapshots = new Map<number, UserDTO>();
const toUserVO = (raw: UserDTO): UserVO => {
  if (raw.id !== undefined) userSnapshots.set(raw.id, { ...raw });
  return {
    id: raw.id,
    deptId: raw.deptId ?? null,
    username: raw.username,
    nickname: raw.nickname,
    email: raw.email,
    phone: raw.mobile,
    sex: raw.sex,
    status: raw.status,
    deptName: raw.deptName ?? undefined,
    loginDate: raw.loginDate,
    createTime: raw.createTime,
    remark: raw.remark,
    avatar: raw.avatar,
    postIds: raw.postIds,
  };
};
const toUserDTO = (input: UserVO, includePassword = false): UserDTO => {
  const previous = input.id === undefined ? undefined : userSnapshots.get(input.id);
  return {
    ...(input.id !== undefined ? { id: input.id } : {}),
    deptId: input.deptId ?? null,
    username: input.username,
    nickname: input.nickname,
    email: input.email,
    mobile: input.phone ?? previous?.mobile,
    remark: input.remark,
    avatar: input.avatar ?? previous?.avatar,
    postIds: input.postIds ?? previous?.postIds,
    ...(includePassword && input.password ? { password: input.password } : {}),
    sex: input.sex,
    status: input.status,
  };
};
const mapDept = (dept: DeptVO): DeptVO => ({
  ...dept,
  deptName: dept.name || dept.deptName,
  children: dept.children?.map(mapDept),
});
const mapResult = <Input, Output>(
  data: Input | null,
  err: Error | null,
  response: unknown,
  map: (value: Input) => Output,
): { data: Output | null; err: Error | null; response: unknown } => ({
  data: data === null ? null : map(data),
  err,
  response,
});

export const getDeptTree = async (config?: Parameters<typeof getDeptTreeRaw>[0]) => {
  const result = await getDeptTreeRaw(config);
  return mapResult(result.data, result.err, result.response, (items) => items.map(mapDept));
};
export const getDeptList = async (config?: Parameters<typeof getDeptListRaw>[0]) => {
  const result = await getDeptListRaw(config);
  return mapResult(result.data, result.err, result.response, (items) => items.map(mapDept));
};
export const getDept = async (config?: Parameters<typeof getDeptRaw>[0]) => {
  const result = await getDeptRaw(config);
  return mapResult(result.data, result.err, result.response, mapDept);
};

const getUserPageRaw = makeRequest<PageResult<UserDTO>, UserPageParam>({
  url: "/system/user/page",
  method: "GET",
});
const getUserQuery = (params?: UserPageParam) => params ? { ...params, mobile: params.phone, phone: undefined } : params;

/**
 * 查询用户详情
 */
const getUserRaw = makeRequest<UserDTO, { id: number }>({
  url: "/system/user/get",
  method: "GET",
});

/**
 * 新增用户
 */
const createUserRaw = makeRequest<void, UserDTO>({
  url: "/system/user/create",
  method: "POST",
});

/**
 * 修改用户
 */
const updateUserRaw = makeRequest<void, UserDTO>({
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
  url: "/system/user/update-password",
  method: "PUT",
});

/**
 * 导出用户
 */
const exportUserRaw = makeRequest<Blob, UserPageParam>({
  url: "/system/user/export-excel",
  method: "GET",
});

export const getUserPage = async (config?: Parameters<typeof getUserPageRaw>[0]) => {
  const result = await getUserPageRaw({
    ...config,
    params: getUserQuery(config?.params),
  });
  return mapResult(result.data, result.err, result.response, (page) => ({
    ...page,
    list: page.list.map(toUserVO),
  }));
};

export const exportUser = async (config?: Parameters<typeof exportUserRaw>[0]) =>
  exportUserRaw({ ...config, params: getUserQuery(config?.params) });

export const getUser = async (config?: Parameters<typeof getUserRaw>[0]) => {
  const result = await getUserRaw(config);
  return mapResult(result.data, result.err, result.response, toUserVO);
};

export const createUser = async (config?: Parameters<typeof createUserRaw>[0]) =>
  createUserRaw({ ...config, data: config?.data ? toUserDTO(config.data, true) : config?.data });

export const updateUser = async (config?: Parameters<typeof updateUserRaw>[0]) =>
  updateUserRaw({ ...config, data: config?.data ? toUserDTO(config.data) : config?.data });
