import type { RefSelectProps, SelectProps } from 'antd/es/select';
export type BaseSelectOption = Record<string, unknown> & { disabled?: boolean };
export interface BaseSelectMapping {
  key: string;
  value: string;
  __primaryKey?: string | number;
}
export interface BaseSelectProps extends SelectProps {
  mapping?: BaseSelectMapping;
  list?: BaseSelectOption[];
  combobox?: boolean;
  getUrl?: () => string;
  getParams?: (value?: string) => Record<string, unknown>;
  url?: string;
  needRequestDidMount?: boolean;
  needOnFocus?: boolean;
  needOnSearch?: boolean;
  responseHandler?: (response: unknown) => BaseSelectOption[];
  onRequestError?: (error: unknown) => void;
  optionsRenderer?: (options: BaseSelectOption[]) => React.ReactNode;
  customRequest?: (
    params: Record<string, unknown>,
  ) => Promise<{ data?: unknown; err?: unknown }>;
  extraParams?: Record<string, unknown>;
  enableCopy?: boolean;
  searchDebounce?: number;
}
export type BaseSelectRef = RefSelectProps;
