import { useState, useEffect, useRef } from "react";
import { Button, Table, message, Popconfirm, Modal, Input, Space, Card } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  getDeptList,
  deleteDept,
  deleteDeptList,
  type DeptVO,
  DeptStatusEnum,
} from "./api";
import { buildDeptTree, searchDeptTree } from "@/utils/helper";
import EditModal from "./EditModal";
import useCalcTableHeight from "@/hooks/useCalcTableHeight";

export default function Dept() {
  const [loading, setLoading] = useState(false);
  const [deptList, setDeptList] = useState<DeptVO[]>([]);
  const [filteredDeptList, setFilteredDeptList] = useState<DeptVO[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // 编辑弹窗状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDeptId, setEditDeptId] = useState<number | undefined>(undefined);

  // 计算表格内容区高度
  const tableScrollY = useCalcTableHeight(tableContainerRef);

  // 清理空的 children 数组
  const cleanEmptyChildren = (depts: DeptVO[]): DeptVO[] => {
    return depts.map((dept) => ({
      ...dept,
      children: dept.children && dept.children.length > 0
        ? cleanEmptyChildren(dept.children)
        : undefined,
    }));
  };

  // 获取所有有子节点的部门ID
  const getParentIds = (depts: DeptVO[]): number[] => {
    const ids: number[] = [];
    for (const dept of depts) {
      if (dept.children && dept.children.length > 0) {
        ids.push(dept.id!);
        ids.push(...getParentIds(dept.children));
      }
    }
    return ids;
  };

  // 加载部门列表
  const fetchDeptList = async () => {
    setLoading(true);
    const { data, err } = await getDeptList({ params: {} });
    setLoading(false);

    if (err) {
      message.error("加载部门列表失败");
      return;
    }

    if (data) {
      // 构建树形结构
      const treeData = buildDeptTree(data);
      // 清理空的 children 数组
      const cleanedData = cleanEmptyChildren(treeData);
      setDeptList(cleanedData);
      setFilteredDeptList(cleanedData);
      // 设置默认展开所有有子节点的部门
      const parentIds = getParentIds(cleanedData);
      setExpandedRowKeys(parentIds);
      // 清空选中状态
      setSelectedRowKeys([]);
    }
  };

  useEffect(() => {
    fetchDeptList();
  }, []);

  // 搜索部门
  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (!value) {
      setFilteredDeptList(deptList);
      // 重置展开的行
      const parentIds = getParentIds(deptList);
      setExpandedRowKeys(parentIds);
      setSelectedRowKeys([]);
      return;
    }

    // 使用公共的部门树搜索函数
    const filteredData = searchDeptTree({
      treeData: deptList,
      searchValue: value,
      nameField: "name",
    });

    if (filteredData.length === 0) {
      setFilteredDeptList([]);
      setExpandedRowKeys([]);
      setSelectedRowKeys([]);
      return;
    }

    setFilteredDeptList(filteredData);
    // 更新展开的行
    const parentIds = getParentIds(filteredData);
    setExpandedRowKeys(parentIds);
    // 清空选中状态
    setSelectedRowKeys([]);
  };

  // 重置搜索
  const handleReset = () => {
    setSearchValue("");
    setFilteredDeptList(deptList);
    // 重置展开的行
    const parentIds = getParentIds(deptList);
    setExpandedRowKeys(parentIds);
    // 清空选中状态
    setSelectedRowKeys([]);
  };

  // 打开新增弹窗
  const handleOpenCreate = () => {
    setEditDeptId(undefined);
    setEditModalVisible(true);
  };

  // 打开修改弹窗
  const handleOpenUpdate = (id: number) => {
    setEditDeptId(id);
    setEditModalVisible(true);
  };

  // 关闭编辑弹窗
  const handleCloseEditModal = () => {
    setEditModalVisible(false);
    setEditDeptId(undefined);
  };

  // 编辑成功回调
  const handleEditSuccess = () => {
    fetchDeptList();
  };

  // 删除单条
  const handleDelete = async (id: number) => {
    const { err } = await deleteDept({ params: { id } });
    if (err) {
      message.error("删除失败");
    } else {
      message.success("删除成功");
      fetchDeptList();
    }
  };

  // 获取所有选中的部门ID（包括子部门）
  const getAllChildIds = (depts: DeptVO[]): number[] => {
    const ids: number[] = [];
    for (const dept of depts) {
      ids.push(dept.id!);
      if (dept.children && dept.children.length > 0) {
        ids.push(...getAllChildIds(dept.children));
      }
    }
    return ids;
  };

  // 根据选中的keys获取完整的部门对象
  const getSelectedDepts = (selectedKeys: React.Key[], depts: DeptVO[]): DeptVO[] => {
    const result: DeptVO[] = [];
    for (const dept of depts) {
      if (selectedKeys.includes(dept.id!)) {
        result.push(dept);
      }
      if (dept.children && dept.children.length > 0) {
        result.push(...getSelectedDepts(selectedKeys, dept.children));
      }
    }
    return result;
  };

  // 批量删除
  const handleDeleteBatch = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请选择要删除的数据");
      return;
    }

    Modal.confirm({
      title: "确认删除",
      content: `确定要删除选中的 ${selectedRowKeys.length} 条数据吗？删除后子部门也会被删除`,
      onOk: async () => {
        // 获取选中的部门对象
        const selectedDepts = getSelectedDepts(selectedRowKeys, filteredDeptList);
        // 获取所有要删除的ID（包括子部门）
        const allIds = getAllChildIds(selectedDepts);
        const { err } = await deleteDeptList({
          params: { ids: allIds.join(",") },
        });
        if (err) {
          message.error("删除失败");
        } else {
          message.success("删除成功");
          setSelectedRowKeys([]);
          fetchDeptList();
        }
      },
    });
  };

  const columns: ColumnsType<DeptVO> = [
    {
      title: "部门名称",
      dataIndex: "name",
      key: "name",
      width: 300,
      render: (name: string, record: any) => {
        // 兼容 name 和 deptName 字段
        const displayName = record.deptName || record.name || name;

        // 高亮搜索关键词
        if (searchValue && displayName.toLowerCase().includes(searchValue.toLowerCase())) {
          const regex = new RegExp(`(${searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          const parts = displayName.split(regex);
          return (
            <>
              {parts.map((part, index) =>
                regex.test(part) ? (
                  <span key={index} style={{ backgroundColor: '#ffd54f', padding: '0 2px', borderRadius: 2 }}>
                    {part}
                  </span>
                ) : (
                  <span key={index}>{part}</span>
                )
              )}
            </>
          );
        }

        return displayName;
      },
    },
    {
      title: "排序",
      dataIndex: "sort",
      width: 80,
      align: "center",
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      align: "center",
      render: (status: number) =>
        status === DeptStatusEnum.ENABLE ? "正常" : "停用",
    },
    {
      title: "负责人",
      dataIndex: "leader",
      width: 120,
    },
    {
      title: "联系电话",
      dataIndex: "phone",
      width: 140,
    },
    {
      title: "邮箱",
      dataIndex: "email",
      width: 200,
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      width: 180,
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
            description="确定要删除这条数据吗？删除后子部门也会被删除"
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
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* 顶部操作栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="请输入部门名称"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 240 }}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            onPressEnter={() => handleSearch(searchValue)}
          />
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            新增
          </Button>
          <Button danger disabled={selectedRowKeys.length === 0} onClick={handleDeleteBatch}>
            批量删除
          </Button>
        </Space>
      </Card>

      {/* 数据表格 */}
      <div
        ref={tableContainerRef}
        style={{ flex: 1, overflow: "hidden" }}
      >
        <Table
          columns={columns}
          dataSource={filteredDeptList}
          loading={loading}
          rowKey="id"
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys),
          }}
          expandedRowKeys={expandedRowKeys}
          onExpand={(expanded, record) => {
            if (expanded) {
              setExpandedRowKeys([...expandedRowKeys, record.id!]);
            } else {
              setExpandedRowKeys(expandedRowKeys.filter((key) => key !== record.id));
            }
          }}
          scroll={{ x: "max-content", y: tableScrollY || undefined }}
        />
      </div>

      {/* 部门编辑弹窗 */}
      <EditModal
        visible={editModalVisible}
        deptId={editDeptId}
        onCancel={handleCloseEditModal}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
