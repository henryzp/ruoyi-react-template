import type { FormInstance } from 'antd';
import { Button, Form, Input, Select, Space } from 'antd';
import type { DictTypeSearchValues } from '../types';
import { statusOptions } from '../constants';

type Props = {
  form: FormInstance<DictTypeSearchValues>;
  doSearch: () => void;
};

const DictTypeSearchForm = ({ form, doSearch }: Props) => (
  <Form form={form} layout="inline" onFinish={doSearch}>
    <Form.Item name="name" label="字典名称">
      <Input allowClear placeholder="请输入名称" />
    </Form.Item>
    <Form.Item name="type" label="字典类型">
      <Input allowClear placeholder="请输入类型" />
    </Form.Item>
    <Form.Item name="status" label="状态">
      <Select
        style={{ width: 120 }}
        allowClear
        placeholder="全部状态"
        options={statusOptions}
      />
    </Form.Item>
    <Space>
      <Button type="primary" htmlType="submit">
        搜索
      </Button>
      <Button
        onClick={() => {
          form.resetFields();
          doSearch();
        }}
      >
        重置
      </Button>
    </Space>
  </Form>
);

export default DictTypeSearchForm;
