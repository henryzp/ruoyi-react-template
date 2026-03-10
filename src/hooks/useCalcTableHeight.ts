import { useState, useEffect } from 'react';

/**
 * 自定义 Hook 用于计算表格的内容区高度
 * @param {React.RefObject} tableRef - 表格容器的引用
 * @returns {number} - 表格内容的滚动高度
 */
const useCalcTableHeight = (tableRef: any) => {
  const [tableScrollY, setTableScrollY] = useState(0); // 存储动态计算后的高度

  useEffect(() => {
    // 定义函数来计算表格内容区域高度
    const calcTableBodyHeight = () => {
      if (tableRef.current) {
        // 获取整个表格容器的高度
        const tableContainerHeight =
          tableRef.current.getBoundingClientRect().height;

        // 获取表头的高度
        const tableHeaderHeight = tableRef.current
          .querySelector('.ant-table-thead')
          .getBoundingClientRect().height;

        // 获取分页区域的高度（如果存在分页）
        const paginationElement = tableRef.current.querySelector(
          '.ant-table-pagination',
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
        setTableScrollY(
          tableContainerHeight -
            tableHeaderHeight -
            paginationHeight -
            paginationMarginTop,
        );
      }
    };

    // MutationObserver 用于监听 DOM 变化
    const observer = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          calcTableBodyHeight();
          break; // 我们只关心一次高度计算即可
        }
      }
    });

    // 开始监听表格容器内容的变化
    if (tableRef.current) {
      observer.observe(tableRef.current, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    calcTableBodyHeight();

    // 窗口大小变化时重新计算高度
    window.addEventListener('resize', calcTableBodyHeight);

    // 清理事件监听
    return () => {
      window.removeEventListener('resize', calcTableBodyHeight);
      observer.disconnect(); // 停止观察
    };
  }, [tableRef]);

  return tableScrollY;
};

export default useCalcTableHeight;
