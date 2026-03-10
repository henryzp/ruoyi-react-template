import { makeRequest } from "@/request";

/**
 * 字典类型 VO
 */
export interface DictTypeVO {
  id?: number;
  name: string;
  type: string;
  status: number;
  remark?: string;
  createTime?: Date;
}

/**
 * 字典数据 VO
 */
export interface DictDataVO {
  id?: number;
  sort: number;
  label: string;
  value: string;
  dictType: string;
  status: number;
  colorType?: string;
  cssClass?: string;
  remark?: string;
  createTime?: Date;
}

/**
 * 分页查询参数
 */
export interface PageParam {
  pageNo: number;
  pageSize: number;
  name?: string;
  type?: string;
  status?: number;
  createTime?: string[];
}

/**
 * 字典数据分页查询参数
 */
export interface DictDataPageParam extends PageParam {
  dictType: string;
  label?: string;
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

// ==================== 字典类型 API ====================

/**
 * 查询字典（精简）列表
 */
export const getSimpleDictTypeList = makeRequest<DictTypeVO[]>({
  url: "/system/dict-type/simple-list",
  method: "GET",
});

/**
 * 查询字典类型列表
 */
export const getDictTypePage = makeRequest<PageResult<DictTypeVO>, PageParam>({
  url: "/system/dict-type/page",
  method: "GET",
});

/**
 * 查询字典类型详情
 */
export const getDictType = makeRequest<DictTypeVO, { id: number }>({
  url: "/system/dict-type/get",
  method: "GET",
});

/**
 * 新增字典类型
 */
export const createDictType = makeRequest<void, DictTypeVO>({
  url: "/system/dict-type/create",
  method: "POST",
});

/**
 * 修改字典类型
 */
export const updateDictType = makeRequest<void, DictTypeVO>({
  url: "/system/dict-type/update",
  method: "PUT",
});

/**
 * 删除字典类型
 */
export const deleteDictType = makeRequest<void, { id: number }>({
  url: "/system/dict-type/delete",
  method: "DELETE",
});

/**
 * 批量删除字典类型
 */
export const deleteDictTypeList = makeRequest<void, { ids: string }>({
  url: "/system/dict-type/delete-list",
  method: "DELETE",
});

/**
 * 导出字典类型
 */
export const exportDictType = makeRequest<Blob, PageParam>({
  url: "/system/dict-type/export-excel",
  method: "GET",
});

// ==================== 字典数据 API ====================

/**
 * 查询字典数据（精简）列表
 */
export const getSimpleDictDataList = makeRequest<DictDataVO[]>({
  url: "/system/dict-data/simple-list",
  method: "GET",
});

/**
 * 查询字典数据列表
 */
export const getDictDataPage = makeRequest<
  { list: DictDataVO[]; total: number },
  DictDataPageParam
>({
  url: "/system/dict-data/page",
  method: "GET",
});

/**
 * 查询字典数据详情
 */
export const getDictData = makeRequest<DictDataVO, { id: number }>({
  url: "/system/dict-data/get",
  method: "GET",
});

/**
 * 根据字典类型查询字典数据
 */
export const getDictDataByType = makeRequest<DictDataVO[], { type: string }>({
  url: "/system/dict-data/type",
  method: "GET",
});

/**
 * 新增字典数据
 */
export const createDictData = makeRequest<void, DictDataVO>({
  url: "/system/dict-data/create",
  method: "POST",
});

/**
 * 修改字典数据
 */
export const updateDictData = makeRequest<void, DictDataVO>({
  url: "/system/dict-data/update",
  method: "PUT",
});

/**
 * 删除字典数据
 */
export const deleteDictData = makeRequest<void, { id: number }>({
  url: "/system/dict-data/delete",
  method: "DELETE",
});

/**
 * 批量删除字典数据
 */
export const deleteDictDataList = makeRequest<void, { ids: string }>({
  url: "/system/dict-data/delete-list",
  method: "DELETE",
});

/**
 * 导出字典数据
 */
export const exportDictData = makeRequest<Blob, DictDataPageParam>({
  url: "/system/dict-data/export-excel",
  method: "GET",
});
