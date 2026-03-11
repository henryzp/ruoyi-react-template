import { useState, useEffect, useCallback, useRef } from "react";
import { Input, Tree, Spin, message } from "antd";
import type { TreeDataNode, TreeProps } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { getDeptTree, type DeptVO, DeptStatusEnum } from "./api";
import { buildDeptTree, debounce } from "@/utils/helper";

interface DepartmentTreeProps {
  /** 部门选择回调 */
  onSelect: (deptId: number | undefined, deptName: string) => void;
}

/**
 * 将部门数据转换为 Tree 组件需要的数据格式
 */
function convertToTreeData(depts: DeptVO[]): TreeDataNode[] {
  return depts.map((dept) => ({
    key: dept.id!,
    title: dept.deptName,
    children: dept.children ? convertToTreeData(dept.children) : undefined,
    isLeaf: !dept.children || dept.children.length === 0,
    // 停用的部门显示为灰色
    disabled: dept.status === DeptStatusEnum.DISABLE,
  }));
}

/**
 * 在树中搜索包含关键词的节点
 */
function searchInTree(
  treeData: TreeDataNode[],
  searchValue: string,
): TreeDataNode[] {
  const result: TreeDataNode[] = [];

  for (const node of treeData) {
    const title = String(node.title);
    const children = node.children as TreeDataNode[];

    if (title.toLowerCase().includes(searchValue.toLowerCase())) {
      // 当前节点匹配，保留整个子树
      result.push({
        ...node,
        children: children ? searchInTree(children, searchValue) : undefined,
      });
    } else if (children && children.length > 0) {
      // 当前节点不匹配，但子节点中有匹配的
      const matchedChildren = searchInTree(children, searchValue);
      if (matchedChildren.length > 0) {
        result.push({
          ...node,
          children: matchedChildren,
        });
      }
    }
  }

  return result;
}

export default function DepartmentTree({ onSelect }: DepartmentTreeProps) {
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();

  // 保存原始树数据，用于搜索过滤
  const originalTreeDataRef = useRef<TreeDataNode[]>([]);

  // 加载部门树数据
  useEffect(() => {
    const fetchDeptTree = async () => {
      setLoading(true);
      const { data, err } = await getDeptTree({ params: {} });
      setLoading(false);

      if (err || !data) {
        message.error("加载部门树失败");
        return;
      }

      // 将平铺结构转换为树形结构
      const treeData = buildDeptTree(data);
      const convertedData = convertToTreeData(treeData);
      originalTreeDataRef.current = convertedData;
      setTreeData(convertedData);
    };

    fetchDeptTree();
  }, []);

  // 防抖搜索函数
  const performSearch = useCallback((value: string) => {
    if (!value) {
      setTreeData(originalTreeDataRef.current);
    } else {
      const filteredData = searchInTree(originalTreeDataRef.current, value);
      setTreeData(filteredData);
    }
  }, []);

  // 防抖函数的 ref
  const debouncedSearchRef = useRef<((value: string) => void) | null>(null);

  // 创建防抖函数
  useEffect(() => {
    debouncedSearchRef.current = debounce(performSearch, 300);
  }, [performSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearchRef.current?.(e.target.value);
  };

  // 处理树节点选择
  const handleSelect: TreeProps["onSelect"] = (selectedKeys, info) => {
    const key = selectedKeys[0] as string | undefined;
    setSelectedKey(key);

    if (key) {
      const deptId = parseInt(key, 10);
      const deptName = info.node.title as string;
      onSelect(deptId, deptName);
    } else {
      onSelect(undefined, "全部用户");
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "16px 0",
      }}
    >
      {/* 搜索框 */}
      <div style={{ padding: "0 16px 16px" }}>
        <Input
          placeholder="搜索部门"
          prefix={<SearchOutlined />}
          allowClear
          onChange={handleSearchChange}
        />
      </div>

      {/* 部门树 */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 8px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : (
          <Tree
            treeData={treeData}
            selectedKeys={selectedKey ? [selectedKey] : []}
            onSelect={handleSelect}
            showLine={{ showLeafIcon: false }}
            defaultExpandAll
            blockNode
          />
        )}
      </div>
    </div>
  );
}
