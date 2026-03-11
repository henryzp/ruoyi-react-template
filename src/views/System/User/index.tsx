import { useState } from "react";
import { Layout } from "antd";
import DepartmentTree from "./DepartmentTree";
import UserTable from "./UserTable";

const { Sider, Content } = Layout;

export default function User() {
  // 当前选中的部门ID
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(
    undefined,
  );
  // 当前选中的部门名称
  // const [selectedDeptName, setSelectedDeptName] = useState<string>("全部用户");

  // 处理部门选择
  const handleDeptSelect = (
    deptId: number | undefined /*, deptName: string */,
  ) => {
    setSelectedDeptId(deptId);
    // setSelectedDeptName(deptName);
  };

  return (
    <Layout style={{ height: "100%", background: "transparent" }}>
      {/* 左侧部门树 */}
      <Sider
        width={260}
        style={{
          background: "#fff",
          marginRight: 16,
          borderRadius: 4,
          overflow: "auto",
        }}
      >
        <DepartmentTree onSelect={handleDeptSelect} />
      </Sider>

      {/* 右侧用户列表 */}
      <Content style={{ background: "transparent" }}>
        <UserTable deptId={selectedDeptId} />
      </Content>
    </Layout>
  );
}
