import { Layout } from 'antd'
import Sidebar from '@/components/Sidebar'
import AppHeader from '@/components/AppHeader'
import NavTabs from '@/components/NavTabs'
import KeepAliveOutlet from '@/components/keepAlive/keepAliveOutlet'
import { useAppStore } from '@/store/appStore'
import { useEffect } from 'react'

const { Content } = Layout

export default function BasicLayout() {
  const { sidebarCollapsed } = useAppStore()

  useEffect(() => {
    console.log('init layout');
    return () => {
      console.log('unmount layout');
    }
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: sidebarCollapsed ? 64 : 200, transition: 'all 0.2s' }}>
        <AppHeader />
        <NavTabs />
        <Content
          style={{
            padding: '24px',
            background: '#f0f2f5',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 4,
              height: '100%',
              overflow: 'auto',
              boxSizing: 'border-box',
            }}
          >
            <KeepAliveOutlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
