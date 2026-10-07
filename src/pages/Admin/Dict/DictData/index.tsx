import { useState } from 'react';
import {
  App,
  Button,
  Form,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Access from '@/components/Access';
import { permissionConfig } from '@/utils/permissionConfig';
import useTable from '@/hooks/useTable';
import {
  deleteDictData,
  deleteDictDataList,
  getDictDataPage,
  updateDictData,
} from './api';
import type { DictData, DictDataSearchValues } from '../types';
import DictDataFormModal from './FormModal';
import DictDataSearchForm from './SearchForm';
import './index.less';

const dictPermissions = permissionConfig.system.dict;

interface Props {
  open: boolean;
  dictType: string;
  dictTypeName: string;
  onClose: () => void;
}
const DictDataPage = ({ open, dictType, dictTypeName, onClose }: Props) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<DictDataSearchValues>();
  const [modal, setModal] = useState<{
    mode: 'create' | 'update';
    record?: DictData;
  }>();
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(() => new Set());
  const fetchData = async (
    pagination: { pageNo: number; pageSize: number },
    resetPageNo = false,
  ) => {
    const values = form.getFieldsValue();
    const pageNo = resetPageNo ? 1 : pagination.pageNo;
    const { err, data } = await getDictDataPage({
      params: { ...values, dictType, pageNo, pageSize: pagination.pageSize },
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
  } = useTable<true, DictData>({
    hasRowSelection: true,
    hasFetchAuth: open,
    fetchData,
    extraDependencies: [dictType],
  });
  const updateStatus = async (row: DictData) => {
    if (row.id === undefined || updatingIds.has(row.id)) return;
    const id = row.id;
    const status = row.status === 0 ? 1 : 0;
    setUpdatingIds((current) => new Set(current).add(id));
    try {
      const { err } = await updateDictData({
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
  const columns: TableColumnsType<DictData> = [
    { title: '编号', dataIndex: 'id', width: 80, fixed: 'left' },
    {
      title: '字典标签',
      dataIndex: 'label',
      width: 140,
      fixed: 'left',
      ellipsis: true,
    },
    {
      title: '字典键值',
      dataIndex: 'value',
      width: 140,
      fixed: 'left',
      ellipsis: true,
    },
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
                  title={`确认要${nextStatus === 0 ? '启用' : '停用'}字典数据吗？`}
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
    { title: '颜色类型', dataIndex: 'colorType', width: 110 },
    { title: 'CSS Class', dataIndex: 'cssClass', width: 150 },
    { title: '备注', dataIndex: 'remark', width: 180 },
    {
      title: '操作',
      fixed: 'right',
      align: 'center',
      width: 136,
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
          <Access rule={dictPermissions.delete}>
            <Popconfirm
              title="确认删除字典数据？"
              description="删除后不可恢复，请确认操作。"
              okText="确认删除"
              cancelText="取消"
              onConfirm={async () => {
                if (!row.id) return;
                const { err } = await deleteDictData({
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
    const { err } = await deleteDictDataList({
      params: { ids: selectedRows.map((row) => row.id).join(',') },
    });
    if (err) return;
    resetSelectRowKeysFn();
    message.success('批量删除成功');
    handleFetchData({}).catch(() => undefined);
  };
  return (
    <Modal
      className="dictionary-data-modal"
      open={open}
      title={
        <div className="dictionary-modal-title">
          <span>
            字典数据：{dictTypeName}（{dictType}）
          </span>
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
                新增
              </Button>
            </Access>
          </Space>
        </div>
      }
      width={1100}
      centered
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <div className="dictionary-filter">
        <DictDataSearchForm
          form={form}
          doSearch={() => handleFetchData({ resetPageNo: true })}
        />
      </div>
      <div className="dictionary-table-container">
        <Table {...restTableProps} columns={columns} scroll={{ x: 1180 }} />
      </div>
      {modal && (
        <DictDataFormModal
          open
          mode={modal.mode}
          record={modal.record}
          dictType={dictType}
          onCancel={() => setModal(undefined)}
          onSuccess={() => {
            setModal(undefined);
            handleFetchData({}).catch(() => undefined);
          }}
        />
      )}
    </Modal>
  );
};
export default DictDataPage;
