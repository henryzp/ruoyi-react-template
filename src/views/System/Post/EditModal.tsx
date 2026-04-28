import { useEffect, useState } from "react";
import { Form, Input, Radio, message } from "antd";
import MyModal from "@/components/MyModal";
import {
  getPost,
  createPost,
  updatePost,
  type PostVO,
  PostStatusEnum,
} from "./api";

interface EditModalProps {
  visible: boolean;
  postId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function EditModal({
  visible,
  postId,
  onCancel,
  onSuccess,
}: EditModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 加载岗位详情
  useEffect(() => {
    const fetchPostDetail = async () => {
      if (!postId) return;

      setLoading(true);
      const { data, err } = await getPost({ params: { id: postId } });
      setLoading(false);

      if (err) {
        message.error("加载岗位详情失败");
        onCancel();
      } else if (data) {
        form.setFieldsValue(data);
      }
    };

    if (visible && postId) {
      fetchPostDetail();
    } else if (visible && !postId) {
      // 新增模式，设置默认值
      form.resetFields();
      form.setFieldsValue({
        status: PostStatusEnum.ENABLE,
        sort: 0,
      });
    }
  }, [visible, postId, form, onCancel]);

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: PostVO = {
        ...values,
        id: postId,
      };

      const isCreate = !postId;
      const { err } = isCreate
        ? await createPost({ data })
        : await updatePost({ data });

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
      message.error(!postId ? "新增失败" : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MyModal
      open={visible}
      title={postId ? "修改岗位" : "新增岗位"}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnHidden
      width={600}
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 16 }}>
        <Form.Item
          label="岗位名称"
          name="name"
          rules={[
            { required: true, message: "请输入岗位名称" },
            { min: 2, max: 20, message: "岗位名称长度必须在2到20个字符之间" },
          ]}
        >
          <Input placeholder="请输入岗位名称" />
        </Form.Item>

        <Form.Item
          label="岗位编码"
          name="code"
          rules={[
            { required: true, message: "请输入岗位编码" },
            { min: 2, max: 20, message: "岗位编码长度必须在2到20个字符之间" },
            {
              pattern: /^[a-zA-Z0-9_-]+$/,
              message: "岗位编码只能包含字母、数字、下划线和横线",
            },
          ]}
        >
          <Input placeholder="请输入岗位编码" />
        </Form.Item>

        <Form.Item
          label="显示顺序"
          name="sort"
          rules={[{ required: true, message: "请输入显示顺序" }]}
        >
          <Input type="number" placeholder="请输入显示顺序" />
        </Form.Item>

        <Form.Item
          label="状态"
          name="status"
          rules={[{ required: true, message: "请选择状态" }]}
        >
          <Radio.Group>
            <Radio value={PostStatusEnum.ENABLE}>正常</Radio>
            <Radio value={PostStatusEnum.DISABLE}>停用</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={3} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </MyModal>
  );
}
