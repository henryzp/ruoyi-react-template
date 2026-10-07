export interface CreatableSelectProps {
  value?: string[];
  onChange?: (labels: string[]) => void;
  /** 已有可选项（来自外部数据源）。 */
  options?: string[];
  /**
   * 输入新选项回车后触发，由外部负责持久化（如写入字典库）。
   * 返回的 Promise 失败时静默处理：选项仍保留在表单值与本地选项中。
   */
  onCreate?: (label: string) => Promise<unknown>;
  placeholder?: string;
  disabled?: boolean;
  /** 透传给内部 Select，用于控制宽度等布局样式。 */
  className?: string;
}
