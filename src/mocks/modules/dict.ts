import type {
  DictData,
  DictDataQuery,
  DictType,
  DictTypeQuery,
} from '@/pages/Admin/Dict/types';
import type { MockHandler, MockRequestConfig } from '../types';
import { failure, success } from '../utils';
import { DICT_TYPE } from '@/utils/dict';

const now = '2026-08-24 12:00:00';
const currentTime = () =>
  new Date().toISOString().slice(0, 19).replace('T', ' ');

const dictTypes: DictType[] = [
  {
    id: 3010,
    name: '资质资格类型',
    type: 'hrm_qualification_type',
    status: 0,
    remark: '部门资质资格类型',
    createTime: now,
  },
  ...([
    [3011, '性别', DICT_TYPE.HRM_SEX_TYPE],
    [3012, '民族', DICT_TYPE.HRM_MZ_TYPE],
    [3013, '政治面貌', DICT_TYPE.HRM_ZZMM_TYPE],
    [3014, '学历', DICT_TYPE.HRM_XL_TYPE],
    [3015, '学历性质', DICT_TYPE.HRM_XLXZ_TYPE],
    [3016, '户籍性质', DICT_TYPE.HRM_HJXZ_TYPE],
    [3017, '婚姻情况', DICT_TYPE.HRM_HYZK_STATUS],
    [3018, '血型', DICT_TYPE.HRM_XX_TYPE],
    [3019, '驾照', DICT_TYPE.HRM_JZ_TYPE],
    [3020, '亲属关系', DICT_TYPE.HRM_QSGX_TYPE],
    [3021, '职等', DICT_TYPE.HRM_BAND_TYPE],
    [3022, '岗位级别', DICT_TYPE.HRM_POSITION_LEVEL_TYPE],
    [3023, '职级', DICT_TYPE.HRM_RANK_TYPE],
    [3024, '所属序列', DICT_TYPE.HRM_SEQUENCE_TYPE],
    [3025, '资格等级', DICT_TYPE.HRM_QUALIFICATION_LEVEL_TYPE],
    [3026, '岗位类型', DICT_TYPE.HRM_POST_TYPE],
  ].map(([id, name, type]) => ({
    id,
    name,
    type,
    status: 0,
    remark: '人才详情字典',
    createTime: now,
  })) as DictType[]),
  {
    id: 3027,
    name: '招聘渠道',
    type: DICT_TYPE.HRM_RECRUIT_CHANNEL,
    status: 0,
    remark: '招聘渠道管理',
    createTime: now,
  },
  {
    id: 1,
    name: '用户性别',
    type: 'system_user_sex',
    status: 0,
    remark: '系统用户性别',
    createTime: '2021-01-05 17:03:48',
  },
  {
    id: 3001,
    name: '演示项目状态',
    type: 'demo_project_status',
    status: 0,
    remark: '项目状态演示数据',
    createTime: now,
  },
  {
    id: 3002,
    name: '演示任务优先级',
    type: 'demo_task_priority',
    status: 0,
    remark: '任务优先级演示数据',
    createTime: now,
  },
  {
    id: 3003,
    name: '演示审批状态',
    type: 'demo_approval_status',
    status: 0,
    remark: '审批状态演示数据',
    createTime: now,
  },
];

const createHrmDictData = (
  dictType: string,
  options: Array<[string, string]>,
  firstId: number,
) =>
  options.map(([label, value], index) => ({
    id: firstId + index,
    dictType,
    label,
    value,
    sort: index + 1,
    status: 0,
    colorType: 'default',
    remark: '人才详情字典',
    createTime: now,
  })) as DictData[];

