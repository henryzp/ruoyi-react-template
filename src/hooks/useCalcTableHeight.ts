import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

type TableScroll = {
  tableRef: RefObject<HTMLDivElement>;
  tableScrollY: number;
};

const useCalcTableHeight = (): TableScroll => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [tableScrollY, setTableScrollY] = useState(0);

  useEffect(() => {
    const container = tableRef.current;
    if (!container) return undefined;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const tableHead =
        container.querySelector<HTMLElement>('.ant-table-thead');
      const pagination = container.querySelector<HTMLElement>(
        '.ant-table-pagination',
      );
      if (!tableHead) return;
      const paginationStyle = pagination
        ? window.getComputedStyle(pagination)
        : undefined;
      const paginationHeight = pagination?.getBoundingClientRect().height ?? 0;
      const paginationMargin = paginationStyle
        ? (parseFloat(paginationStyle.marginTop) || 0) +
          (parseFloat(paginationStyle.marginBottom) || 0)
        : 0;
      const nextHeight = Math.max(
        0,
        Math.floor(
          container.getBoundingClientRect().height -
            tableHead.getBoundingClientRect().height -
            paginationHeight -
            paginationMargin,
        ),
      );
      setTableScrollY((current) =>
        current === nextHeight ? current : nextHeight,
      );
    };
    const scheduleMeasure = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(scheduleMeasure);
    const mutationObserver =
      typeof MutationObserver === 'undefined'
        ? undefined
        : new MutationObserver(scheduleMeasure);
    resizeObserver?.observe(container);
    mutationObserver?.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    window.addEventListener('resize', scheduleMeasure);
    scheduleMeasure();

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return { tableRef, tableScrollY };
};

export default useCalcTableHeight;
