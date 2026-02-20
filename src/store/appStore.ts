import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 标签页项接口
 */
export interface TabItem {
  /** 标签页唯一标识（路径） */
  key: string
  /** 标签页标题 */
  label: string
  /** 路径 */
  path: string
  /** 是否固定（不可关闭） */
  pinned?: boolean
}

/**
 * 应用状态接口
 */
interface AppState {
  /** 侧边栏是否折叠 */
  sidebarCollapsed: boolean
  /** 标签页列表 */
  tabs: TabItem[]
  /** 当前激活的标签页 key */
  activeTabKey: string | null
  /** 刷新 key，用于强制刷新页面 */
  refreshKey: number
}

/**
 * 应用操作接口
 */
interface AppActions {
  /** 切换侧边栏折叠状态 */
  toggleSidebar: () => void
  /** 设置侧边栏折叠状态 */
  setSidebarCollapsed: (collapsed: boolean) => void
  /** 添加或更新标签页 */
  upsertTab: (tab: TabItem) => void
  /** 关闭标签页 */
  closeTab: (key: string) => void
  /** 关闭其他标签页 */
  closeOtherTabs: (key: string) => void
  /** 关闭右侧标签页 */
  closeRightTabs: (key: string) => void
  /** 关闭所有标签页 */
  closeAllTabs: () => void
  /** 设置当前激活的标签页 */
  setActiveTabKey: (key: string) => void
  /** 刷新当前页面 */
  refresh: () => void
  /** 重置所有状态（用于退出登录） */
  reset: () => void
}

/**
 * 应用 Store 类型
 */
type AppStore = AppState & AppActions

/**
 * 应用 Store
 */
export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // 初始状态
      sidebarCollapsed: false,
      tabs: [],
      activeTabKey: null,
      refreshKey: 0,

      // 切换侧边栏
      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
      },

      // 设置侧边栏折叠状态
      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed })
      },

      // 添加或更新标签页
      upsertTab: (tab: TabItem) => {
        set((state) => {
          const existingIndex = state.tabs.findIndex((t) => t.key === tab.key)
          let newTabs: TabItem[]

          if (existingIndex >= 0) {
            // 标签页已存在，更新它
            newTabs = [...state.tabs]
            newTabs[existingIndex] = { ...newTabs[existingIndex], ...tab }
          } else {
            // 添加新标签页
            newTabs = [...state.tabs, tab]

            // 如果新添加的不是首页，确保首页在第一位
            if (tab.key !== '/home' && tab.key !== '/dashboard/index') {
              const homeTab = newTabs.find((t) => t.key === '/home' || t.key === '/dashboard/index')
              if (homeTab) {
                // 移除首页，然后插入到第一位
                newTabs = newTabs.filter((t) => t.key !== '/home' && t.key !== '/dashboard/index')
                newTabs.unshift(homeTab)
              }
            }
          }

          return {
            tabs: newTabs,
            activeTabKey: tab.key,
          }
        })
      },

      // 关闭标签页
      closeTab: (key: string) => {
        set((state) => {
          // 保留不是要关闭的 tab，或者是固定的 tab
          let newTabs = state.tabs.filter((t) => t.key !== key || t.pinned)

          // 确保首页始终在第一位
          const homeTab = newTabs.find((t) => t.key === '/home' || t.key === '/dashboard/index')
          if (homeTab && newTabs[0]?.key !== homeTab.key) {
            // 移除首页，然后插入到第一位
            newTabs = newTabs.filter((t) => t.key !== '/home' && t.key !== '/dashboard/index')
            newTabs.unshift(homeTab)
          }

          // 如果关闭的是当前激活的标签页，需要切换到其他标签页
          let newActiveTabKey = state.activeTabKey
          if (state.activeTabKey === key) {
            const currentIndex = state.tabs.findIndex((t) => t.key === key)
            // 优先激活右侧的标签页，如果没有则激活左侧的
            newActiveTabKey =
              newTabs[currentIndex]?.key ||
              newTabs[currentIndex - 1]?.key ||
              newTabs[newTabs.length - 1]?.key ||
              null
          }

          return {
            tabs: newTabs,
            activeTabKey: newActiveTabKey,
          }
        })
      },

      // 关闭其他标签页
      closeOtherTabs: (key: string) => {
        set((state) => ({
          tabs: state.tabs.filter((t) => t.key === key || t.pinned),
          activeTabKey: key,
        }))
      },

      // 关闭右侧标签页
      closeRightTabs: (key: string) => {
        set((state) => {
          const index = state.tabs.findIndex((t) => t.key === key)
          const newTabs = state.tabs.slice(0, index + 1).concat(state.tabs.slice(index + 1).filter((t) => t.pinned))
          return { tabs: newTabs }
        })
      },

      // 关闭所有标签页
      closeAllTabs: () => {
        set((state) => ({
          tabs: state.tabs.filter((t) => t.pinned),
          activeTabKey: null,
        }))
      },

      // 设置当前激活的标签页
      setActiveTabKey: (key: string) => {
        set({ activeTabKey: key })
      },

      // 刷新当前页面
      refresh: () => {
        set((state) => ({ refreshKey: state.refreshKey + 1 }))
      },

      // 重置所有状态
      reset: () => {
        set({
          sidebarCollapsed: false,
          tabs: [],
          activeTabKey: null,
          refreshKey: 0,
        })
      },
    }),
    {
      name: 'app-storage', // localStorage key
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        tabs: state.tabs,
        activeTabKey: state.activeTabKey,
      }),
    }
  )
)

export default useAppStore
