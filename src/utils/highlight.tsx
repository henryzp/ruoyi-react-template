import type { ReactNode } from "react";

/**
 * 高亮文本中的搜索关键词（简化高效版）
 * @param text 要高亮的文本
 * @param searchValue 搜索关键词
 * @returns 高亮后的 ReactNode
 */
export function highlightText(
  text: string,
  searchValue: string
): ReactNode {
  // 如果没有搜索词或文本，直接返回
  if (!searchValue || !text) {
    return text;
  }

  // 如果不匹配，直接返回（避免不必要的处理）
  const lowerText = text.toLowerCase();
  const lowerSearch = searchValue.toLowerCase();
  if (!lowerText.includes(lowerSearch)) {
    return text;
  }

  // 简单的字符串替换高亮（比正则表达式更快）
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let index = 0;

  while ((index = lowerText.indexOf(lowerSearch, lastIndex)) !== -1) {
    // 添加匹配前的文本
    if (index > lastIndex) {
      parts.push(text.substring(lastIndex, index));
    }
    // 添加高亮的匹配文本
    parts.push(
      <span key={`match-${index}`} style={{ backgroundColor: '#ffd54f', padding: '0 2px', borderRadius: 2 }}>
        {text.substring(index, index + searchValue.length)}
      </span>
    );
    lastIndex = index + searchValue.length;
  }

  // 添加剩余的文本
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // 如果没有匹配，返回原文本
  if (parts.length === 0) {
    return text;
  }

  // 如果只有一个部分且没有高亮，返回原文本
  if (parts.length === 1 && typeof parts[0] === 'string') {
    return text;
  }

  return <>{parts}</>;
}
