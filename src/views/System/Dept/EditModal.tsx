import { useEffect, useState } from "react";
import { Form, Input, Radio, message, TreeSelect } from "antd";
import MyModal from "@/components/MyModal";
import {
  getDept,
  createDept,
  updateDept,
  getDeptList,
  type DeptVO,
  DeptStatusEnum,
} from "./api";
import { buildTree } from "@/utils/helper";

interface EditModalProps {
  visible: boolean;
  deptId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

/**
 * 将部门数据转换为 TreeSelect 需要的格式
 */
function convertToTreeSelectData(list: DeptVO[]): any[] {
  return list.map((item) => ({
    title: item.name,
    value: item.id,
    key: item.id,
    children: item.children?.length ? convertToTreeSelectData(item.children) : undefined,
  }));
}

export default function EditModal({
  visible,
  deptId,
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
      const { data, err } = await getDeptList({ params: {} });
      setDeptTreeLoading(false);

      if (err || !data) {
        message.error("加载部门树失败");
        return;
      }

      // 构建树形结构并转换为 TreeSelect 需要的格式
      const treeData = buildTree(data);
      const convertedData = convertToTreeSelectData(treeData);
      // 添加一个顶级选项"无父部门"
      setDeptTreeData([
        { title: "无父部门", value: 0, key: 0 },
        ...convertedData,
      ]);
    };

    if (visible) {
      fetchDeptTree();
    }
  }, [visible]);

  // 加载部门详情
  useEffect(() => {
    const fetchDeptDetail = async () => {
      if (!deptId) return;

      setLoading(true);
      const { data, err } = await getDept({ params: { id: deptId } });
      setLoading(false);

      if (err) {
        message.error("加载部门详情失败");
        onCancel();
      } else if (data) {
        form.setFieldsValue(data);
      }
    };

    if (visible && deptId) {
      fetchDeptDetail();
    } else if (visible && !deptId) {
      // 新增模式，设置默认值
      form.resetFields();
      form.setFieldsValue({
        status: DeptStatusEnum.ENABLE,
        parentId: 0,
        sort: 0,
      });
    }
  }, [visible, deptId, form, onCancel]);

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: DeptVO = {
        ...values,
        id: deptId,
      };

      const isCreate = !deptId;
      const { err } = isCreate
        ? await createDept({ data })
        : await updateDept({ data });

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
      message.error(!deptId ? "新增失败" : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MyModal
      open={visible}
      title={deptId ? "修改部门" : "新增部门"}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnHidden
      width={600}
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 16 }}>
        <Form.Item
          label="上级部门"
          name="parentId"
          rules={[{ required: true, message: "请选择上级部门" }]}
        >
          <TreeSelect
            placeholder="请选择上级部门"
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
          label="部门名称"
          name="name"
          rules={[
            { required: true, message: "请输入部门名称" },
            { min: 2, max: 30, message: "部门名称长度必须在2到30个字符之间" },
          ]}
        >
          <Input placeholder="请输入部门名称" />
        </Form.Item>

        <Form.Item
          label="显示排序"
          name="sort"
          rules={[{ required: true, message: "请输入显示排序" }]}
        >
          <Input type="number" placeholder="请输入显示排序" />
        </Form.Item>

        <Form.Item
          label="负责人"
          name="leader"
        >
          <Input placeholder="请输入负责人" />
        </Form.Item>

        <Form.Item
          label="联系电话"
          name="phone"
          rules={[
            { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号码" },
          ]}
        >
          <Input placeholder="请输入联系电话" />
        </Form.Item>

        <Form.Item
          label="邮箱"
          name="email"
          rules={[{ type: "email", message: "请输入正确的邮箱地址" }]}
        >
          <Input placeholder="请输入邮箱" />
        </Form.Item>

        <Form.Item
          label="状态"
          name="status"
          rules={[{ required: true, message: "请选择状态" }]}
        >
          <Radio.Group>
            <Radio value={DeptStatusEnum.ENABLE}>正常</Radio>
            <Radio value={DeptStatusEnum.DISABLE}>停用</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </MyModal>
  );
}
