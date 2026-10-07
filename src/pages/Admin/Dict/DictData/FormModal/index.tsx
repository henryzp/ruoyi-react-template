import { useEffect, useMemo, useState } from 'react';
import { App, Modal } from 'antd';
import { createForm } from '@formily/core';
import { Field, FormProvider } from '@formily/react';
import { Form, FormItem, Input, NumberPicker, Select } from '@formily/antd-v5';
import { statusOptions } from '../../constants';
import { createDictData, updateDictData } from '../api';
import type { DictData, DictDataFormValues } from '../../types';
import { colorOptions } from '../../constants';
interface Props {
  open: boolean;
  mode: 'create' | 'update';
  record?: DictData;
  dictType: string;
  onCancel: () => void;
  onSuccess: () => void;
}
const createDefaults = { status: 0, sort: 0 };

const DictDataFormModal = ({
  open,
  mode,
  record,
  dictType,
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
      const values = (await form.submit()) as DictDataFormValues;
      const result =
        mode === 'create'
          ? await createDictData({ data: { ...values, dictType } })
          : await updateDictData({
              data: { ...values, dictType, id: record?.id },
            });
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
      maskClosable={false}
      title={mode === 'create' ? '新增字典数据' : '编辑字典数据'}
      onCancel={onCancel}
      afterClose={() => form.reset()}
      onOk={() => submit()}
      confirmLoading={loading}
      destroyOnHidden
    >
      <FormProvider form={form}>
        <Form form={form} labelWidth={100}>
          <Field
            name="label"
            title="字典标签"
            required
            decorator={[FormItem]}
            component={[Input]}
          />
          <Field
            name="value"
            title="字典键值"
            required
            decorator={[FormItem]}
            component={[Input]}
          />
          <Field
            name="sort"
            title="字典排序"
            required
            decorator={[FormItem]}
            component={[NumberPicker]}
          />
          <Field
            name="status"
            title="状态"
            required
            decorator={[FormItem]}
            component={[Select, { options: statusOptions }]}
          />
          <Field
            name="colorType"
            title="颜色类型"
            decorator={[FormItem]}
            component={[Select, { options: colorOptions }]}
          />
          <Field
            name="cssClass"
            title="CSS Class"
            decorator={[FormItem]}
            component={[Input]}
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
export default DictDataFormModal;
