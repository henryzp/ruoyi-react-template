import { useState, useEffect, useCallback, useRef } from "react";
import { Input, Tree, Spin, message } from "antd";
import type { TreeDataNode, TreeProps } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { getDeptTree, type DeptVO, DeptStatusEnum } from "./api";
import { buildDeptTree, searchDeptTree, debounce } from "@/utils/helper";

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
    // 处理标题高亮
    let title: React.ReactNode = dept.deptName;
    if (searchValue && dept.deptName.toLowerCase().includes(searchValue.toLowerCase())) {
      const regex = new RegExp(`(${searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = dept.deptName.split(regex);
      title = (
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

    return {
      key: dept.id!,
      title,
      children: dept.children ? convertToTreeData(dept.children, searchValue) : undefined,
      isLeaf: !dept.children || dept.children.length === 0,
      // 停用的部门显示为灰色
      disabled: dept.status === DeptStatusEnum.DISABLE,
    };
  });
}

export default function DepartmentTree({ onSelect }: DepartmentTreeProps) {
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState<string>("");

  // 保存原始树数据，用于搜索过滤
  const originalTreeDataRef = useRef<DeptVO[]>([]);

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
      originalTreeDataRef.current = treeData;
      const convertedData = convertToTreeData(treeData, searchValue);
      setTreeData(convertedData);
    };

    fetchDeptTree();
  }, []);

  // 防抖搜索函数
  const performSearch = useCallback((value: string) => {
    setSearchValue(value);
    if (!value) {
      // 清空搜索，显示原始数据
      const convertedData = convertToTreeData(originalTreeDataRef.current);
      setTreeData(convertedData);
    } else {
      // 使用公共的部门树搜索函数
      const filteredData = searchDeptTree({
        treeData: originalTreeDataRef.current,
        searchValue: value,
        nameField: "deptName",
      });
      const convertedData = convertToTreeData(filteredData, value);
      setTreeData(convertedData);
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
      // 从原始数据中查找部门名称
      const findDeptName = (depts: DeptVO[], id: number): string | undefined => {
        for (const dept of depts) {
          if (dept.id === id) return dept.deptName;
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
