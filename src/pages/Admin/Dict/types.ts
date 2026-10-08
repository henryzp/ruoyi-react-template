export type DictStatus = 0 | 1;
export interface PageResult<T> {
  list: T[];
  total: number;
}
export interface DictType {
  id?: number;
  name: string;
  type: string;
  status: DictStatus;
  remark?: string;
  createTime?: number | string;
}
export interface DictData {
  id?: number;
  dictType: string;
  label: string;
  value: string;
  sort: number;
  status: DictStatus;
  colorType?: string;
  cssClass?: string;
  remark?: string;
  createTime?: number | string;
}
export interface DictTypeQuery {
  pageNo: number;
  pageSize: number;
  name?: string;
  type?: string;
  status?: DictStatus;
}
export interface DictDataQuery {
  pageNo: number;
  pageSize: number;
  dictType: string;
  label?: string;
  status?: DictStatus;
}
export type DictTypeSearchValues = Pick<
  DictTypeQuery,
  'name' | 'type' | 'status'
>;
export type DictDataSearchValues = Pick<DictDataQuery, 'label' | 'status'>;
export type DictTypeFormValues = Omit<DictType, 'id' | 'createTime'>;
export type DictDataFormValues = Omit<
  DictData,
  'id' | 'createTime' | 'dictType'
>;
