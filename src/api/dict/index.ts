import { makeRequest } from '@/request';

export interface SimpleDictItem {
  dictType: string;
  label: string;
  value: string | number;
  colorType?: string;
  cssClass?: string;
}

export const getSimpleDictDataList = makeRequest<SimpleDictItem[]>({
  url: '/system/dict-data/simple-list',
  method: 'GET',
});

export interface SkillDictItem {
  dictType: string;
  value: string;
  label: string;
}

/** 技能字典数据列表，标签文本用于可创建选项下拉 */
export const getSkillDictDataList = makeRequest<SkillDictItem[]>({
  url: '/system/dict-data/skill-list',
  method: 'GET',
  desc: '技能字典查询',
});

/** 新增技能标签，请求体为 text/plain 标签文本；全程静默，成败均不提示 */
export const createSkill = makeRequest<boolean, string>({
  url: '/system/dict-data/create-skill',
  method: 'POST',
  desc: '新增技能标签',
  notifyWhenSuccess: false,
  headers: { 'Content-Type': 'text/plain' },
});
