export const DICT_TYPE = {
  SYSTEM_DATA_SCOPE: 'system_data_scope',
  SYSTEM_ROLE_TYPE: 'system_role_type',
  HRM_TALENT_LEVEL: 'hrm_talent_level',
  HRM_RECRUIT_CHANNEL: 'hrm_recruit_channel',
  // 员工档案基本信息
  HRM_SEX_TYPE: 'hrm_sex_type',
  HRM_MZ_TYPE: 'hrm_mz_type',
  HRM_ZZMM_TYPE: 'hrm_zzmm_type',
  HRM_HYZK_STATUS: 'hrm_hyzk_status',
  HRM_HJXZ_TYPE: 'hrm_hjxz_type',
  HRM_LIVING: 'hrm_jzqk_type',
  HRM_JZ_TYPE: 'hrm_jz_type',
  HRM_XX_TYPE: 'hrm_xx_type',
  HRM_XL_TYPE: 'hrm_xl_type',
  HRM_XLXZ_TYPE: 'hrm_xlxz_type',
  HRM_DEGREE: 'hrm_xw_type',
  // 员工档案在职信息
  HRM_WORK_STATUS: 'hrm_zzzt_status',
  HRM_PROBATION: 'hrm_syq_type',
  HRM_SALARY_LEVEL: 'hrm_xj_type',
  HRM_JOB_LAYER: 'hrm_zc_type',
  HRM_JOB_CATEGORY: 'hrm_zz_type',
  HRM_JOB_RANK: 'hrm_zj_type',
  HRM_CONTRACT_NATURE: 'hrm_htxz_type',
  // 职级职等配置
  HRM_BAND_TYPE: 'hrm_band_type',
  HRM_POSITION_LEVEL_TYPE: 'hrm_position_level_type',
  HRM_RANK_TYPE: 'hrm_rank_type',
  HRM_SEQUENCE_TYPE: 'hrm_sequence_type',
  // 任职资格配置
  HRM_QUALIFICATION_LEVEL_TYPE: 'hrm_qualification_level_type',
  // 定编定岗（编制管理），key 与后端字典 hr_post_type 一致
  HRM_POST_TYPE: 'hr_post_type',
  // 员工档案其他子面板
  HRM_QSGX_TYPE: 'hrm_qsgx_type',
  HRM_REWARD_TYPE: 'hrm_jclx_type',
  HRM_TRANSFER_TYPE: 'hrm_ddlx_type',
  HRM_TRANSFER_SCOPE: 'hrm_ddfw_type',
} as const;

/** 通用字典下拉选项：字典 value 为 varchar，数字形态的值转为数值 */
export interface DictOption {
  label: string;
  value: string | number;
}

/** 分组字典下拉选项 */
export interface DictOptionGroup {
  label: string;
  options: DictOption[];
}

const NUMERIC_VALUE_PATTERN = /^\d+$/;

/** 将 useDict 的选项转换为通用字典选项，value 为纯数字字符串时转为数值 */
export const toDictOptions = (dict: {
  options: Array<{
    label: string;
    value: string | number | boolean | undefined;
  }>;
}): DictOption[] =>
  dict.options
    .filter(
      (item): item is { label: string; value: string | number } =>
        typeof item.value === 'string' || typeof item.value === 'number',
    )
    .map((item) => ({
      label: item.label,
      value:
        typeof item.value === 'string' && NUMERIC_VALUE_PATTERN.test(item.value)
          ? Number(item.value)
          : item.value,
    }));
