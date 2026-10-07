import React, { memo, useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";

export type KeepAliveComponentProps = React.PropsWithChildren<{
  parentDomRef: RefObject<HTMLElement | null>;
  activeKey: string;
  pageKey: string;
}>;

function KeepAliveRoute(props: KeepAliveComponentProps) {
  const { parentDomRef, activeKey, children, pageKey } = props;
  const isActive = activeKey === pageKey;

  // 为每个页面创建一个独立的 DOM 容器
  const aliveDom = useMemo(() => {
    const div = document.createElement("div");
    div.setAttribute("data-page-name", pageKey);
    div.setAttribute("style", "height: 100%; width: 100%;");
    return div;
  }, [pageKey]);

  // 标记组件是否已经被挂载过
  const [isAlive, setIsAlive] = useState(false);

  useEffect(() => {
    const containerDiv = parentDomRef.current;
    if (!containerDiv) {
      return;
    }

    if (isActive) {
      setIsAlive(true);
      // 激活时：将容器挂载到主容器
      // 先移除之前激活的容器
      const oldDom = containerDiv.querySelector("[data-page-name]");
      if (oldDom && oldDom !== aliveDom) {
        containerDiv.removeChild(oldDom);
      }
      if (!containerDiv.contains(aliveDom)) {
        containerDiv.appendChild(aliveDom);
      }
    } else {
      // 失活时：从主容器移除，但组件实例保持挂载
      if (containerDiv.contains(aliveDom)) {
        containerDiv.removeChild(aliveDom);
      }
    }
  }, [isActive, aliveDom, parentDomRef, pageKey, activeKey]);

  // 只有被激活过的组件才通过 Portal 渲染
  if (!isAlive) {
    return null;
  }

  return createPortal(children, aliveDom, pageKey);
}

export default memo(KeepAliveRoute);
