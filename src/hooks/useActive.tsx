import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAppStore } from "@/store/appStore";

/**
 * useActive Hook - 用于页面组件感知激活/失活状态
 *
 * @param options - 配置选项
 * @param options.onActive - 页面激活时回调（不是首次）
 * @param options.onFirstActive - 页面首次激活时回调
 * @param options.onLeave - 页面失活时回调（不是最后一次）
 * @param options.onLastLeave - 页面最后一次失活时回调（tab 关闭时）
 * @param activeDeps - 依赖数组，当依赖变化时会重置首次激活状态
 *
 * @example
 * ```tsx
 * useActive({
 *   onFirstActive: () => {
 *     console.log('首次进入页面，加载数据');
 *   },
 *   onActive: (isFirst) => {
 *     console.log('页面被激活');
 *   },
 *   onLeave: (isLast) => {
 *     console.log('页面失活');
 *   },
 *   onLastLeave: () => {
 *     console.log('tab 关闭，清理资源');
 *   }
 * }, [someDependency]);
 * ```
 */
const useActive = (
  {
    onActive,
    onLeave,
    onFirstActive,
    onLastLeave,
  }: {
    onActive?: (isFirst: boolean) => void;
    onLeave?: (isLast: boolean) => void;
    onFirstActive?: () => void;
    onLastLeave?: () => void;
  },
  activeDeps?: any[],
) => {
  const location = useLocation();
  const { tabs, activeTabKey } = useAppStore();
  const currentPath = useRef<string>(location.pathname);
  const activeFlag = useRef<boolean | undefined>(undefined);
  const isFirsted = useRef(false);
  const activeDepsRecord = useRef(activeDeps);

  // 依赖变化时重置状态
  let depSignature = useRef<string>(Date.now().toString());
  if (
    currentPath.current === location.pathname &&
    activeTabKey === location.pathname &&
    activeDepsRecord.current
  ) {
    const depsEqual = JSON.stringify(activeDepsRecord.current) === JSON.stringify(activeDeps);
    depSignature.current = depsEqual ? depSignature.current : Date.now().toString();

    // 如果已经创建过，并且依赖变化了，重置状态
    if (isFirsted.current && !depsEqual) {
      activeDepsRecord.current = activeDeps;
      isFirsted.current = false;
      activeFlag.current = undefined;
    }
  }

  useEffect(() => {
    if (currentPath.current === location.pathname && activeTabKey === location.pathname) {
      const isFirst = activeFlag.current ?? true;
      if (isFirst && onFirstActive) {
        onFirstActive?.();
        isFirsted.current = true;
      } else {
        onActive?.(isFirst);
      }
      activeFlag.current = true;
    }
    return () => {
      if (activeFlag.current) {
        // 判断是否是最后一次离开（tab 关闭）
        const isLast = !tabs.some((tab) => tab.key === currentPath.current);
        if (isLast && onLastLeave) {
          onLastLeave();
        } else {
          onLeave?.(isLast);
        }
        activeFlag.current = isLast ? undefined : false;
      }
    };
  }, [activeTabKey, depSignature.current, onActive, onFirstActive, onLastLeave, onLeave, tabs]);

  return () => {
    isFirsted.current = false;
    if (activeDepsRecord.current) {
      activeDepsRecord.current = [];
    }
    activeFlag.current = undefined;
  };
};

export default useActive;
