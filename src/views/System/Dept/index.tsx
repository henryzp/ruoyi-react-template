import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import { buildTree, searchTree } from "@/utils/helper";
import { highlightText } from "@/utils/highlight";
import EditModal from "./EditModal";
import useCalcTableHeight from "@/hooks/useCalcTableHeight";

export default function Dept() {
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false); // 搜索时的 loading 状态
  const [deptList, setDeptList] = useState<DeptVO[]>([]);
  const [filteredDeptList, setFilteredDeptList] = useState<DeptVO[]>([]);
  const filteredDeptListRef = useRef<DeptVO[]>([]); // 用于在 MessageChannel 中访问最新数据
  const [highlightKeyword, setHighlightKeyword] = useState(""); // 只用于高亮显示
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<any>(null);

  // 编辑弹窗状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDeptId, setEditDeptId] = useState<number | undefined>(undefined);

  // 计算表格内容区高度
  const tableScrollY = useCalcTableHeight(tableContainerRef);

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
  const fetchDeptList = useCallback(async () => {
    setLoading(true);
    const { data, err } = await getDeptList({ params: {} });
    setLoading(false);

    if (err) {
      message.error("加载部门列表失败");
      return;
    }

    if (data) {
      // 构建树形结构（buildTree 已内置清理空 children 功能）
      const treeData = buildTree(data);
      setDeptList(treeData);
      setFilteredDeptList(treeData);
      // 清空选中状态
      setSelectedRowKeys([]);
    }
  }, []);

  useEffect(() => {
    fetchDeptList();
  }, [fetchDeptList]);

  // 同步 filteredDeptList 到 ref
  useEffect(() => {
    filteredDeptListRef.current = filteredDeptList;
  }, [filteredDeptList]);

  // 当 deptList 变化时，只展开第一层节点（提升性能）
  useEffect(() => {
    // 只展开根节点的直接子节点，而不是展开所有节点
    const firstLevelIds = deptList
      .filter(dept => dept.children && dept.children.length > 0)
      .map(dept => dept.id!);
    setExpandedRowKeys(firstLevelIds);
  }, [deptList]);

  // 搜索部门
  const handleSearch = useCallback(() => {
    const value = searchInputRef.current?.input?.value?.trim() || "";

    if (!value) {
      setFilteredDeptList(deptList);
      setHighlightKeyword("");
      // 只展开第一层节点，提升性能
      const firstLevelIds = deptList
        .filter(dept => dept.children && dept.children.length > 0)
        .map(dept => dept.id!);
      setExpandedRowKeys(firstLevelIds);
      setSelectedRowKeys([]);
      return;
    }

    // 判断是否为大数据量（≥ 500 条）
    const isLargeDataset = deptList.length >= 500;

    if (!isLargeDataset) {
      // 小数据量：直接执行，不显示 loading（最快）
      const filteredData = searchTree({
        treeData: deptList,
        searchValue: value,
        nameField: "name",
      });

      if (filteredData.length === 0) {
        setFilteredDeptList([]);
        setHighlightKeyword(value);
        setExpandedRowKeys([]);
        setSelectedRowKeys([]);
      } else {
        setFilteredDeptList(filteredData);
        setHighlightKeyword(value);
        const parentIds = getParentIds(filteredData);
        setExpandedRowKeys(parentIds);
        setSelectedRowKeys([]);
      }
    } else {
      // 大数据量：使用 MessageChannel 让出主线程，确保 UI 能够渲染 loading 状态
      setSearchLoading(true);

      const channel = new MessageChannel();
      channel.port2.onmessage = () => {
        const filteredData = searchTree({
          treeData: deptList,
          searchValue: value,
          nameField: "name",
        });

        if (filteredData.length === 0) {
          setFilteredDeptList([]);
          setHighlightKeyword(value);
          setExpandedRowKeys([]);
          setSelectedRowKeys([]);
        } else {
          setFilteredDeptList(filteredData);
          setHighlightKeyword(value);
          const parentIds = getParentIds(filteredData);
          setExpandedRowKeys(parentIds);
          setSelectedRowKeys([]);
        }

        setSearchLoading(false);
        channel.port1.close();
        channel.port2.close();
      };
      channel.port1.postMessage(null);
    }
  }, [deptList]);

  // 重置搜索
  const handleReset = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.input.value = "";
    }
    setHighlightKeyword("");
    setFilteredDeptList(deptList);
    // 只展开第一层节点，提升性能
    const firstLevelIds = deptList
      .filter(dept => dept.children && dept.children.length > 0)
      .map(dept => dept.id!);
    setExpandedRowKeys(firstLevelIds);
    setSelectedRowKeys([]);
  }, [deptList]);

  // 打开新增弹窗
  const handleOpenCreate = useCallback(() => {
    setEditDeptId(undefined);
    setEditModalVisible(true);
  }, []);

  // 关闭编辑弹窗
  const handleCloseEditModal = useCallback(() => {
    setEditModalVisible(false);
    setEditDeptId(undefined);
  }, []);

  // 编辑成功回调
  const handleEditSuccess = useCallback(() => {
    fetchDeptList();
  }, [fetchDeptList]);

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
  const handleDeleteBatch = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请选择要删除的数据");
      return;
    }

    Modal.confirm({
      title: "确认删除",
      content: `确定要删除选中的 ${selectedRowKeys.length} 条数据吗？删除后子部门也会被删除`,
      onOk: async () => {
        // 获取选中的部门对象（使用 ref 获取最新数据）
        const selectedDepts = getSelectedDepts(selectedRowKeys, filteredDeptListRef.current);
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
  }, [selectedRowKeys, fetchDeptList]);

  // 使用 useMemo 缓存 columns，避免每次渲染都重新创建
  const columns: ColumnsType<DeptVO> = useMemo(() => [
    {
      title: "部门名称",
      dataIndex: "name",
      key: "name",
      width: 300,
      render: (name: string, record: any) => {
        // 兼容 name 和 deptName 字段
        const displayName = record.deptName || record.name || name;

        // 每次渲染时读取最新的 highlightKeyword（通过 state）
        return highlightText(displayName, highlightKeyword);
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
            onClick={() => {
              setEditDeptId(record.id!);
              setEditModalVisible(true);
            }}
          >
            修改
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条数据吗？删除后子部门也会被删除"
            onConfirm={async () => {
              const { err } = await deleteDept({ params: { id: record.id! } });
              if (err) {
                message.error("删除失败");
              } else {
                message.success("删除成功");
                fetchDeptList();
              }
            }}
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
  ], [highlightKeyword]); // highlightKeyword 变化时重新创建 columns，但不依赖函数

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
            ref={searchInputRef}
            onPressEnter={handleSearch}
          />
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
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
          loading={loading || searchLoading}
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
