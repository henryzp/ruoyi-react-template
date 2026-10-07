import type { FormInstance } from 'antd';
import { Button, Form, Input, Select, Space } from 'antd';
import type { DictDataSearchValues } from '../types';
import { statusOptions } from '../constants';

type Props = {
  form: FormInstance<DictDataSearchValues>;
  doSearch: () => void;
};

const DictDataSearchForm = ({ form, doSearch }: Props) => (
  <Form form={form} layout="inline" onFinish={doSearch}>
    <Form.Item name="label" label="字典标签">
      <Input allowClear placeholder="请输入标签" />
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

export default DictDataSearchForm;