const dictData: DictData[] = [
  ...([
    ['建筑资质', 'construction'],
    ['技术资质', 'technology'],
    ['经营资质', 'business'],
  ].map(([label, value], index) => ({
    id: 3701 + index,
    dictType: 'hrm_qualification_type',
    label,
    value,
    sort: index + 1,
    status: 0,
    colorType: 'primary',
    remark: '部门资质资格类型',
    createTime: now,
  })) as DictData[]),
  // 岗位类型（编制属性）：value 与后端 postType 存储约定一致，使用英文编码
  ...([
    ['全职', 'full_time'],
    ['兼职', 'part_time'],
    ['实习', 'intern'],
  ].map(([label, value], index) => ({
    id: 3711 + index,
    dictType: DICT_TYPE.HRM_POST_TYPE,
    label,
    value,
    sort: index + 1,
    status: 0,
    colorType: 'primary',
    remark: '定编定岗岗位类型（编制属性）',
    createTime: now,
  })) as DictData[]),
  // 招聘渠道：value 从 1 依次编号，网站地址存于 remark
  ...([
    ['BOSS直聘', '1', 'https://www.zhipin.com'],
    ['智联招聘', '2', 'https://www.zhaopin.com'],
    ['猎聘网', '3', 'https://www.liepin.com'],
    ['中华英才网', '4', 'https://www.chinahr.com'],
    ['拉勾网', '5', 'https://www.lagou.com'],
  ].map(([label, value, remark], index) => ({
    id: 3801 + index,
    dictType: DICT_TYPE.HRM_RECRUIT_CHANNEL,
    label,
    value,
    sort: index + 1,
    status: 0,
    colorType: 'primary',
    remark,
    createTime: now,
  })) as DictData[]),
  ...([
    ['全部数据权限', '1'],
    ['指定部门数据权限', '2'],
    ['部门数据权限', '3'],
    ['部门及以下数据权限', '4'],
    ['仅本人数据权限', '5'],
  ].map(([label, value], index) => ({
    id: 3601 + index,
    dictType: DICT_TYPE.SYSTEM_DATA_SCOPE,
    label,
    value,
    sort: index + 1,
    status: 0,
    colorType: 'default',
    remark: '数据权限范围',
    createTime: now,
  })) as DictData[]),
  ...([
    ['内置', '1'],
    ['自定义', '2'],
  ].map(([label, value], index) => ({
    id: 3651 + index,
    dictType: DICT_TYPE.SYSTEM_ROLE_TYPE,
    label,
    value,
    sort: index + 1,
    status: 0,
    colorType: index === 0 ? 'danger' : 'primary',
    remark: '角色类型',
    createTime: now,
  })) as DictData[]),
  {
    id: 3501,
    dictType: 'user_type',
    label: '系统用户',
    value: '1',
    sort: 1,
    status: 0,
    colorType: 'primary',
    remark: '用户类型',
    createTime: now,
  },
  {
    id: 3502,
    dictType: 'user_type',
    label: '普通用户',
    value: '2',
    sort: 2,
    status: 0,
    colorType: 'default',
    remark: '用户类型',
    createTime: now,
  },
  {
    id: 3503,
    dictType: 'infra_operate_type',
    label: '查询',
    value: '1',
    sort: 1,
    status: 0,
    colorType: 'primary',
    remark: '操作类型',
    createTime: now,
  },
  {
    id: 3504,
    dictType: 'infra_operate_type',
    label: '修改',
    value: '2',
    sort: 2,
    status: 0,
    colorType: 'warning',
    remark: '操作类型',
    createTime: now,
  },
  {
    id: 3505,
    dictType: 'infra_api_error_log_process_status',
    label: '未处理',
    value: '0',
    sort: 1,
    status: 0,
    colorType: 'warning',
    remark: '错误日志处理状态',
    createTime: now,
  },
  {
    id: 3506,
    dictType: 'infra_api_error_log_process_status',
    label: '已处理',
    value: '1',
    sort: 2,
    status: 0,
    colorType: 'success',
    remark: '错误日志处理状态',
    createTime: now,
  },
  {
    id: 3507,
    dictType: 'infra_api_error_log_process_status',
    label: '已忽略',
    value: '2',
    sort: 3,
    status: 0,
    colorType: 'info',
    remark: '错误日志处理状态',
    createTime: now,
  },
  {
    id: 3401,
    dictType: 'system_login_type',
    label: '账号登录',
    value: '0',
    sort: 1,
    status: 0,
    colorType: 'primary',
    remark: '登录方式',
    createTime: now,
  },
  {
    id: 3402,
    dictType: 'system_login_type',
    label: '手机号登录',
    value: '1',
    sort: 2,
    status: 0,
    colorType: 'success',
    remark: '登录方式',
    createTime: now,
  },
  {
    id: 3403,
    dictType: 'system_login_type',
    label: '社交登录',
    value: '2',
    sort: 3,
    status: 0,
    colorType: 'info',
    remark: '登录方式',
    createTime: now,
  },
  {
    id: 3411,
    dictType: 'system_login_result',
    label: '登录成功',
    value: '0',
    sort: 1,
    status: 0,
    colorType: 'success',
    remark: '登录结果',
    createTime: now,
  },
  {
    id: 3412,
    dictType: 'system_login_result',
    label: '登录失败',
    value: '1',
    sort: 2,
    status: 0,
    colorType: 'danger',
    remark: '登录结果',
    createTime: now,
  },
  {
    id: 1,
    dictType: 'system_user_sex',
    label: '男',
    value: '1',
    sort: 1,
    status: 0,
    colorType: 'default',
    cssClass: 'A',
    remark: '性别男',
    createTime: '2021-01-05 17:04:02',
  },
  {
    id: 2,
    dictType: 'system_user_sex',
    label: '女',
    value: '2',
    sort: 2,
    status: 0,
    colorType: 'success',
    remark: '性别女',
    createTime: '2021-01-05 17:04:02',
  },
  {
    id: 3101,
    dictType: 'demo_project_status',
    label: '未开始',
    value: '1',
    sort: 1,
    status: 0,
    colorType: 'default',
    remark: '演示数据',
    createTime: now,
  },
  {
    id: 3102,
    dictType: 'demo_project_status',
    label: '进行中',
    value: '2',
    sort: 2,
    status: 0,
    colorType: 'primary',
    remark: '演示数据',
    createTime: now,
  },
  {
    id: 3103,
    dictType: 'demo_project_status',
    label: '已暂停',
    value: '3',
    sort: 3,
    status: 0,
    colorType: 'warning',
    remark: '演示数据',
    createTime: now,
  },
  {
    id: 3104,
    dictType: 'demo_project_status',
    label: '已完成',
    value: '4',
    sort: 4,
    status: 0,
    colorType: 'success',
    remark: '演示数据',
    createTime: now,
  },
  {
    id: 3201,
    dictType: 'demo_task_priority',
    label: '低',
    value: '1',
    sort: 1,
    status: 0,
    colorType: 'default',
    remark: '演示数据',
    createTime: now,
  },
  {
    id: 3202,
    dictType: 'demo_task_priority',
    label: '中',
    value: '2',
    sort: 2,
    status: 0,
    colorType: 'info',
    remark: '演示数据',
    createTime: now,
  },
  {
    id: 3203,
    dictType: 'demo_task_priority',
    label: '高',
    value: '3',
    sort: 3,
    status: 0,
    colorType: 'warning',
    remark: '演示数据',
    createTime: now,
  },
  {
    id: 3204,
    dictType: 'demo_task_priority',
    label: '紧急',
    value: '4',
    sort: 4,
    status: 0,
    colorType: 'danger',
    remark: '演示数据',
    createTime: now,
  },
  {
    id: 3301,
    dictType: 'demo_approval_status',
    label: '待审批',
    value: '0',
    sort: 1,
    status: 0,
    colorType: 'warning',
    remark: '演示数据',
    createTime: now,
  },
  {
    id: 3302,
    dictType: 'demo_approval_status',
    label: '已通过',
    value: '1',
    sort: 2,
    status: 0,
    colorType: 'success',
    remark: '演示数据',
    createTime: now,
  },
  {
    id: 3303,
    dictType: 'demo_approval_status',
    label: '已驳回',
    value: '2',
    sort: 3,
    status: 0,
    colorType: 'danger',
    remark: '演示数据',
    createTime: now,
  },
  ...([
    ['一级', '1'],
    ['二级', '2'],
    ['其他', '0'],
  ].map(([label, value], index) => ({
    id: 3701 + index,
    dictType: DICT_TYPE.HRM_TALENT_LEVEL,
    label,
    value,
    sort: index + 1,
    status: 0,
    colorType: 'default',
    remark: '人才等级',
    createTime: now,
  })) as DictData[]),
  ...createHrmDictData(
    DICT_TYPE.HRM_SEX_TYPE,
    [
      ['男', '1'],
      ['女', '2'],
    ],
    3801,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_MZ_TYPE,
    [
      ['汉族', '1'],
      ['少数民族', '2'],
    ],
    3811,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_ZZMM_TYPE,
    [
      ['群众', '1'],
      ['中共党员', '2'],
    ],
    3821,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_XL_TYPE,
    [
      ['高中', '1'],
      ['大专', '2'],
      ['本科', '3'],
      ['硕士', '4'],
      ['博士', '5'],
    ],
    3831,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_XLXZ_TYPE,
    [
      ['全日制', '1'],
      ['非全日制', '2'],
    ],
    3841,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_HJXZ_TYPE,
    [
      ['本市城镇', '1'],
      ['外埠城镇', '2'],
    ],
    3851,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_HYZK_STATUS,
    [
      ['未婚', '1'],
      ['已婚', '2'],
    ],
    3861,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_XX_TYPE,
    [
      ['A型', '1'],
      ['B型', '2'],
      ['AB型', '3'],
      ['O型', '4'],
    ],
    3871,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_JZ_TYPE,
    [
      ['无', '0'],
      ['C1', '1'],
      ['C2', '2'],
    ],
    3881,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_QSGX_TYPE,
    [
      ['父亲', '1'],
      ['母亲', '2'],
      ['配偶', '3'],
      ['子女', '4'],
    ],
    3891,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_BAND_TYPE,
    Array.from(
      { length: 24 },
      (_, index) =>
        [`BAND${index + 1}`, `BAND${index + 1}`] as [string, string],
    ),
    3901,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_POSITION_LEVEL_TYPE,
    [
      ['高层管理岗', '高层管理岗'],
      ['中层管理岗', '中层管理岗'],
      ['基层管理岗', '基层管理岗'],
      ['首席技术岗', '首席技术岗'],
      ['高级技术岗', '高级技术岗'],
      ['中级技术岗', '中级技术岗'],
      ['初级技术岗', '初级技术岗'],
      ['助理技术岗', '助理技术岗'],
      ['资深专业岗', '资深专业岗'],
      ['高级专业岗', '高级专业岗'],
      ['中级专业岗', '中级专业岗'],
      ['初级专业岗', '初级专业岗'],
      ['助理专业岗', '助理专业岗'],
    ],
    3931,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_RANK_TYPE,
    [
      ['M4', 'M4'],
      ['M3', 'M3'],
      ['M2', 'M2'],
      ['M1', 'M1'],
      ['P5', 'P5'],
      ['P4', 'P4'],
      ['P3', 'P3'],
      ['P2', 'P2'],
      ['P1', 'P1'],
      ['T5', 'T5'],
      ['T4', 'T4'],
      ['T3', 'T3'],
      ['T2', 'T2'],
      ['T1', 'T1'],
      ['O2', 'O2'],
      ['O1', 'O1'],
      ['S2', 'S2'],
      ['S1', 'S1'],
    ],
    3951,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_SEQUENCE_TYPE,
    [
      ['管理序列', 'M'],
      ['专业序列', 'P'],
      ['技术序列', 'T'],
      ['操作序列', 'O'],
      ['技能序列', 'S'],
    ],
    3971,
  ),
  ...createHrmDictData(
    DICT_TYPE.HRM_QUALIFICATION_LEVEL_TYPE,
    [
      ['Q1', 'Q1'],
      ['Q2', 'Q2'],
      ['Q3', 'Q3'],
    ],
    3981,
  ),
];

