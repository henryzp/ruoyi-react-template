import { useEffect, useState } from "react";
import { Form, Input, message } from "antd";
import MyModal from "@/components/MyModal";
import { resetUserPassword } from "../api";

interface ResetPasswordModalProps {
  visible: boolean;
  userId?: number;
  username: string;
  onCancel: () => void;
}

export default function ResetPasswordModal({
  visible,
  userId,
  username,
  onCancel,
}: ResetPasswordModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 重置表单
  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  // 提交重置密码
  const handleSubmit = async () => {
    if (!userId) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      const { err } = await resetUserPassword({
        data: {
          id: userId,
          password: values.password,
        },
      });

      if (err) {
        message.error("重置密码失败");
      } else {
        message.success(`修改成功，新密码是：${values.password}`);
        onCancel();
      }
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error("重置密码失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MyModal
      open={visible}
      title={`重置密码 - ${username}`}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnHidden
      width={500}
    >
      <Form form={form} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }}>
        <Form.Item
          label="新密码"
          name="password"
          rules={[
            { required: true, message: "请输入新密码" },
            { min: 6, max: 20, message: "密码长度必须在6到20个字符之间" },
          ]}
        >
          <Input.Password placeholder="请输入新密码" />
        </Form.Item>
        <Form.Item
          label="确认密码"
          name="confirmPassword"
          dependencies={["password"]}
          rules={[
            { required: true, message: "请再次输入新密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("两次输入的密码不一致"));
              },
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" />
        </Form.Item>
      </Form>
    </MyModal>
  );
}
