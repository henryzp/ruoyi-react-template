import { useEffect, useState } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  Table,
  Space,
  message,
  Popconfirm,
  Modal,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import type { DictTypeVO, PageParam } from "./api";
import {
  getDictTypePage,
  deleteDictType,
  deleteDictTypeList,
  exportDictType,
} from "./api";
import DictTypeFormModal from "./DictTypeFormModal";
import DictDataModal from "./DictDataModal";
import { exportFile } from "@/utils/download";

// 通用状态枚举
enum CommonStatusEnum {
  DISABLE = 0,
  ENABLE = 1,
}

// 状态选项
const STATUS_OPTIONS = [
  { label: "启用", value: CommonStatusEnum.ENABLE },
  { label: "停用", value: CommonStatusEnum.DISABLE },
];

export default function Dict() {
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<DictTypeVO[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  // 分页和搜索参数
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [createTime, setCreateTime] = useState<[Dayjs, Dayjs] | null>(null);

  // 字典类型表单弹窗状态
  const [typeFormVisible, setTypeFormVisible] = useState(false);
  const [typeFormType, setTypeFormType] = useState<"create" | "update">(
    "create",
  );
  const [typeFormId, setTypeFormId] = useState<number | undefined>(undefined);

  // 字典数据弹窗状态
  const [dataModalVisible, setDataModalVisible] = useState(false);
  const [currentDictType, setCurrentDictType] = useState("");
  const [currentDictTypeName, setCurrentDictTypeName] = useState("");

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    const params: PageParam = {
      pageNo,
      pageSize,
      name: name || undefined,
      type: type || undefined,
      status,
      createTime: createTime
        ? [
            createTime[0].format("YYYY-MM-DD HH:mm:ss"),
            createTime[1].format("YYYY-MM-DD HH:mm:ss"),
          ]
        : undefined,
    };
    const { data, err } = await getDictTypePage({ params });
    if (err) {
      message.error("加载数据失败");
    } else {
      setDataSource(data!.list);
      setTotal(data!.total);
    }
    setLoading(false);
  };

  // 初始化加载数据
  useEffect(() => {
    loadData();
  }, []);

  // 搜索
  const handleSearch = () => {
    setPageNo(1);
    loadData();
  };

  // 重置
  const handleReset = () => {
    form.resetFields();
    setName("");
    setType("");
    setStatus(undefined);
    setCreateTime(null);
    setPageNo(1);
  };

  // 打开新增弹窗
  const handleOpenCreate = () => {
    setTypeFormType("create");
    setTypeFormId(undefined);
    setTypeFormVisible(true);
  };

  // 打开编辑弹窗
  const handleOpenUpdate = (id: number) => {
    setTypeFormType("update");
    setTypeFormId(id);
    setTypeFormVisible(true);
  };

  // 删除单条
  const handleDelete = async (id: number) => {
    const { err } = await deleteDictType({ params: { id } });
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

    Modal.confirm({
      title: "确认删除",
      content: `确定要删除选中的 ${selectedIds.length} 条数据吗？`,
      onOk: async () => {
        const { err } = await deleteDictTypeList({
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
      },
    });
  };

  // 导出
  const handleExport = async () => {
    Modal.confirm({
      title: "确认导出",
      content: "确定要导出当前数据吗？",
      onOk: async () => {
        setExportLoading(true);
        const params: PageParam = {
          pageNo,
          pageSize,
          name: name || undefined,
          type: type || undefined,
          status,
          createTime: createTime
            ? [
                createTime[0].format("YYYY-MM-DD HH:mm:ss"),
                createTime[1].format("YYYY-MM-DD HH:mm:ss"),
              ]
            : undefined,
        };
        const { data, err } = await exportDictType({ params });
        if (err) {
          message.error("导出失败");
        } else {
          exportFile(data!, "字典类型.xls");
          message.success("导出成功");
        }
        setExportLoading(false);
      },
    });
  };

  // 打开字典数据弹窗
  const handleOpenDataModal = (record: DictTypeVO) => {
    setCurrentDictType(record.type);
    setCurrentDictTypeName(record.name);
    setDataModalVisible(true);
  };

  // 字典类型表单成功回调
  const handleTypeFormSuccess = () => {
    loadData();
  };

  // 行选择变化
  const handleRowSelectionChange = (keys: React.Key[], rows: DictTypeVO[]) => {
    setSelectedRowKeys(keys);
    setSelectedIds(rows.map((r) => r.id!));
  };

  const columns: ColumnsType<DictTypeVO> = [
    { title: "字典编号", dataIndex: "id", width: 100, align: "center" },
    { title: "字典名称", dataIndex: "name", ellipsis: true },
    { title: "字典类型", dataIndex: "type", width: 300 },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      align: "center",
      render: (status: number) =>
        status === CommonStatusEnum.ENABLE ? "启用" : "停用",
    },
    { title: "备注", dataIndex: "remark", ellipsis: true },
    {
      title: "创建时间",
      dataIndex: "createTime",
      width: 180,
      align: "center",
      render: (time: string | Date) => {
        if (!time) return "-";
        const date = new Date(time);
        return date.toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      },
    },
    {
      title: "操作",
      key: "action",
      width: 200,
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
          <Button
            type="link"
            size="small"
            onClick={() => handleOpenDataModal(record)}
          >
            数据
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
    <div style={{ padding: 16 }}>
      {/* 搜索表单 */}
      <Form form={form} layout="inline">
        <Form.Item label="字典名称" name="name">
          <Input
            placeholder="请输入字典名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 180 }}
          />
        </Form.Item>
        <Form.Item label="字典类型" name="type">
          <Input
            placeholder="请输入字典类型"
            value={type}
            onChange={(e) => setType(e.target.value)}
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
            <Button onClick={handleExport} loading={exportLoading}>
              导出
            </Button>
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
      <div style={{ marginTop: 20 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={dataSource}
          scroll={{ x: "max-content" }}
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
      </div>
      {/* 字典类型表单弹窗 */}
      <DictTypeFormModal
        visible={typeFormVisible}
        type={typeFormType}
        id={typeFormId}
        onCancel={() => setTypeFormVisible(false)}
        onSuccess={handleTypeFormSuccess}
      />

      {/* 字典数据管理弹窗 */}
      <DictDataModal
        visible={dataModalVisible}
        dictType={currentDictType}
        dictTypeName={currentDictTypeName}
        onCancel={() => setDataModalVisible(false)}
      />
    </div>
  );
}