let nextTypeId = Math.max(...dictTypes.map((item) => item.id || 0)) + 1;
let nextDataId = Math.max(...dictData.map((item) => item.id || 0)) + 1;

const paramsOf = (requestConfig: MockRequestConfig) =>
  (requestConfig?.params || {}) as Record<string, unknown>;

const bodyOf = <T>(requestConfig: MockRequestConfig) =>
  (requestConfig?.data || {}) as T;

const numberOf = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const statusOf = (value: unknown) => {
  const status = numberOf(value);
  return status === 0 || status === 1 ? status : undefined;
};

const page = <T>(items: T[], requestConfig: MockRequestConfig) => {
  const params = paramsOf(requestConfig);
  const pageNo = Math.max(1, numberOf(params.pageNo) || 1);
  const pageSize = Math.max(1, numberOf(params.pageSize) || 10);
  const start = (pageNo - 1) * pageSize;
  return success({
    list: items.slice(start, start + pageSize),
    total: items.length,
  });
};

const typePage = async (_config: unknown, requestConfig: MockRequestConfig) => {
  const params = paramsOf(requestConfig) as unknown as DictTypeQuery;
  const status = statusOf(params.status);
  const items = dictTypes.filter(
    (item) =>
      (!params.name || item.name.includes(params.name)) &&
      (!params.type || item.type.includes(params.type)) &&
      (status === undefined || item.status === status),
  );
  return page(items, requestConfig);
};

