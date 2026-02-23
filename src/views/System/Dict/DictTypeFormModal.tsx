import { useEffect } from "react";
import { Modal, Form, Input, Radio, message } from "antd";
import type { DictTypeVO } from "./api";
import { getDictType, createDictType, updateDictType } from "./api";

interface DictTypeFormModalProps {
  visible: boolean;
  type: "create" | "update";
  id?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

// 通用状态枚举
enum CommonStatusEnum {
  DISABLE = 0,
  ENABLE = 1,
}

export default function DictTypeFormModal({
  visible,
  type,
  id,
  onCancel,
  onSuccess,
}: DictTypeFormModalProps) {
  const [form] = Form.useForm();

  const title = type === "create" ? "新增字典类型" : "修改字典类型";

  // 加载字典类型详情
  useEffect(() => {
    const loadDictType = async () => {
      if (visible && type === "update" && id) {
        const { data, err } = await getDictType({ params: { id } });
        if (err) {
          message.error("加载字典类型失败");
        } else if (data) {
          form.setFieldsValue(data);
        }
      } else if (visible && type === "create") {
        form.resetFields();
        form.setFieldsValue({ status: CommonStatusEnum.ENABLE });
      }
    };
    loadDictType();
  }, [visible, type, id, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data: DictTypeVO = {
        ...values,
        id,
      };

      const { err } =
        type === "create"
          ? await createDictType({ data })
          : await updateDictType({ data });

      if (err) {
        message.error(type === "create" ? "新增失败" : "修改失败");
      } else {
        message.success(type === "create" ? "新增成功" : "修改成功");
        onSuccess();
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误，不显示 message
        return;
      }
      message.error(type === "create" ? "新增失败" : "修改失败");
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      open={visible}
      title={title}
      onOk={handleSubmit}
      onCancel={handleCancel}
      destroyOnClose
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ status: CommonStatusEnum.ENABLE }}
      >
        <Form.Item
          label="字典名称"
          name="name"
          rules={[{ required: true, message: "请输入字典名称" }]}
        >
          <Input placeholder="请输入字典名称" />
        </Form.Item>

        <Form.Item
          label="字典类型"
          name="type"
          rules={[{ required: true, message: "请输入字典类型" }]}
        >
          <Input placeholder="请输入字典类型" disabled={type === "update"} />
        </Form.Item>

        <Form.Item
          label="状态"
          name="status"
          rules={[{ required: true, message: "请选择状态" }]}
        >
          <Radio.Group>
            <Radio value={CommonStatusEnum.ENABLE}>启用</Radio>
            <Radio value={CommonStatusEnum.DISABLE}>停用</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={3} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
