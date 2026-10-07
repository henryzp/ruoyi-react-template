import { makeRequest } from '@/request';
import type { DictData, DictDataQuery, PageResult } from '../../types';
export const getDictDataPage = makeRequest<
  PageResult<DictData>,
  undefined,
  DictDataQuery
>({ url: '/system/dict-data/page', method: 'GET' });
export const createDictData = makeRequest<void, DictData>({
  url: '/system/dict-data/create',
  method: 'POST',
});
export const updateDictData = makeRequest<void, DictData>({
  url: '/system/dict-data/update',
  method: 'PUT',
});
export const deleteDictData = makeRequest<void, undefined, { id: number }>({
  url: '/system/dict-data/delete',
  method: 'DELETE',
});
export const deleteDictDataList = makeRequest<void, undefined, { ids: string }>(
  { url: '/system/dict-data/delete-list', method: 'DELETE' },
);