const dataPage = async (_config: unknown, requestConfig: MockRequestConfig) => {
  const params = paramsOf(requestConfig) as unknown as DictDataQuery;
  const status = statusOf(params.status);
  const items = dictData
    .filter(
      (item) =>
        item.dictType === params.dictType &&
        (!params.label || item.label.includes(params.label)) &&
        (status === undefined || item.status === status),
    )
    .sort(
      (left, right) =>
        left.sort - right.sort || (left.id || 0) - (right.id || 0),
    );
  return page(items, requestConfig);
};

const getType = async (_config: unknown, requestConfig: MockRequestConfig) => {
  const id = numberOf(paramsOf(requestConfig).id);
  const item = dictTypes.find((record) => record.id === id);
  return item ? success(item) : failure('当前字典类型不存在', 1002006001);
};

const getData = async (_config: unknown, requestConfig: MockRequestConfig) => {
  const id = numberOf(paramsOf(requestConfig).id);
  const item = dictData.find((record) => record.id === id);
  return item ? success(item) : failure('当前字典数据不存在', 1002007001);
};

const createType = async (
  _config: unknown,
  requestConfig: MockRequestConfig,
) => {
  const input = bodyOf<Omit<DictType, 'id' | 'createTime'>>(requestConfig);
  if (dictTypes.some((item) => item.name === input.name))
    return failure('已经存在该名字的字典类型', 1002006003);
  if (dictTypes.some((item) => item.type === input.type))
    return failure('已经存在该类型的字典类型', 1002006004);
  dictTypes.push({ ...input, id: nextTypeId++, createTime: currentTime() });
  return success(null);
};

