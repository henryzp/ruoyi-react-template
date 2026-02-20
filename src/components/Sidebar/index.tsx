import { Menu, Layout } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import type { ItemType } from 'antd/es/menu/interface'

// 扩展菜单项类型，添加 component 字段
interface MenuDataType {
  key: string
  label: string
  component?: string
  icon?: React.ReactNode
  children?: MenuDataType[]
}

/**
 * 将后端菜单数据转换为 Ant Design Menu 格式
 * @param menus 菜单数据
 * @param parentPath 父级路径（用于递归构建完整路径）
 */
function transformMenus(menus: any[], parentPath = ''): MenuDataType[] {
  return menus
    .filter((menu) => !menu.hidden) // 过滤隐藏菜单
    .map((menu) => {
      // 构建完整路径：父路径 + 当前 path
      // 判断是否需要添加 '/'，避免出现 /systemuser 这种情况
      let fullPath = ''
      if (parentPath) {
        fullPath = menu.path.startsWith('/') ? `${parentPath}${menu.path}` : `${parentPath}/${menu.path}`
      } else {
        fullPath = menu.path
      }

      const item: MenuDataType = {
        key: fullPath, // key 使用完整路径（自己 + 爸爸 + 爷爷...）
        label: menu.name,
        component: menu.component, // 保存 component 字段用于路由跳转
      }

      // 递归处理子菜单，传递当前路径作为父路径
      if (menu.children && menu.children.length > 0) {
        item.children = transformMenus(menu.children, fullPath)
      }

      return item
    })
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo } = useAuthStore()
  const { sidebarCollapsed } = useAppStore()

  // 转换菜单数据
  const backendMenus = userInfo?.menus ? transformMenus(userInfo.menus) : []

  // 在最外层添加首页菜单
  const homeMenu: MenuDataType = {
    key: '/home',
    label: '首页',
    component: '/home',
  }
  const menuItems = [homeMenu, ...backendMenus]

  // 获取当前选中的菜单 key
  const selectedKeys = [location.pathname]

  // 获取当前展开的菜单 key（父级菜单）
  const openKeys = menuItems
    .filter((item) => item.children?.some((child) => location.pathname.startsWith(child.key)))
    .map((item) => item.key)

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  }

  return (
    <Layout.Sider
      width={200}
      collapsed={sidebarCollapsed}
      collapsedWidth={64}
      style={{
        background: '#001529',
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div
        style={{
          padding: '16px',
          color: '#fff',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {sidebarCollapsed ? '系统' : '管理系统'}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        defaultOpenKeys={openKeys}
        items={menuItems as unknown as ItemType[]}
        onClick={handleMenuClick}
        inlineCollapsed={sidebarCollapsed}
      />
    </Layout.Sider>
  )
}
