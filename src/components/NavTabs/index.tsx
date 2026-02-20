import { useEffect, useMemo, useRef } from 'react'
import { Tabs, Dropdown } from 'antd'
import {
  ReloadOutlined,
  CloseCircleOutlined,
  DeleteRowOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import type { MenuProps } from 'antd'
import styles from './index.module.scss'

/**
 * 路径标题映射
 */
const PATH_TITLE_MAP: Record<string, string> = {
  '/home': '首页',
  '/dashboard': '仪表盘',
  '/dashboard/index': '首页',
  '/system': '系统管理',
  '/system/user': '用户管理',
  '/system/role': '角色管理',
  '/system/menu': '菜单管理',
  '/system/dept': '部门管理',
  '/system/post': '岗位管理',
  '/system/dict': '字典管理',
  '/system/config': '参数设置',
  '/system/notice': '通知公告',
  '/system/log': '日志管理',
}

/**
 * 根据路径获取标题
 */
function getTitleByPath(pathname: string): string {
  // 精确匹配
  if (PATH_TITLE_MAP[pathname]) {
    return PATH_TITLE_MAP[pathname]
  }

  // 模糊匹配（处理带参数的路由）
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length >= 2) {
    const basePath = '/' + segments.slice(0, 2).join('/')
    if (PATH_TITLE_MAP[basePath]) {
      return PATH_TITLE_MAP[basePath]
    }
  }

  // 返回最后一个路径段作为标题
  const lastSegment = segments[segments.length - 1]
  return lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : '未命名'
}

export default function NavTabs() {
  const location = useLocation()
  const navigate = useNavigate()
  const { tabs, activeTabKey, upsertTab, closeTab, closeOtherTabs, closeRightTabs, setActiveTabKey, refresh } =
    useAppStore()
  const currentTabRef = useRef<string>('')

  // 监听路由变化，自动添加标签页
  useEffect(() => {
    // 忽略登录页等特殊页面
    if (['/login', '/404', '/403'].includes(location.pathname)) {
      return
    }

    const title = getTitleByPath(location.pathname)

    upsertTab({
      key: location.pathname,
      label: title,
      path: location.pathname,
      // 首页固定不可关闭
      pinned: location.pathname === '/home' || location.pathname === '/dashboard/index',
    })
  }, [location.pathname, upsertTab])

  // 处理关闭标签页
  const handleCloseTab = (targetKey: string) => {
    const closingIsActiveTab = targetKey === activeTabKey

    // 先找到关闭后的下一个应该激活的 tab
    const currentIndex = tabs.findIndex((t) => t.key === targetKey)
    const nextTabs = tabs.filter((t) => t.key !== targetKey || t.pinned)
    let nextActiveKey = activeTabKey

    if (closingIsActiveTab) {
      // 如果关闭的是当前激活的 tab，需要切换到其他 tab
      nextActiveKey =
        nextTabs[currentIndex]?.key ||
        nextTabs[currentIndex - 1]?.key ||
        nextTabs[nextTabs.length - 1]?.key ||
        null
    }

    // 执行关闭
    closeTab(targetKey)

    // 如果关闭的是当前 tab，导航到新的激活 tab
    if (closingIsActiveTab && nextActiveKey && nextActiveKey !== location.pathname) {
      navigate(nextActiveKey)
    }
  }

  // 切换标签页
  const handleChange = (key: string) => {
    setActiveTabKey(key)
    // 从 tabs 中查找目标标签页，获取其完整路径
    const target = tabs.find((item) => item.key === key)
    if (target) {
      navigate(target.path)
    } else {
      navigate(key)
    }
  }

  // 右键菜单项
  const contextMenuItems = useMemo(
    () => (key: string): MenuProps['items'] => [
      {
        key: 'refresh',
        label: '刷新',
        icon: <ReloadOutlined />,
        onClick: () => {
          refresh()
        },
      },
      {
        type: 'divider',
      },
      {
        key: 'closeRight',
        label: '关闭右侧',
        icon: <DeleteRowOutlined />,
        onClick: () => {
          closeRightTabs(key)
        },
      },
      {
        key: 'closeOthers',
        label: '关闭其他',
        icon: <CloseCircleOutlined />,
        onClick: () => {
          closeOtherTabs(key)
        },
      },
    ],
    [closeOtherTabs, closeRightTabs, refresh]
  )

  return (
    <div className={styles.navTabsWrapper}>
      <Tabs
        type="editable-card"
        hideAdd
        activeKey={activeTabKey || undefined}
        onChange={handleChange}
        onEdit={(targetKey, action) => {
          if (action === 'remove') {
            handleCloseTab(targetKey as string)
          }
        }}
        tabBarGutter={4}
        items={tabs.map((tab) => ({
          key: tab.key,
          label: (
            <Dropdown
              menu={{ items: contextMenuItems(tab.key) }}
              trigger={['contextMenu']}
              onOpenChange={(open) => {
                if (open) {
                  currentTabRef.current = tab.key
                }
              }}
            >
              <span className={styles.tabLabel}>{tab.label}</span>
            </Dropdown>
          ),
          closable: !tab.pinned,
        }))}
        className={styles.navTabs}
      />
    </div>
  )
}
