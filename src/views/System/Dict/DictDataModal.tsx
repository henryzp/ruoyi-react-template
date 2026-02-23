import { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Radio,
  Button,
  Table,
  Space,
  message,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { DictDataVO, DictDataPageParam } from "./api";
import {
  getDictDataPage,
  createDictData,
  updateDictData,
  deleteDictData,
  deleteDictDataList,
  exportDictData,
  getDictData,
} from "./api";
import { exportFile } from "@/utils/download";

interface DictDataModalProps {
  visible: boolean;
  dictType: string;
  dictTypeName?: string;
  onCancel: () => void;
}

// 通用状态枚举
enum CommonStatusEnum {
  DISABLE = 0,
  ENABLE = 1,
}

// 颜色类型选项
const COLOR_TYPE_OPTIONS = [
  { label: "默认", value: "default" },
  { label: "主要", value: "primary" },
  { label: "成功", value: "success" },
  { label: "信息", value: "info" },
  { label: "警告", value: "warning" },
  { label: "危险", value: "danger" },
];

// 状态枚举
const STATUS_OPTIONS = [
  { label: "启用", value: CommonStatusEnum.ENABLE },
  { label: "停用", value: CommonStatusEnum.DISABLE },
];

export default function DictDataModal({
  visible,
  dictType,
  dictTypeName,
  onCancel,
}: DictDataModalProps) {
  const [form] = Form.useForm();
  const [dataForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<DictDataVO[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 分页和搜索参数
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<number | undefined>(undefined);

  // 字典数据表单弹窗状态
  const [dataFormVisible, setDataFormVisible] = useState(false);
  const [dataFormType, setDataFormType] = useState<"create" | "update">(
    "create",
  );
  const [dataFormId, setDataFormId] = useState<number | undefined>(undefined);
  const [dataFormLoading, setDataFormLoading] = useState(false);

  // 加载数据
  const loadData = async () => {
    if (!visible) return;

    setLoading(true);
    const params: DictDataPageParam = {
      pageNo,
      pageSize,
      dictType,
      label: label || undefined,
      status,
    };
    const { data, err } = await getDictDataPage({ params });
    if (err) {
      message.error("加载数据失败");
    } else if (data) {
      setDataSource(data.list);
      setTotal(data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, pageNo, pageSize, label, status, dictType]);

  // 搜索
  const handleSearch = () => {
    setPageNo(1);
    loadData();
  };

  // 重置
  const handleReset = () => {
    form.resetFields();
    setLabel("");
    setStatus(undefined);
    setPageNo(1);
  };

  // 打开新增弹窗
  const handleOpenCreate = () => {
    setDataFormType("create");
    setDataFormId(undefined);
    dataForm.resetFields();
    dataForm.setFieldsValue({
      sort: 0,
      status: CommonStatusEnum.ENABLE,
      colorType: "default",
    });
    setDataFormVisible(true);
  };

  // 打开编辑弹窗
  const handleOpenUpdate = async (id: number) => {
    setDataFormType("update");
    setDataFormId(id);
    setDataFormLoading(true);
    setDataFormVisible(true);

    const { data, err } = await getDictData({ params: { id } });
    if (err) {
      message.error("加载数据失败");
      setDataFormVisible(false);
    } else if (data) {
      dataForm.setFieldsValue(data);
    }
    setDataFormLoading(false);
  };

  // 删除单条
  const handleDelete = async (id: number) => {
    const { err } = await deleteDictData({ params: { id } });
    if (err) {
      message.error("删除失败");
    } else {
      message.success("删除成功");
      loadData();
    }
  };

  // 批量删除
  const handleDeleteBatch = async () => {
    if (selectedIds.length === 0) {
      message.warning("请选择要删除的数据");
      return;
    }

    const { err } = await deleteDictDataList({
      params: { ids: selectedIds.join(",") },
    });
    if (err) {
      message.error("删除失败");
    } else {
      message.success("删除成功");
      setSelectedRowKeys([]);
      setSelectedIds([]);
      loadData();
    }
  };

  // 导出
  const handleExport = async () => {
    const params: DictDataPageParam = {
      pageNo,
      pageSize,
      dictType,
      label: label || undefined,
      status,
    };
    const { data, err } = await exportDictData({ params });
    if (err) {
      message.error("导出失败");
    } else if (data) {
      exportFile(data, "字典数据.xls");
      message.success("导出成功");
    }
  };

  // 提交数据表单
  const handleDataFormSubmit = async () => {
    try {
      const values = await dataForm.validateFields();
      setDataFormLoading(true);

      const data: DictDataVO = {
        ...values,
        dictType,
        id: dataFormId,
      };

      const { err } =
        dataFormType === "create"
          ? await createDictData({ data })
          : await updateDictData({ data });

      if (err) {
        message.error(dataFormType === "create" ? "新增失败" : "修改失败");
      } else {
        message.success(dataFormType === "create" ? "新增成功" : "修改成功");
        setDataFormVisible(false);
        loadData();
      }
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(dataFormType === "create" ? "新增失败" : "修改失败");
    } finally {
      setDataFormLoading(false);
    }
  };

  // 行选择变化
  const handleRowSelectionChange = (keys: React.Key[], rows: DictDataVO[]) => {
    setSelectedRowKeys(keys);
    setSelectedIds(rows.map((r) => r.id!));
  };

  const columns: ColumnsType<DictDataVO> = [
    { title: "字典编码", dataIndex: "id", width: 100, align: "center" },
    { title: "字典标签", dataIndex: "label", align: "center" },
    { title: "字典键值", dataIndex: "value", align: "center" },
    { title: "字典排序", dataIndex: "sort", width: 100, align: "center" },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      align: "center",
      render: (status: number) =>
        status === CommonStatusEnum.ENABLE ? "启用" : "停用",
    },
    { title: "颜色类型", dataIndex: "colorType", width: 100, align: "center" },
    { title: "CSS Class", dataIndex: "cssClass", width: 120, align: "center" },
    { title: "备注", dataIndex: "remark", ellipsis: true },
    {
      title: "操作",
      key: "action",
      width: 150,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleOpenUpdate(record.id!)}
          >
            修改
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条数据吗？"
            onConfirm={() => handleDelete(record.id!)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        open={visible}
        title={`字典数据管理 - ${dictTypeName || dictType}`}
        onCancel={onCancel}
        footer={null}
        width={1200}
        destroyOnClose
      >
        {/* 搜索表单 */}
        <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item label="字典标签" name="label">
            <Input
              placeholder="请输入字典标签"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select
              placeholder="请选择状态"
              value={status}
              onChange={setStatus}
              allowClear
              style={{ width: 120 }}
              options={STATUS_OPTIONS}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
              <Button type="primary" onClick={handleOpenCreate}>
                新增
              </Button>
              <Button onClick={handleExport}>导出</Button>
              <Button
                danger
                disabled={selectedIds.length === 0}
                onClick={handleDeleteBatch}
              >
                批量删除
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 数据表格 */}
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={dataSource}
          scroll={{ x: 1000 }}
          rowSelection={{
            selectedRowKeys,
            onChange: handleRowSelectionChange,
          }}
          pagination={{
            current: pageNo,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (page, size) => {
              setPageNo(page);
              setPageSize(size);
            },
          }}
        />
      </Modal>

      {/* 字典数据表单弹窗 */}
      <Modal
        open={dataFormVisible}
        title={dataFormType === "create" ? "新增字典数据" : "修改字典数据"}
        onOk={handleDataFormSubmit}
        onCancel={() => setDataFormVisible(false)}
        confirmLoading={dataFormLoading}
        destroyOnClose
        width={600}
      >
        <Form
          form={dataForm}
          layout="vertical"
          initialValues={{
            status: CommonStatusEnum.ENABLE,
            colorType: "default",
          }}
        >
          <Form.Item label="字典类型" name="dictType">
            <Input value={dictType} disabled />
          </Form.Item>

          <Form.Item
            label="数据标签"
            name="label"
            rules={[{ required: true, message: "请输入数据标签" }]}
          >
            <Input placeholder="请输入数据标签" />
          </Form.Item>

          <Form.Item
            label="数据键值"
            name="value"
            rules={[{ required: true, message: "请输入数据键值" }]}
          >
            <Input placeholder="请输入数据键值" />
          </Form.Item>

          <Form.Item
            label="显示排序"
            name="sort"
            rules={[{ required: true, message: "请输入显示排序" }]}
          >
            <InputNumber
              min={0}
              placeholder="请输入显示排序"
              style={{ width: "100%" }}
            />
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

          <Form.Item label="颜色类型" name="colorType">
            <Select
              placeholder="请选择颜色类型"
              options={COLOR_TYPE_OPTIONS.map((item) => ({
                label: `${item.label}(${item.value})`,
                value: item.value,
              }))}
            />
          </Form.Item>

          <Form.Item label="CSS Class" name="cssClass">
            <Input placeholder="请输入 CSS Class" />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
