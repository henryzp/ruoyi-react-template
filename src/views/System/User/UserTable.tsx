import { useEffect, useRef, useState } from "react";
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
import {
  getUserPage,
  deleteUser,
  deleteUserList,
  exportUser,
  toTablePageResult,
  type UserVO,
  type UserPageParam,
  UserStatusEnum,
  UserSexEnum,
} from "./api";
import { exportFile } from "@/utils/download";
import useTable from "@/hooks/useTable";
import useCalcTableHeight from "@/hooks/useCalcTableHeight";

interface UserTableProps {
  /** 部门ID（用于筛选该部门下的用户） */
  deptId?: number;
}

// 状态选项
const STATUS_OPTIONS = [
  { label: "正常", value: UserStatusEnum.ENABLE },
  { label: "停用", value: UserStatusEnum.DISABLE },
];

export default function UserTable({ deptId }: UserTableProps) {
  const [form] = Form.useForm();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // 计算表格内容区高度
  const tableScrollY = useCalcTableHeight(tableContainerRef);

  // 使用 useTable hook
  const tableProps = useTable<true>({
    fetchData: async (pagination) => {
      const params: UserPageParam = {
        pageNo: pagination.pageNo,
        pageSize: pagination.pageSize,
        deptId,
      };
      const { data, err } = await getUserPage({ params });
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

  // 当部门ID变化时，重新加载数据
  useEffect(() => {
    tableProps.handleFetchData({ resetPageNo: true });
  }, [deptId]);

  // 搜索
  const handleSearch = () => {
    tableProps.handleFetchData({ resetPageNo: true });
  };

  // 重置
  const handleReset = () => {
    form.resetFields();
    tableProps.handleFetchData({ resetPageNo: true });
  };

  // 删除单条
  const handleDelete = async (id: number) => {
    const { err } = await deleteUser({ params: { id } });
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
        const { err } = await deleteUserList({
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
        const params: UserPageParam = {
          pageNo: tableProps.pagination.current,
          pageSize: tableProps.pagination.pageSize,
          deptId,
          username: formValues.username || undefined,
          phone: formValues.phone || undefined,
          status: formValues.status,
        };
        const { data, err } = await exportUser({ params });
        if (err) {
          message.error("导出失败");
        } else {
          exportFile(data!, "用户数据.xls");
          message.success("导出成功");
        }
        setExportLoading(false);
      },
    });
  };

  const columns: ColumnsType<UserVO> = [
    { title: "用户编号", dataIndex: "id", width: 100, align: "center" },
    { title: "用户名称", dataIndex: "username", width: 120 },
    { title: "用户昵称", dataIndex: "nickname", width: 120 },
    { title: "部门", dataIndex: "deptName", width: 120 },
    { title: "手机号码", dataIndex: "phone", width: 120 },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      align: "center",
      render: (status: number) =>
        status === UserStatusEnum.ENABLE ? "正常" : "停用",
    },
    {
      title: "性别",
      dataIndex: "sex",
      width: 80,
      align: "center",
      render: (sex: number) => {
        if (sex === UserSexEnum.MALE) return "男";
        if (sex === UserSexEnum.FEMALE) return "女";
        return "未知";
      },
    },
    {
      title: "最后登录时间",
      dataIndex: "loginDate",
      width: 180,
      align: "center",
      render: (time: string) => {
        if (!time) return "-";
        const date = new Date(time);
        return date.toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
    { title: "备注", dataIndex: "remark", ellipsis: true },
    {
      title: "操作",
      key: "action",
      width: 200,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <>
          <Button type="link" size="small">
            修改
          </Button>
          <Button type="link" size="small">
            重置密码
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
      <div style={{ padding: "16px 16px 0" }}>
        <Form form={form} layout="inline">
          <Form.Item label="用户名称" name="username">
            <Input
              placeholder="请输入用户名称"
              onPressEnter={handleSearch}
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item label="手机号码" name="phone">
            <Input
              placeholder="请输入手机号码"
              onPressEnter={handleSearch}
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select
              placeholder="请选择状态"
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
              <Button type="primary">新增</Button>
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
            </Space>
          </Form.Item>
        </Form>
      </div>

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
    </>
  );
}
