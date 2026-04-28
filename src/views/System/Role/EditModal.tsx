import { useEffect, useState } from "react";
import { Form, Input, InputNumber, Radio, message, Select } from "antd";
import MyModal from "@/components/MyModal";
import {
  getRole,
  createRole,
  updateRole,
  type RoleVO,
  RoleStatusEnum,
  DataScopeEnum,
} from "./api";

interface EditModalProps {
  visible: boolean;
  roleId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

// 数据范围选项
const DATA_SCOPE_OPTIONS = [
  { label: "全部数据权限", value: DataScopeEnum.ALL },
  { label: "自定义数据权限", value: DataScopeEnum.CUSTOM },
  { label: "本部门数据权限", value: DataScopeEnum.DEPT },
  { label: "本部门及以下数据权限", value: DataScopeEnum.DEPT_AND_CHILD },
  { label: "仅本人数据权限", value: DataScopeEnum.SELF },
];

export default function EditModal({
  visible,
  roleId,
  onCancel,
  onSuccess,
}: EditModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 加载角色详情
  useEffect(() => {
    const fetchRoleDetail = async () => {
      if (!roleId) return;

      setLoading(true);
      const { data, err } = await getRole({ params: { id: roleId } });
      setLoading(false);

      if (err) {
        message.error("加载角色详情失败");
        onCancel();
      } else if (data) {
        form.setFieldsValue(data);
      }
    };

    if (visible && roleId) {
      fetchRoleDetail();
    } else if (visible && !roleId) {
      // 新增模式，设置默认值
      form.resetFields();
      form.setFieldsValue({
        status: RoleStatusEnum.ENABLE,
        sort: 0,
        dataScope: DataScopeEnum.ALL,
      });
    }
  }, [visible, roleId, form, onCancel]);

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: RoleVO = {
        ...values,
        id: roleId,
      };

      const isCreate = !roleId;
      const { err } = isCreate
        ? await createRole({ data })
        : await updateRole({ data });

      if (err) {
        message.error(isCreate ? "新增失败" : "修改失败");
      } else {
        message.success(isCreate ? "新增成功" : "修改成功");
        onSuccess();
        onCancel();
      }
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(!roleId ? "新增失败" : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MyModal
      open={visible}
      title={roleId ? "修改角色" : "新增角色"}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnHidden
      width={600}
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 16 }}>
        <Form.Item
          label="角色名称"
          name="name"
          rules={[
            { required: true, message: "请输入角色名称" },
            { min: 2, max: 30, message: "角色名称长度必须在2到30个字符之间" },
          ]}
        >
          <Input placeholder="请输入角色名称" />
        </Form.Item>

        <Form.Item
          label="角色编码"
          name="code"
          rules={[
            { required: true, message: "请输入角色编码" },
            { min: 2, max: 30, message: "角色编码长度必须在2到30个字符之间" },
            { pattern: /^[a-zA-Z0-9_]+$/, message: "角色编码只能包含字母、数字和下划线" },
          ]}
        >
          <Input placeholder="请输入角色编码" />
        </Form.Item>

        <Form.Item
          label="显示顺序"
          name="sort"
          rules={[{ required: true, message: "请输入显示顺序" }]}
        >
          <InputNumber placeholder="请输入显示顺序" style={{ width: "100%" }} min={0} />
        </Form.Item>

        <Form.Item
          label="数据范围"
          name="dataScope"
          rules={[{ required: true, message: "请选择数据范围" }]}
        >
          <Select placeholder="请选择数据范围" options={DATA_SCOPE_OPTIONS} />
        </Form.Item>

        <Form.Item
          label="状态"
          name="status"
          rules={[{ required: true, message: "请选择状态" }]}
        >
          <Radio.Group>
            <Radio value={RoleStatusEnum.ENABLE}>正常</Radio>
            <Radio value={RoleStatusEnum.DISABLE}>停用</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="备注"
          name="remark"
        >
          <Input.TextArea placeholder="请输入备注" rows={3} maxLength={200} showCount />
        </Form.Item>
      </Form>
    </MyModal>
  );
}
