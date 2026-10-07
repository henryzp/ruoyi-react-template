import { useState } from 'react';
import { App, Button, Form, Popconfirm, Space, Switch, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import Access from '@/components/Access';
import { permissionConfig } from '@/utils/permissionConfig';
import useCalcTableHeight from '@/hooks/useCalcTableHeight';
import useTable from '@/hooks/useTable';
import {
  deleteDictType,
  deleteDictTypeList,
  getDictTypePage,
  updateDictType,
} from './api';
import type { DictType, DictTypeSearchValues } from '../types';
import DictTypeFormModal from './FormModal';
import DictTypeSearchForm from './SearchForm';
import './index.less';

const dictPermissions = permissionConfig.system.dict;

interface Props {
  onManageData: (type: DictType) => void;
}
const DictTypePage = ({ onManageData }: Props) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<DictTypeSearchValues>();
  const { tableRef, tableScrollY } = useCalcTableHeight();
  const [modal, setModal] = useState<{
    mode: 'create' | 'update';
    record?: DictType;
  }>();
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(() => new Set());
  const fetchData = async (
    pagination: { pageNo: number; pageSize: number },
    resetPageNo = false,
  ) => {
    const values = form.getFieldsValue();
    const pageNo = resetPageNo ? 1 : pagination.pageNo;
    const { err, data } = await getDictTypePage({
      params: { ...values, pageNo, pageSize: pagination.pageSize },
    });
    return {
      err,
      data: data
        ? {
            records: data.list,
            size: pagination.pageSize,
            current: pageNo,
            total: data.total,
          }
        : undefined,
    };
  };
  const {
    handleFetchData,
    selectedRows,
    resetSelectRowKeysFn,
    ...restTableProps
  } = useTable<true, DictType>({
    hasRowSelection: true,
    fetchData,
  });
  const updateStatus = async (row: DictType) => {
    if (row.id === undefined || updatingIds.has(row.id)) return;
    const id = row.id;
    const status = row.status === 0 ? 1 : 0;
    setUpdatingIds((current) => new Set(current).add(id));
    try {
      const { err } = await updateDictType({
        data: { ...row, status },
      });
      if (err) {
        message.error('状态更新失败');
        return;
      }
      message.success(status === 0 ? '启用成功' : '停用成功');
      await handleFetchData({});
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };
  const columns: TableColumnsType<DictType> = [
    { title: '编号', dataIndex: 'id', width: 80 },
    { title: '字典名称', dataIndex: 'name', width: 160 },
    { title: '字典类型', dataIndex: 'type', width: 220 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, row) => {
        const nextStatus = row.status === 0 ? 1 : 0;
        const isUpdating = row.id !== undefined && updatingIds.has(row.id);
        return (
          <span className="no-row-click">
            <Access rule={dictPermissions.update}>
              {({ allowed }) => (
                <Popconfirm
                  disabled={!allowed}
                  title={`确认要${nextStatus === 0 ? '启用' : '停用'}字典类型吗？`}
                  okText="确认"
                  cancelText="取消"
                  onConfirm={() => updateStatus(row)}
                >
                  <Switch
                    checked={row.status === 0}
                    loading={isUpdating}
                    disabled={!allowed || isUpdating}
                  />
                </Popconfirm>
              )}
            </Access>
          </span>
        );
      },
    },
    { title: '备注', dataIndex: 'remark', width: 220 },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      render: (value?: string) =>
        value && dayjs(value).isValid()
          ? dayjs(value).format('YYYY-MM-DD HH:mm')
          : '-',
    },
    {
      title: '操作',
      fixed: 'right',
      align: 'center',
      width: 200,
      render: (_, row) => (
        <Space size={12}>
          <Access rule={dictPermissions.update}>
            <Button
              className="dictionary-action-button"
              size="small"
              color="primary"
              variant="outlined"
              onClick={() => setModal({ mode: 'update', record: row })}
            >
              编辑
            </Button>
          </Access>
          <Button
            className="dictionary-action-button"
            size="small"
            color="cyan"
            variant="outlined"
            onClick={() => onManageData(row)}
          >
            数据
          </Button>
          <Access rule={dictPermissions.delete}>
            <Popconfirm
              title="确认删除字典类型？"
              description="关联字典数据也会被级联删除，请确认。"
              okText="确认删除"
              cancelText="取消"
              onConfirm={async () => {
                if (!row.id) return;
                const { err } = await deleteDictType({
                  params: { id: row.id },
                });
                if (err) return;
                message.success('删除成功');
                handleFetchData({}).catch(() => undefined);
              }}
            >
              <Button
                className="dictionary-action-button"
                size="small"
                color="danger"
                variant="outlined"
              >
                删除
              </Button>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ];
  const batchDelete = async () => {
    if (!selectedRows.length) return message.warning('请选择要删除的数据');
    const { err } = await deleteDictTypeList({
      params: { ids: selectedRows.map((row) => row.id).join(',') },
    });
    if (err) return;
    resetSelectRowKeysFn();
    message.success('批量删除成功');
    handleFetchData({}).catch(() => undefined);
  };
  return (
    <section className="admin-dictionaries-page">
      <div className="admin-panel dictionary-top-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>字典管理</h2>
            <p>维护系统字典类型及其枚举数据</p>
          </div>
          <Space>
            <Access rule={dictPermissions.delete}>
              <Button
                danger
                disabled={!selectedRows.length}
                onClick={batchDelete}
              >
                批量删除
              </Button>
            </Access>
            <Access rule={dictPermissions.create}>
              <Button
                className="navy-gradient-button"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setModal({ mode: 'create' })}
              >
                新增字典类型
              </Button>
            </Access>
          </Space>
        </div>
        <div className="dictionary-filter">
          <DictTypeSearchForm
            form={form}
            doSearch={() => handleFetchData({ resetPageNo: true })}
          />
        </div>
      </div>
      <div className="admin-panel dictionary-table-panel">
        <div className="dictionary-table-container" ref={tableRef}>
          <Table
            {...restTableProps}
            columns={columns}
            scroll={{
              x: 1200,
              y: tableScrollY > 0 ? tableScrollY : undefined,
            }}
          />
        </div>
      </div>
      {modal && (
        <DictTypeFormModal
          open
          mode={modal.mode}
          record={modal.record}
          onCancel={() => setModal(undefined)}
          onSuccess={() => {
            setModal(undefined);
            handleFetchData({}).catch(() => undefined);
          }}
        />
      )}
    </section>
  );
};
export default DictTypePage;
