import { useState, useEffect } from "react";

/**
 * 自定义 Hook 用于计算表格的内容区高度
 * @param {React.RefObject} tableRef - 表格容器的引用
 * @returns {number} - 表格内容的滚动高度
 */
const useCalcTableHeight = (tableRef: any) => {
  const [tableScrollY, setTableScrollY] = useState(0); // 存储动态计算后的高度

  useEffect(() => {
    if (!tableRef.current) return;

    let isCalculating = false;

    // 定义函数来计算表格内容区域高度
    const calcTableBodyHeight = () => {
      if (isCalculating || !tableRef.current) return;
      isCalculating = true;

      requestAnimationFrame(() => {
        if (!tableRef.current) {
          isCalculating = false;
          return;
        }

        // 获取整个表格容器的高度
        const tableContainerHeight =
          tableRef.current.getBoundingClientRect().height;

        // 获取表头的高度
        const tableHeaderHeight =
          tableRef.current
            .querySelector(".ant-table-thead")
            ?.getBoundingClientRect().height || 0;

        // 获取分页区域的高度（如果存在分页）
        const paginationElement = tableRef.current.querySelector(
          ".ant-table-pagination",
        );
        let paginationHeight = 0;
        let paginationMarginTop = 0; // 只关心 margin-top

        if (paginationElement) {
          paginationHeight = paginationElement.getBoundingClientRect().height;

          // 使用 getComputedStyle 获取 margin-top 值
          const computedStyle = window.getComputedStyle(paginationElement);
          paginationMarginTop = parseFloat(computedStyle.marginTop) || 0; // 防止 NaN
        }

        // 计算最终的表体高度
        const newScrollY =
          tableContainerHeight -
          tableHeaderHeight -
          paginationHeight -
          paginationMarginTop;

        // 只有当高度确实发生变化时才更新状态
        setTableScrollY((prev) => {
          if (prev !== newScrollY) {
            return newScrollY;
          }
          return prev;
        });

        isCalculating = false;
      });
    };

    // MutationObserver 用于监听 DOM 变化
    const observer = new MutationObserver(() => {
      calcTableBodyHeight();
    });

    // 开始监听表格容器内容的变化
    observer.observe(tableRef.current, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    // 延迟执行首次计算，确保 DOM 已经完全渲染
    const timer = setTimeout(calcTableBodyHeight, 0);

    // 窗口大小变化时重新计算高度
    window.addEventListener("resize", calcTableBodyHeight);

    // 清理事件监听
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calcTableBodyHeight);
      observer.disconnect(); // 停止观察
    };
  }, [tableRef]);

  return tableScrollY;
};

export default useCalcTableHeight;