const updateType = async (
  _config: unknown,
  requestConfig: MockRequestConfig,
) => {
  const input = bodyOf<DictType>(requestConfig);
  const index = dictTypes.findIndex((item) => item.id === input.id);
  if (index < 0) return failure('当前字典类型不存在', 1002006001);
  if (
    dictTypes.some((item) => item.id !== input.id && item.name === input.name)
  )
    return failure('已经存在该名字的字典类型', 1002006003);
  if (
    dictTypes.some((item) => item.id !== input.id && item.type === input.type)
  )
    return failure('已经存在该类型的字典类型', 1002006004);
  dictTypes[index] = { ...dictTypes[index], ...input };
  return success(null);
};

const createData = async (
  _config: unknown,
  requestConfig: MockRequestConfig,
) => {
  const input = bodyOf<Omit<DictData, 'id' | 'createTime'>>(requestConfig);
  const type = dictTypes.find((item) => item.type === input.dictType);
  if (!type) return failure('当前字典类型不存在', 1002006001);
  if (type.status === 1)
    return failure('字典类型不处于开启状态，不允许选择', 1002006002);
  if (
    dictData.some(
      (item) => item.dictType === input.dictType && item.value === input.value,
    )
  )
    return failure('已经存在该值的字典数据', 1002007003);
  dictData.push({ ...input, id: nextDataId++, createTime: currentTime() });
  return success(null);
};

const updateData = async (
  _config: unknown,
  requestConfig: MockRequestConfig,
) => {
  const input = bodyOf<DictData>(requestConfig);
  const index = dictData.findIndex((item) => item.id === input.id);
  if (index < 0) return failure('当前字典数据不存在', 1002007001);
  const type = dictTypes.find((item) => item.type === input.dictType);
  if (!type) return failure('当前字典类型不存在', 1002006001);
  if (type.status === 1)
    return failure('字典类型不处于开启状态，不允许选择', 1002006002);
  if (
    dictData.some(
      (item) =>
        item.id !== input.id &&
        item.dictType === input.dictType &&
        item.value === input.value,
    )
  )
    return failure('已经存在该值的字典数据', 1002007003);
  dictData[index] = { ...dictData[index], ...input };
  return success(null);
};

