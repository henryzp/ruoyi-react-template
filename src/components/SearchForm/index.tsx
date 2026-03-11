import { Form, Input, Select, Button, Space, type FormInstance } from "antd";

export interface SearchFormItem {
  type: "input" | "select";
  label: string;
  name: string;
  placeholder?: string;
  style?: React.CSSProperties;
  options?: Array<{ label: string; value: number | string }>;
}

interface SearchFormProps {
  form: FormInstance;
  items: SearchFormItem[];
  onSearch: () => void;
  onReset: () => void;
  searchLoading?: boolean;
  extraActions?: React.ReactNode;
}

/**
 * 搜索表单组件
 * @param form 表单实例
 * @param items 表单项配置
 * @param onSearch 搜索回调
 * @param onReset 重置回调
 * @param searchLoading 搜索按钮加载状态
 * @param extraActions 额外的操作按钮（如新增、导出等）
 */
export default function SearchForm({
  form,
  items,
  onSearch,
  onReset,
  searchLoading = false,
  extraActions,
}: SearchFormProps) {
  return (
    <div style={{ padding: "16px 16px 0" }}>
      <Form form={form} layout="inline">
        {items.map((item) => (
          <Form.Item key={item.name} label={item.label} name={item.name}>
            {item.type === "input" ? (
              <Input
                placeholder={item.placeholder}
                onPressEnter={onSearch}
                style={item.style}
              />
            ) : (
              <Select
                placeholder={item.placeholder}
                allowClear
                options={item.options}
                style={item.style}
              />
            )}
          </Form.Item>
        ))}
        <Form.Item>
          <Space>
            <Button type="primary" onClick={onSearch} loading={searchLoading}>
              搜索
            </Button>
            <Button onClick={onReset}>重置</Button>
            {extraActions}
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}
