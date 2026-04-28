import { useState, useEffect, useRef, useMemo } from "react";
import { Input, Tree, Spin, message } from "antd";
import type { TreeDataNode, TreeProps } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { getDeptTree, type DeptVO, DeptStatusEnum } from "./api";
import { buildTree, searchTree } from "@/utils/helper";
import { highlightText } from "@/utils/highlight";

interface DepartmentTreeProps {
  /** 部门选择回调 */
  onSelect: (deptId: number | undefined, deptName: string) => void;
}

/**
 * 将部门数据转换为 Tree 组件需要的数据格式
 * @param depts 部门数据
 * @param searchValue 搜索关键词（用于高亮）
 */
function convertToTreeData(depts: DeptVO[], searchValue?: string): TreeDataNode[] {
  return depts.map((dept) => {
    // 兼容后端的 name 字段和前端的 deptName 字段
    const displayName = dept.name || dept.deptName || "";
    return {
      key: dept.id!,
      title: displayName, // 不在这里做高亮，在 Tree 的 titleRender 中做
      children: dept.children ? convertToTreeData(dept.children, searchValue) : undefined,
      isLeaf: !dept.children || dept.children.length === 0,
      // 停用的部门显示为灰色
      disabled: dept.status === DeptStatusEnum.DISABLE,
      deptName: displayName, // 保存原始名称用于高亮
    };
  });
}

export default function DepartmentTree({ onSelect }: DepartmentTreeProps) {
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [highlightKeyword, setHighlightKeyword] = useState<string>("");

  // 保存原始树数据，用于搜索过滤
  const originalTreeDataRef = useRef<DeptVO[]>([]);
  const searchInputRef = useRef<any>(null);

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

      console.time('[DepartmentTree] 总耗时');
      console.log('[DepartmentTree] 原始数据量:', data.length);

      // 将平铺结构转换为树形结构
      const treeData = buildTree(data);
      console.log('[DepartmentTree] buildTree 完成，树节点数:', treeData.length);

      originalTreeDataRef.current = treeData;

      // 直接转换为 TreeDataNode 格式（避免二次遍历）
      console.time('[DepartmentTree] 转换为 TreeDataNode 格式');
      const convertedData = convertToTreeData(treeData);
      console.timeEnd('[DepartmentTree] 转换为 TreeDataNode 格式');
      console.log('[DepartmentTree] 转换后节点数:', convertedData.length);

      console.time('[DepartmentTree] setState 触发渲染');
      setTreeData(convertedData);
      console.timeEnd('[DepartmentTree] setState 触发渲染');

      console.timeEnd('[DepartmentTree] 总耗时');
    };

    fetchDeptTree();
  }, []);

  // 搜索部门
  const handleSearch = () => {
    const value = searchInputRef.current?.input?.value?.trim() || "";

    if (!value) {
      // 清空搜索，显示原始数据
      const convertedData = convertToTreeData(originalTreeDataRef.current);
      setTreeData(convertedData);
      setHighlightKeyword("");
    } else {
      // 使用公共的树搜索函数
      const filteredData = searchTree({
        treeData: originalTreeDataRef.current,
        searchValue: value,
        nameField: "name",  // 使用后端的 name 字段
      });
      const convertedData = convertToTreeData(filteredData, value);
      setTreeData(convertedData);
      setHighlightKeyword(value);
    }
  };

  // 自定义标题渲染（支持高亮）
  const titleRender = (node: any) => {
    return highlightText(node.deptName, highlightKeyword);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 输入时不做任何处理，只更新输入框的值
  };

  // 处理树节点选择
  const handleSelect: TreeProps["onSelect"] = (selectedKeys, info) => {
    const key = selectedKeys[0] as string | undefined;
    setSelectedKey(key);

    if (key) {
      const deptId = parseInt(key, 10);
      // 从原始数据中查找部门名称
      const findDeptName = (depts: DeptVO[], id: number): string | undefined => {
        for (const dept of depts) {
          if (dept.id === id) return dept.name || dept.deptName;
          if (dept.children) {
            const found = findDeptName(dept.children, id);
            if (found) return found;
          }
        }
        return undefined;
      };
      const deptName = findDeptName(originalTreeDataRef.current, deptId) || "";
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
          ref={searchInputRef}
          onPressEnter={handleSearch}
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
            titleRender={titleRender}
          />
        )}
      </div>
    </div>
  );
}