const removeDataByType = (dictType: string) => {
  for (let index = dictData.length - 1; index >= 0; index -= 1) {
    if (dictData[index].dictType === dictType) dictData.splice(index, 1);
  }
};

const deleteType = async (
  _config: unknown,
  requestConfig: MockRequestConfig,
) => {
  const id = numberOf(paramsOf(requestConfig).id);
  const item = dictTypes.find((record) => record.id === id);
  if (!item) return failure('当前字典类型不存在', 1002006001);
  dictTypes.splice(dictTypes.indexOf(item), 1);
  removeDataByType(item.type);
  return success(null);
};

const deleteData = async (
  _config: unknown,
  requestConfig: MockRequestConfig,
) => {
  const id = numberOf(paramsOf(requestConfig).id);
  const index = dictData.findIndex((item) => item.id === id);
  if (index < 0) return failure('当前字典数据不存在', 1002007001);
  dictData.splice(index, 1);
  return success(null);
};

const deleteTypeList = async (
  _config: unknown,
  requestConfig: MockRequestConfig,
) => {
  const ids = new Set(
    String(paramsOf(requestConfig).ids || '')
      .split(',')
      .map(Number)
      .filter(Number.isFinite),
  );
  const items = [...ids]
    .map((id) => dictTypes.find((record) => record.id === id))
    .filter((item): item is DictType => Boolean(item));
  items.forEach((item) => {
    dictTypes.splice(dictTypes.indexOf(item), 1);
    removeDataByType(item.type);
  });
  return success(null);
};

const deleteDataList = async (
  _config: unknown,
  requestConfig: MockRequestConfig,
) => {
  const ids = new Set(
    String(paramsOf(requestConfig).ids || '')
      .split(',')
      .map(Number)
      .filter(Number.isFinite),
  );
  for (let index = dictData.length - 1; index >= 0; index -= 1) {
    if (ids.has(dictData[index].id || -1)) dictData.splice(index, 1);
  }
  return success(null);
};

// 技能字典：支撑人才库「可新建标签下拉」的 skill-list 与 create-skill 接口
const skillLabels = [
  'React',
  'Vue',
  'Java',
  '项目管理',
  '数据分析',
  '产品设计',
  '管理',
  '运营',
  '财务',
];

const handlers: MockHandler[] = [
  {
    method: 'GET',
    path: '/system/dict-data/simple-list',
    handle: async () => success(dictData.filter((item) => item.status === 0)),
  },
  {
    method: 'GET',
    path: '/system/dict-data/skill-list',
    handle: async () =>
      success(
        skillLabels.map((label) => ({
          dictType: 'hrm_skill',
          value: label,
          label,
        })),
      ),
  },
  {
    method: 'POST',
    path: '/system/dict-data/create-skill',
    handle: async (_config, requestConfig) => {
      const label =
        typeof requestConfig?.data === 'string'
          ? requestConfig.data.trim()
          : '';
      if (!label) return failure('技能标签不能为空');
      const exists = skillLabels.some(
        (item) => item.toLowerCase() === label.toLowerCase(),
      );
      if (!exists) skillLabels.push(label);
      return success(true);
    },
  },
  { method: 'GET', path: '/system/dict-type/page', handle: typePage },
  { method: 'GET', path: '/system/dict-type/get', handle: getType },
  { method: 'POST', path: '/system/dict-type/create', handle: createType },
  { method: 'PUT', path: '/system/dict-type/update', handle: updateType },
  { method: 'DELETE', path: '/system/dict-type/delete', handle: deleteType },
  {
    method: 'DELETE',
    path: '/system/dict-type/delete-list',
    handle: deleteTypeList,
  },
  { method: 'GET', path: '/system/dict-data/page', handle: dataPage },
  { method: 'GET', path: '/system/dict-data/get', handle: getData },
  { method: 'POST', path: '/system/dict-data/create', handle: createData },
  { method: 'PUT', path: '/system/dict-data/update', handle: updateData },
  { method: 'DELETE', path: '/system/dict-data/delete', handle: deleteData },
  {
    method: 'DELETE',
    path: '/system/dict-data/delete-list',
    handle: deleteDataList,
  },
];

export default handlers;
