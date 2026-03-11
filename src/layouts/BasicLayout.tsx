import { Layout } from "antd";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import NavTabs from "@/components/NavTabs";
import KeepAliveOutlet from "@/components/keepAlive/keepAliveOutlet";
import { useAppStore } from "@/store/appStore";

const { Content } = Layout;

export default function BasicLayout() {
  const { sidebarCollapsed } = useAppStore();

  return (
    <Layout style={{ height: "100%" }}>
      <Sidebar />
      <Layout
        style={{
          marginLeft: sidebarCollapsed ? 64 : 200,
          transition: "all 0.2s",
          height: "100%",
        }}
      >
        <AppHeader />
        <NavTabs />
        <Content
          style={{
            padding: "24px",
            background: "#fff",
            margin: "16px",
            borderRadius: 4,
            height: "100%",
            overflow: "hidden",
          }}
        >
          <KeepAliveOutlet />
        </Content>
      </Layout>
    </Layout>
  );
}
