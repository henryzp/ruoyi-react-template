import { Breadcrumb, Button, Layout, Dropdown, Modal, Space } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import type { MenuProps } from 'antd'
import styles from './index.module.scss'

/**
 * 生成面包屑导航项
 */
function generateBreadcrumbs(pathname: string) {
  const pathSegments = pathname.split('/').filter(Boolean)

  // 如果路径为空或只有一页，不显示面包屑
  if (pathSegments.length === 0) {
    return []
  }

  const breadcrumbs: Array<{ title: string; path: string }> = []

  // 根据当前路径生成面包屑
  // 这里可以根据实际的菜单数据来生成更精确的面包屑
  const pathMap: Record<string, string> = {
    home: '首页',
    dashboard: '仪表盘',
    system: '系统管理',
    user: '用户管理',
    role: '角色管理',
    menu: '菜单管理',
    dept: '部门管理',
    post: '岗位管理',
    dict: '字典管理',
    config: '参数设置',
    notice: '通知公告',
    log: '日志管理',
  }

  pathSegments.forEach((segment, index) => {
    const title = pathMap[segment] || segment
    breadcrumbs.push({
      title,
      path: '/' + pathSegments.slice(0, index + 1).join('/'),
    })
  })

  return breadcrumbs
}

export default function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  const breadcrumbs = generateBreadcrumbs(location.pathname)

  const headerStyle: React.CSSProperties = {
    left: sidebarCollapsed ? 0 : 200,
  }

  // 登出确认
  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出',
      content: '您确定要退出登录吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        await logout()
        navigate('/login', { replace: true })
      },
    })
  }

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  return (
    <Layout.Header className={styles.header} style={headerStyle}>
      <div className={styles.left}>
        <Button
          type="text"
          icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          className={styles.collapseBtn}
          // onClick={toggleSidebar}
        />
        <Breadcrumb
          items={breadcrumbs.map((item) => ({
            title: item.title,
          }))}
          className={styles.breadcrumb}
        />
      </div>

      <div className={styles.right}>
        <Space>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" className={styles.userBtn}>
              <UserOutlined />
              <span className={styles.username}>{userInfo?.nickname || '超级管理员'}</span>
            </Button>
          </Dropdown>
        </Space>
      </div>
    </Layout.Header>
  )
}
