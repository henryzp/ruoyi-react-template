import { useEffect, useState } from "react";
import { Form, Input, InputNumber, Radio, message, TreeSelect, Switch } from "antd";
import MyModal from "@/components/MyModal";
import {
  getMenu,
  createMenu,
  updateMenu,
  getMenuList,
  type MenuVO,
  MenuTypeEnum,
  KeepAliveEnum,
  VisibleEnum,
} from "./api";
import { buildTree } from "@/utils/helper";

interface EditModalProps {
  visible: boolean;
  menuId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

/**
 * 将菜单数据转换为 TreeSelect 需要的格式
 */
function convertToTreeSelectData(list: MenuVO[]): any[] {
  return list.map((item) => ({
    title: item.name,
    value: item.id,
    key: item.id,
    children: item.children?.length ? convertToTreeSelectData(item.children) : undefined,
  }));
}

/**
 * 菜单类型选项
 */
const MENU_TYPE_OPTIONS = [
  { label: "目录", value: MenuTypeEnum.DIR },
  { label: "菜单", value: MenuTypeEnum.MENU },
  { label: "按钮", value: MenuTypeEnum.BUTTON },
];

/**
 * 是否外链选项
 */
const IS_FRAME_OPTIONS = [
  { label: "是", value: 1 },
  { label: "否", value: 0 },
];

export default function EditModal({
  visible,
  menuId,
  onCancel,
  onSuccess,
}: EditModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [menuTreeData, setMenuTreeData] = useState<any[]>([]);
  const [menuTreeLoading, setMenuTreeLoading] = useState(false);
  const [menuType, setMenuType] = useState<MenuTypeEnum>(MenuTypeEnum.MENU);

  // 加载菜单树
  useEffect(() => {
    const fetchMenuTree = async () => {
      setMenuTreeLoading(true);
      const { data, err } = await getMenuList({ params: {} });
      setMenuTreeLoading(false);

      if (err || !data) {
        message.error("加载菜单树失败");
        return;
      }

      // 构建树形结构并转换为 TreeSelect 需要的格式
      const treeData = buildTree(data);
      const convertedData = convertToTreeSelectData(treeData);
      // 添加一个顶级选项"无父菜单"
      setMenuTreeData([
        { title: "无父菜单", value: 0, key: 0 },
        ...convertedData,
      ]);
    };

    if (visible) {
      fetchMenuTree();
    }
  }, [visible]);

  // 加载菜单详情
  useEffect(() => {
    const fetchMenuDetail = async () => {
      if (!menuId) return;

      setLoading(true);
      const { data, err } = await getMenu({ params: { id: menuId } });
      setLoading(false);

      if (err) {
        message.error("加载菜单详情失败");
        onCancel();
      } else if (data) {
        form.setFieldsValue(data);
        setMenuType(data.type as MenuTypeEnum);
      }
    };

    if (visible && menuId) {
      fetchMenuDetail();
    } else if (visible && !menuId) {
      // 新增模式，设置默认值
      form.resetFields();
      form.setFieldsValue({
        status: "0",
        parentId: 0,
        sort: 0,
        type: MenuTypeEnum.MENU,
        visible: VisibleEnum.SHOW,
        keepAlive: KeepAliveEnum.NO,
        isFrame: 0,
      });
      setMenuType(MenuTypeEnum.MENU);
    }
  }, [visible, menuId, form, onCancel]);

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: MenuVO = {
        ...values,
        id: menuId,
      };

      const isCreate = !menuId;
      const { err } = isCreate
        ? await createMenu({ data })
        : await updateMenu({ data });

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
      message.error(!menuId ? "新增失败" : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MyModal
      open={visible}
      title={menuId ? "修改菜单" : "新增菜单"}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnHidden
      width={700}
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 16 }}>
        <Form.Item
          label="上级菜单"
          name="parentId"
          rules={[{ required: true, message: "请选择上级菜单" }]}
        >
          <TreeSelect
            placeholder="请选择上级菜单"
            treeData={menuTreeData}
            loading={menuTreeLoading}
            allowClear
            showSearch
            treeNodeFilterProp="title"
            treeDefaultExpandAll
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item
          label="菜单类型"
          name="type"
          rules={[{ required: true, message: "请选择菜单类型" }]}
        >
          <Radio.Group
            options={MENU_TYPE_OPTIONS}
            onChange={(e) => setMenuType(e.target.value)}
          />
        </Form.Item>

        <Form.Item
          label="菜单名称"
          name="name"
          rules={[
            { required: true, message: "请输入菜单名称" },
            { min: 2, max: 50, message: "菜单名称长度必须在2到50个字符之间" },
          ]}
        >
          <Input placeholder="请输入菜单名称" />
        </Form.Item>

        <Form.Item
          label="显示顺序"
          name="sort"
          rules={[{ required: true, message: "请输入显示顺序" }]}
        >
          <InputNumber placeholder="请输入显示顺序" style={{ width: "100%" }} min={0} />
        </Form.Item>

        {/* 菜单类型为目录或菜单时显示路由地址 */}
        {(menuType === MenuTypeEnum.DIR || menuType === MenuTypeEnum.MENU) && (
          <Form.Item
            label="路由地址"
            name="path"
            rules={[{ required: true, message: "请输入路由地址" }]}
          >
            <Input placeholder="请输入路由地址，如：/system/user" />
          </Form.Item>
        )}

        {/* 菜单类型为菜单时显示组件路径 */}
        {menuType === MenuTypeEnum.MENU && (
          <>
            <Form.Item
              label="组件路径"
              name="component"
              rules={[{ required: true, message: "请输入组件路径" }]}
            >
              <Input placeholder="请输入组件路径，如：system/user/index" />
            </Form.Item>

            <Form.Item
              label="是否外链"
              name="isFrame"
              rules={[{ required: true, message: "请选择是否外链" }]}
            >
              <Radio.Group options={IS_FRAME_OPTIONS} />
            </Form.Item>

            <Form.Item
              label="是否缓存"
              name="keepAlive"
              rules={[{ required: true, message: "请选择是否缓存" }]}
            >
              <Radio.Group>
                <Radio value={KeepAliveEnum.YES}>缓存</Radio>
                <Radio value={KeepAliveEnum.NO}>不缓存</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              label="是否显示"
              name="visible"
              rules={[{ required: true, message: "请选择是否显示" }]}
              valuePropName="checked"
            >
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </>
        )}

        {/* 按钮类型时显示权限标识 */}
        {menuType === MenuTypeEnum.BUTTON && (
          <Form.Item
            label="权限标识"
            name="permission"
            rules={[{ required: true, message: "请输入权限标识" }]}
          >
            <Input placeholder="请输入权限标识，如：system:user:add" />
          </Form.Item>
        )}

        <Form.Item
          label="菜单图标"
          name="icon"
        >
          <Input placeholder="请输入菜单图标，如：UserOutlined" />
        </Form.Item>

        <Form.Item
          label="菜单状态"
          name="status"
          rules={[{ required: true, message: "请选择菜单状态" }]}
        >
          <Radio.Group>
            <Radio value="0">正常</Radio>
            <Radio value="1">停用</Radio>
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
