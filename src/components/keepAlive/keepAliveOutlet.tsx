import {
  memo,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Outlet, useLocation, useOutlet } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import KeepAliveRoute from "./keepAliveRoute";
import useForceUpdate from "@/hooks/useForceUpdate";
import { UUID } from "@/utils/uuid";
import { keepAliveHelper } from "@/utils/keepAliveHelper";

const KeepAliveOutlet = memo(() => {
  const { tabs, refreshKey } = useAppStore();
  const outlet = useOutlet();
  const { pathname } = useLocation();

  const componentList = useRef(new Map<string, ReactNode>());
  const outletRef = useRef<ReactNode | null>(null);
  outletRef.current = outlet;
  const [, setCacheSig] = useState(UUID());
  const forceUpdate = useForceUpdate();

  // 用于追踪 cacheKey 是否变化
  const prevCacheKeyRef = useRef<string>("");
  // 用于追踪上一次的 refreshKey
  const prevRefreshKeyRef = useRef<number>(0);

  // 直接使用完整路径作为缓存 key
  const cacheKey = useMemo(() => {
    return pathname;
  }, [pathname]);

  // 使用 state 存储当前激活的 key，而不是 ref
  const [activeKey, setActiveKey] = useState<string>(pathname);

  // 处理刷新：删除指定 key 的缓存
  useEffect(() => {
    if (refreshKey > 0 && prevRefreshKeyRef.current !== refreshKey) {
      // 清空所有缓存（简单处理）
      componentList.current.clear();
      setCacheSig(UUID());
      prevRefreshKeyRef.current = refreshKey;
    }
  }, [refreshKey]);

  // 当 tab 关闭时，清理对应的缓存组件
  useEffect(() => {
    if (!tabs.length) return;

    // 获取当前所有 tab 的 key（即路径）
    const allRouteKeys = tabs.map((item) => {
      return item.key;
    });

    // 删除不在 tab 列表中的缓存组件
    const aliveKeys = Array.from(componentList.current.keys());
    aliveKeys.forEach((key) => {
      if (!allRouteKeys.includes(key)) {
        componentList.current.delete(key);
      }
    });
  }, [tabs]);

  useLayoutEffect(() => {
    const hasChanged = prevCacheKeyRef.current !== cacheKey;

    // 更新 activeKey state
    setActiveKey(cacheKey);

    // 保存组件到全局缓存（用于拖拽预览等功能）
    keepAliveHelper.saveKeepAliveComponent({
      id: cacheKey,
      comp: outlet,
    });

    // 缓存当前组件
    if (!componentList.current.has(cacheKey) && outletRef.current) {
      componentList.current.set(cacheKey, outletRef.current);

      // 只有当添加新组件时才需要强制更新
      forceUpdate();
    } else if (hasChanged) {
      // cacheKey 变化时也需要更新
      forceUpdate();
    }

    prevCacheKeyRef.current = cacheKey;
  }, [cacheKey, forceUpdate, outlet]);

  const aliveParentRef = useRef<HTMLDivElement>(null);

  // 判断当前路由是否需要 keep-alive
  const isKeepAlive = tabs.some((tab) => tab.key === pathname);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* 容器 div，用于挂载 keep-alive 的 DOM */}
      <div
        ref={aliveParentRef}
        style={{ height: "100%" }}
      />

      {/* 非 keep-alive 的路由直接渲染 */}
      {!isKeepAlive && <Outlet />}

      {/* 渲染所有 keep-alive 的组件 */}
      {Array.from(componentList.current).map(([key, component]) => {
        return (
          <KeepAliveRoute
            parentDomRef={aliveParentRef}
            key={key}
            activeKey={activeKey}
            pageKey={key}
          >
            {component}
          </KeepAliveRoute>
        );
      })}
    </div>
  );
});

export default KeepAliveOutlet;
