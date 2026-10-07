import { makeRequest } from '@/request';
import type { DictType, DictTypeQuery, PageResult } from '../../types';
export const getDictTypePage = makeRequest<
  PageResult<DictType>,
  undefined,
  DictTypeQuery
>({ url: '/system/dict-type/page', method: 'GET' });
export const createDictType = makeRequest<void, DictType>({
  url: '/system/dict-type/create',
  method: 'POST',
});
export const updateDictType = makeRequest<void, DictType>({
  url: '/system/dict-type/update',
  method: 'PUT',
});
export const deleteDictType = makeRequest<void, undefined, { id: number }>({
  url: '/system/dict-type/delete',
  method: 'DELETE',
});
export const deleteDictTypeList = makeRequest<void, undefined, { ids: string }>(
  { url: '/system/dict-type/delete-list', method: 'DELETE' },
);
