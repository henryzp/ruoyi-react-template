import { useEffect, useState } from "react";
import { Form, Input, Radio, message, TreeSelect } from "antd";
import MyModal from "@/components/MyModal";
import {
  getUser,
  createUser,
  updateUser,
  getDeptTree,
  type UserVO,
  type DeptVO,
  UserStatusEnum,
  UserSexEnum,
} from "../api";
import { buildTree } from "@/utils/helper";

interface EditModalProps {
  visible: boolean;
  userId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function EditModal({
  visible,
  userId,
  onCancel,
  onSuccess,
}: EditModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [deptTreeData, setDeptTreeData] = useState<any[]>([]);
  const [deptTreeLoading, setDeptTreeLoading] = useState(false);

  // 加载部门树
  useEffect(() => {
    const fetchDeptTree = async () => {
      setDeptTreeLoading(true);
      const { data, err } = await getDeptTree({ params: {} });
      setDeptTreeLoading(false);

      if (err || !data) {
        message.error("加载部门树失败");
        return;
      }

      // 构建树形结构并转换为 TreeSelect 需要的格式
      const treeData = buildTree(data);
      const convertedData = convertToTreeSelectData(treeData);
      setDeptTreeData(convertedData);
    };

    if (visible) {
      fetchDeptTree();
    }
  }, [visible]);

  // 加载用户详情
  useEffect(() => {
    const fetchUserDetail = async () => {
      if (!userId) return;

      setLoading(true);
      const { data, err } = await getUser({ params: { id: userId } });
      setLoading(false);

      if (err) {
        message.error("加载用户详情失败");
        onCancel();
      } else if (data) {
        form.setFieldsValue(data);
      }
    };

    if (visible && userId) {
      fetchUserDetail();
    } else if (visible && !userId) {
      // 新增模式，设置默认值
      form.resetFields();
      form.setFieldsValue({
        status: UserStatusEnum.ENABLE,
        sex: UserSexEnum.UNKNOWN,
      });
    }
  }, [visible, userId, form, onCancel]);

  // 转换部门数据为 TreeSelect 格式
  const convertToTreeSelectData = (list: DeptVO[]): any[] => {
    return list.map((item) => ({
      title: item.deptName,
      value: item.id,
      key: item.id,
      children: item.children?.length
        ? convertToTreeSelectData(item.children)
        : undefined,
    }));
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: UserVO = {
        ...values,
        id: userId,
      };

      const isCreate = !userId;
      const { err } = isCreate
        ? await createUser({ data })
        : await updateUser({ data });

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
      message.error(!userId ? "新增失败" : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MyModal
      open={visible}
      title={userId ? "修改用户" : "新增用户"}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnHidden
      width={600}
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 16 }}>
        <Form.Item
          label="部门"
          name="deptId"
          rules={[{ required: true, message: "请选择部门" }]}
        >
          <TreeSelect
            placeholder="请选择部门"
            treeData={deptTreeData}
            loading={deptTreeLoading}
            allowClear
            showSearch
            treeNodeFilterProp="title"
            treeDefaultExpandAll
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item
          label="用户账号"
          name="username"
          rules={[
            { required: true, message: "请输入用户账号" },
            { min: 2, max: 20, message: "用户账号长度必须在2到20个字符之间" },
          ]}
        >
          <Input placeholder="请输入用户账号" disabled={!!userId} />
        </Form.Item>

        <Form.Item
          label="用户昵称"
          name="nickname"
          rules={[
            { required: true, message: "请输入用户昵称" },
            { min: 2, max: 20, message: "用户昵称长度必须在2到20个字符之间" },
          ]}
        >
          <Input placeholder="请输入用户昵称" />
        </Form.Item>

        <Form.Item
          label="邮箱"
          name="email"
          rules={[{ type: "email", message: "请输入正确的邮箱地址" }]}
        >
          <Input placeholder="请输入邮箱" />
        </Form.Item>

        <Form.Item
          label="手机号码"
          name="phone"
          rules={[
            { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号码" },
          ]}
        >
          <Input placeholder="请输入手机号码" />
        </Form.Item>

        <Form.Item
          label="性别"
          name="sex"
          rules={[{ required: true, message: "请选择性别" }]}
        >
          <Radio.Group>
            <Radio value={UserSexEnum.MALE}>男</Radio>
            <Radio value={UserSexEnum.FEMALE}>女</Radio>
            <Radio value={UserSexEnum.UNKNOWN}>未知</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="状态"
          name="status"
          rules={[{ required: true, message: "请选择状态" }]}
        >
          <Radio.Group>
            <Radio value={UserStatusEnum.ENABLE}>正常</Radio>
            <Radio value={UserStatusEnum.DISABLE}>停用</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={3} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </MyModal>
  );
}
