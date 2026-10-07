import { useLayoutEffect, useRef, useState } from 'react';
import { Tooltip } from 'antd';
import type { EllipsisTextProps } from './types';

export type { EllipsisTextProps } from './types';

const measureOverflow = (element: HTMLElement) =>
  element.scrollWidth > element.clientWidth;

const EllipsisText = ({
  text,
  maxWidth = 200,
  as: Element = 'span',
  className,
  style,
}: EllipsisTextProps) => {
  const textRef = useRef<HTMLElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Measure after every render so text and visual style changes are covered.
  useLayoutEffect(() => {
    const element = textRef.current;
    if (element) setIsOverflowing(measureOverflow(element));
  }, [className, maxWidth, style, text]);

  // Rebind when the rendered tag changes; render measurements cover visual
  // changes that do not affect the element's box size.
  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      setIsOverflowing(measureOverflow(element));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [Element]);

  return (
    <Tooltip title={isOverflowing ? text : undefined}>
      <Element
        ref={(element) => {
          textRef.current = element;
        }}
        className={className}
        style={{
          ...style,
          maxWidth,
          display: 'inline-block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </Element>
    </Tooltip>
  );
};

export default EllipsisText;
