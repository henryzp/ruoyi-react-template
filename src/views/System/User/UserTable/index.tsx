import { useEffect, useRef, useState } from "react";
import { Form, Button, Table, message, Popconfirm, Modal } from "antd";
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
} from "../api";
import { exportFile } from "@/utils/download";
import useTable from "@/hooks/useTable";
import useCalcTableHeight from "@/hooks/useCalcTableHeight";
import EditModal from "./EditModal";
import ResetPasswordModal from "./ResetPasswordModal";
import SearchForm, { type SearchFormItem } from "@/components/SearchForm";

interface UserTableProps {
  /** 部门ID（用于筛选该部门下的用户） */
  deptId?: number;
}

// 状态选项
const STATUS_OPTIONS = [
  { label: "正常", value: UserStatusEnum.ENABLE },
  { label: "停用", value: UserStatusEnum.DISABLE },
];

// 搜索表单项配置
const SEARCH_FORM_ITEMS: SearchFormItem[] = [
  {
    type: "input",
    label: "用户名称",
    name: "username",
    placeholder: "请输入用户名称",
    style: { width: 180 },
  },
  {
    type: "input",
    label: "手机号码",
    name: "phone",
    placeholder: "请输入手机号码",
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

export default function UserTable({ deptId }: UserTableProps) {
  const [form] = Form.useForm();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // 编辑弹窗状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUserId, setEditUserId] = useState<number | undefined>(undefined);

  // 重置密码弹窗状态
  const [resetPwdModalVisible, setResetPwdModalVisible] = useState(false);
  const [resetPwdUserId, setResetPwdUserId] = useState<number | undefined>(
    undefined,
  );
  const [resetPwdUsername, setResetPwdUsername] = useState<string>("");

  // 计算表格内容区高度
  const tableScrollY = useCalcTableHeight(tableContainerRef);

  // 使用 useTable hook
  const tableProps = useTable<true>({
    fetchData: async (pagination) => {
      // 获取搜索表单的值
      const formValues = form.getFieldsValue();
      const params: UserPageParam = {
        pageNo: pagination.pageNo,
        pageSize: pagination.pageSize,
        deptId,
        username: formValues.username || undefined,
        phone: formValues.phone || undefined,
        status: formValues.status,
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

  // 打开新增弹窗
  const handleOpenCreate = () => {
    setEditUserId(undefined);
    setEditModalVisible(true);
  };

  // 打开修改弹窗
  const handleOpenUpdate = (id: number) => {
    setEditUserId(id);
    setEditModalVisible(true);
  };

  // 关闭编辑弹窗
  const handleCloseEditModal = () => {
    setEditModalVisible(false);
    setEditUserId(undefined);
  };

  // 编辑成功回调
  const handleEditSuccess = () => {
    tableProps.handleFetchData({});
  };

  // 打开重置密码弹窗
  const handleOpenResetPwd = (record: UserVO) => {
    setResetPwdUserId(record.id);
    setResetPwdUsername(record.nickname);
    setResetPwdModalVisible(true);
  };

  // 关闭重置密码弹窗
  const handleCloseResetPwdModal = () => {
    setResetPwdModalVisible(false);
    setResetPwdUserId(undefined);
    setResetPwdUsername("");
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
            onClick={() => handleOpenResetPwd(record)}
          >
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

      {/* 用户编辑弹窗 */}
      <EditModal
        visible={editModalVisible}
        userId={editUserId}
        onCancel={handleCloseEditModal}
        onSuccess={handleEditSuccess}
      />

      {/* 重置密码弹窗 */}
      <ResetPasswordModal
        visible={resetPwdModalVisible}
        userId={resetPwdUserId}
        username={resetPwdUsername}
        onCancel={handleCloseResetPwdModal}
      />
    </>
  );
}
