import { useEffect, useMemo, useState } from 'react';
import { App, Modal } from 'antd';
import { createForm } from '@formily/core';
import { Field, FormProvider } from '@formily/react';
import { Form, FormItem, Input, Select } from '@zpu/formily-antd-v6';
import { statusOptions } from '../../constants';
import { createDictType, updateDictType } from '../api';
import type { DictType, DictTypeFormValues } from '../../types';
interface Props {
  open: boolean;
  mode: 'create' | 'update';
  record?: DictType;
  onCancel: () => void;
  onSuccess: () => void;
}
const createDefaults = { status: 0 };

const DictTypeFormModal = ({
  open,
  mode,
  record,
  onCancel,
  onSuccess,
}: Props) => {
  const { message } = App.useApp();
  const form = useMemo(() => createForm({ initialValues: createDefaults }), []);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    form.reset();
    if (mode === 'create') form.setValues(createDefaults);
    else if (record) form.setValues(record);
  }, [form, mode, open, record]);
  const submit = async () => {
    try {
      setLoading(true);
      const values = (await form.submit()) as DictTypeFormValues;
      const result =
        mode === 'create'
          ? await createDictType({ data: values })
          : await updateDictType({ data: { ...values, id: record?.id } });
      if (result.err) return;
      form.reset();
      message.success(mode === 'create' ? '新增成功' : '修改成功');
      onSuccess();
    } catch {
      message.error('请完善必填信息');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      open={open}
      mask={{ closable: false }}
      title={mode === 'create' ? '新增字典类型' : '编辑字典类型'}
      onCancel={onCancel}
      afterClose={() => form.reset()}
      onOk={() => submit()}
      confirmLoading={loading}
      destroyOnHidden
    >
      <FormProvider form={form}>
        <Form form={form} labelWidth={100}>
          <Field
            name="name"
            title="字典名称"
            required
            decorator={[FormItem]}
            component={[Input]}
          />
          <Field
            name="type"
            title="字典类型"
            required
            decorator={[FormItem]}
            component={[Input, { disabled: mode === 'update' }]}
          />
          <Field
            name="status"
            title="状态"
            required
            decorator={[FormItem]}
            component={[Select, { options: statusOptions }]}
          />
          <Field
            name="remark"
            title="备注"
            decorator={[FormItem]}
            component={[Input.TextArea]}
          />
        </Form>
      </FormProvider>
    </Modal>
  );
};
export default DictTypeFormModal;
