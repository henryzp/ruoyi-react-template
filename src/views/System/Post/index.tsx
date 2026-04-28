import { useRef, useState } from "react";
import { Form, Button, Table, message, Popconfirm, Modal } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  getPostPage,
  deletePost,
  deletePostList,
  exportPost,
  toTablePageResult,
  type PostVO,
  type PostPageParam,
  PostStatusEnum,
} from "./api";
import { exportFile } from "@/utils/download";
import useTable from "@/hooks/useTable";
import useCalcTableHeight from "@/hooks/useCalcTableHeight";
import EditModal from "./EditModal";
import SearchForm, { type SearchFormItem } from "@/components/SearchForm";

// 状态选项
const STATUS_OPTIONS = [
  { label: "正常", value: PostStatusEnum.ENABLE },
  { label: "停用", value: PostStatusEnum.DISABLE },
];

// 搜索表单项配置
const SEARCH_FORM_ITEMS: SearchFormItem[] = [
  {
    type: "input",
    label: "岗位名称",
    name: "name",
    placeholder: "请输入岗位名称",
    style: { width: 180 },
  },
  {
    type: "input",
    label: "岗位编码",
    name: "code",
    placeholder: "请输入岗位编码",
    style: { width: 180 },
  },
  {
    type: "select",
    label: "状态",
    name: "status",
    placeholder: "请选择状态",
    style: { width: 120 },
    options: STATUS_OPTIONS,
  },
];

export default function Post() {
  const [form] = Form.useForm();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // 编辑弹窗状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editPostId, setEditPostId] = useState<number | undefined>(undefined);

  // 计算表格内容区高度
  const tableScrollY = useCalcTableHeight(tableContainerRef);

  // 使用 useTable hook
  const tableProps = useTable<true>({
    fetchData: async (pagination) => {
      // 获取搜索表单的值
      const formValues = form.getFieldsValue();
      const params: PostPageParam = {
        pageNo: pagination.pageNo,
        pageSize: pagination.pageSize,
        name: formValues.name || undefined,
        code: formValues.code || undefined,
        status: formValues.status,
      };
      const { data, err } = await getPostPage({ params });
      if (!err && data) {
        return {
          err: null,
          data: toTablePageResult(data, pagination.pageSize, pagination.pageNo),
        };
      }
      return { err, data: null };
    },
    hasRowSelection: true,
    rowKey: "id",
  });

  // 搜索
  const handleSearch = () => {
    tableProps.handleFetchData({ resetPageNo: true });
  };

  // 重置
  const handleReset = () => {
    form.resetFields();
    tableProps.handleFetchData({ resetPageNo: true });
  };

  // 打开新增弹窗
  const handleOpenCreate = () => {
    setEditPostId(undefined);
    setEditModalVisible(true);
  };

  // 打开修改弹窗
  const handleOpenUpdate = (id: number) => {
    setEditPostId(id);
    setEditModalVisible(true);
  };

  // 关闭编辑弹窗
  const handleCloseEditModal = () => {
    setEditModalVisible(false);
    setEditPostId(undefined);
  };

  // 编辑成功回调
  const handleEditSuccess = () => {
    tableProps.handleFetchData({});
  };

  // 删除单条
  const handleDelete = async (id: number) => {
    const { err } = await deletePost({ params: { id } });
    if (err) {
      message.error("删除失败");
    } else {
      message.success("删除成功");
      tableProps.handleFetchData({});
    }
  };

  // 批量删除
  const handleDeleteBatch = async () => {
    const selectedIds = tableProps.selectedRows.map((r) => r.id!);
    if (selectedIds.length === 0) {
      message.warning("请选择要删除的数据");
      return;
    }

    Modal.confirm({
      title: "确认删除",
      content: `确定要删除选中的 ${selectedIds.length} 条数据吗？`,
      onOk: async () => {
        const { err } = await deletePostList({
          params: { ids: selectedIds.join(",") },
        });
        if (err) {
          message.error("删除失败");
        } else {
          message.success("删除成功");
          tableProps.resetSelectRowKeysFn();
          tableProps.handleFetchData({});
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
        const formValues = form.getFieldsValue();
        const params: PostPageParam = {
          pageNo: tableProps.pagination.current,
          pageSize: tableProps.pagination.pageSize,
          name: formValues.name || undefined,
          code: formValues.code || undefined,
          status: formValues.status,
        };
        const { data, err } = await exportPost({ params });
        if (err) {
          message.error("导出失败");
        } else {
          exportFile(data!, "岗位数据.xls");
          message.success("导出成功");
        }
        setExportLoading(false);
      },
    });
  };

  const columns: ColumnsType<PostVO> = [
    { title: "岗位编号", dataIndex: "id", width: 100, align: "center" },
    { title: "岗位编码", dataIndex: "code", width: 150 },
    { title: "岗位名称", dataIndex: "name", width: 150 },
    {
      title: "显示顺序",
      dataIndex: "sort",
      width: 100,
      align: "center",
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      align: "center",
      render: (status: number) =>
        status === PostStatusEnum.ENABLE ? "正常" : "停用",
    },
    { title: "备注", dataIndex: "remark", ellipsis: true },
    {
      title: "操作",
      key: "action",
      width: 150,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <>
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
        </>
      ),
    },
  ];

  return (
    <>
      {/* 搜索表单 */}
      <SearchForm
        form={form}
        items={SEARCH_FORM_ITEMS}
        onSearch={handleSearch}
        onReset={handleReset}
        extraActions={
          <>
            <Button type="primary" onClick={handleOpenCreate}>
              新增
            </Button>
            <Button onClick={handleExport} loading={exportLoading}>
              导出
            </Button>
            <Button
              danger
              disabled={tableProps.selectedRows.length === 0}
              onClick={handleDeleteBatch}
            >
              批量删除
            </Button>
          </>
        }
      />

      {/* 数据表格 */}
      <div
        ref={tableContainerRef}
        style={{
          marginTop: 16,
          height: "calc(100% - 64px)",
          overflow: "hidden",
        }}
      >
        <Table
          columns={columns}
          scroll={{ x: "max-content", y: tableScrollY || undefined }}
          {...tableProps}
        />
      </div>

      {/* 岗位编辑弹窗 */}
      <EditModal
        visible={editModalVisible}
        postId={editPostId}
        onCancel={handleCloseEditModal}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
