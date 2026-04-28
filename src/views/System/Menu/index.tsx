import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button, Table, message, Popconfirm, Input, Space, Card, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  getMenuList,
  deleteMenu,
  type MenuVO,
  MenuTypeEnum,
} from "./api";
import { buildTree, searchTree } from "@/utils/helper";
import { highlightText } from "@/utils/highlight";
import EditModal from "./EditModal";
import useCalcTableHeight from "@/hooks/useCalcTableHeight";

/**
 * 菜单类型标签颜色映射
 */
const MENU_TYPE_COLOR_MAP: Record<string, string> = {
  [MenuTypeEnum.DIR]: "blue",
  [MenuTypeEnum.MENU]: "green",
  [MenuTypeEnum.BUTTON]: "orange",
};

/**
 * 菜单类型标签文字映射
 */
const MENU_TYPE_LABEL_MAP: Record<string, string> = {
  [MenuTypeEnum.DIR]: "目录",
  [MenuTypeEnum.MENU]: "菜单",
  [MenuTypeEnum.BUTTON]: "按钮",
};

export default function Menu() {
  const [loading, setLoading] = useState(false);
  const [menuList, setMenuList] = useState<MenuVO[]>([]);
  const [filteredMenuList, setFilteredMenuList] = useState<MenuVO[]>([]);
  const [highlightKeyword, setHighlightKeyword] = useState("");
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<any>(null);

  // 编辑弹窗状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMenuId, setEditMenuId] = useState<number | undefined>(undefined);

  // 计算表格内容区高度
  const tableScrollY = useCalcTableHeight(tableContainerRef);

  // 获取所有有子节点的菜单ID
  // 注意：这是递归函数，不能用 useCallback 包装
  const getParentIds = (menus: MenuVO[]): number[] => {
    const ids: number[] = [];
    for (const menu of menus) {
      if (menu.children && menu.children.length > 0) {
        ids.push(menu.id!);
        ids.push(...getParentIds(menu.children));
      }
    }
    return ids;
  };

  // 加载菜单列表
  const fetchMenuList = useCallback(async () => {
    setLoading(true);
    const { data, err } = await getMenuList({ params: {} });
    setLoading(false);

    if (err) {
      message.error("加载菜单列表失败");
      return;
    }

    if (data) {
      console.time('[Menu] 数据处理总耗时');
      console.log('[Menu] 原始数据量:', data.length);

      // 构建树形结构（buildTree 已内置清理空 children 功能）
      const treeData = buildTree(data);
      console.log('[Menu] buildTree 完成');

      console.time('[Menu] getParentIds 计算展开行');
      const parentIds = getParentIds(treeData);
      console.timeEnd('[Menu] getParentIds 计算展开行');
      console.log('[Menu] 展开行数:', parentIds.length);

      console.time('[Menu] setState 触发渲染');
      setMenuList(treeData);
      setFilteredMenuList(treeData);
      console.timeEnd('[Menu] setState 触发渲染');

      console.timeEnd('[Menu] 数据处理总耗时');
    }
  }, []);

  useEffect(() => {
    fetchMenuList();
  }, []);

  // 当 menuList 变化时，只展开第一层节点（提升性能）
  useEffect(() => {
    console.time('[Menu] 设置展开行');
    // 只展开根节点的直接子节点，而不是展开所有节点
    const firstLevelIds = menuList
      .filter(menu => menu.children && menu.children.length > 0)
      .map(menu => menu.id!);
    setExpandedRowKeys(firstLevelIds);
    console.timeEnd('[Menu] 设置展开行');
  }, [menuList]);

  // 搜索菜单
  const handleSearch = useCallback(() => {
    const value = searchInputRef.current?.input?.value?.trim() || "";

    if (!value) {
      setFilteredMenuList(menuList);
      setHighlightKeyword("");
      // 只展开第一层节点，提升性能
      const firstLevelIds = menuList
        .filter(menu => menu.children && menu.children.length > 0)
        .map(menu => menu.id!);
      setExpandedRowKeys(firstLevelIds);
      return;
    }

    // 小数据量：直接执行，不显示 loading（最快）
    const filteredData = searchTree({
      treeData: menuList,
      searchValue: value,
      nameField: "name",
    });

    if (filteredData.length === 0) {
      setFilteredMenuList([]);
      setHighlightKeyword(value);
      setExpandedRowKeys([]);
    } else {
      setFilteredMenuList(filteredData);
      setHighlightKeyword(value);
      const parentIds = getParentIds(filteredData);
      setExpandedRowKeys(parentIds);
    }
  }, [menuList]);

  // 重置搜索
  const handleReset = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.input.value = "";
    }
    setHighlightKeyword("");
    setFilteredMenuList(menuList);
    // 只展开第一层节点，提升性能
    const firstLevelIds = menuList
      .filter(menu => menu.children && menu.children.length > 0)
      .map(menu => menu.id!);
    setExpandedRowKeys(firstLevelIds);
  }, [menuList]);

  // 打开新增弹窗
  const handleOpenCreate = useCallback(() => {
    setEditMenuId(undefined);
    setEditModalVisible(true);
  }, []);

  // 关闭编辑弹窗
  const handleCloseEditModal = useCallback(() => {
    setEditModalVisible(false);
    setEditMenuId(undefined);
  }, []);

  // 编辑成功回调
  const handleEditSuccess = useCallback(() => {
    fetchMenuList();
  }, [fetchMenuList]);

  // 使用 useMemo 缓存 columns，避免每次渲染都重新创建
  const columns: ColumnsType<MenuVO> = useMemo(() => [
    {
      title: "菜单名称",
      dataIndex: "name",
      key: "name",
      width: 250,
      render: (name) => {
        // 每次渲染时读取最新的 highlightKeyword（通过 state）
        return highlightText(name, highlightKeyword);
      },
    },
    {
      title: "类型",
      dataIndex: "type",
      width: 80,
      align: "center",
      render: (type: string) => (
        <Tag color={MENU_TYPE_COLOR_MAP[type]}>
          {MENU_TYPE_LABEL_MAP[type]}
        </Tag>
      ),
    },
    {
      title: "图标",
      dataIndex: "icon",
      width: 100,
      align: "center",
      render: (icon: string) => icon || "-",
    },
    {
      title: "排序",
      dataIndex: "sort",
      width: 80,
      align: "center",
    },
    {
      title: "权限标识",
      dataIndex: "permission",
      width: 180,
      ellipsis: true,
      render: (permission: string) => permission || "-",
    },
    {
      title: "路由地址",
      dataIndex: "path",
      width: 200,
      ellipsis: true,
      render: (path: string) => path || "-",
    },
    {
      title: "组件路径",
      dataIndex: "component",
      width: 200,
      ellipsis: true,
      render: (component: string) => component || "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      align: "center",
      render: (status: string) => {
        if (status === "0") return <Tag color="success">正常</Tag>;
        if (status === "1") return <Tag color="error">停用</Tag>;
        return "-";
      },
    },
    {
      title: "可见",
      dataIndex: "visible",
      width: 80,
      align: "center",
      render: (visible: boolean) => {
        if (visible) return <Tag color="success">显示</Tag>;
        if (visible === false) return <Tag color="default">隐藏</Tag>;
        return "-";
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
              setEditMenuId(record.id!);
              setEditModalVisible(true);
            }}
          >
            修改
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条数据吗？删除后子菜单也会被删除"
            onConfirm={async () => {
              const { err } = await deleteMenu({ params: { id: record.id! } });
              if (err) {
                message.error("删除失败");
              } else {
                message.success("删除成功");
                fetchMenuList();
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
            placeholder="请输入菜单名称"
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
        </Space>
      </Card>

      {/* 数据表格 */}
      <div
        ref={tableContainerRef}
        style={{ flex: 1, overflow: "hidden" }}
      >
        <Table
          columns={columns}
          dataSource={filteredMenuList}
          loading={loading}
          rowKey="id"
          pagination={false}
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

      {/* 菜单编辑弹窗 */}
      <EditModal
        visible={editModalVisible}
        menuId={editMenuId}
        onCancel={handleCloseEditModal}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
