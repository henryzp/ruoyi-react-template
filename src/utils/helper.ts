/**
 * 通用工具函数
 */

// ==================== 函数式工具 ====================

/**
 * 防抖函数
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * 节流函数
 * @param fn 要节流的函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = delay - (now - lastTime);

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @param onSuccess 成功回调
 * @param onError 失败回调
 * @returns 是否复制成功
 */
export const copyToClipboard = async (
  text: string,
  onSuccess?: (msg: string) => void,
  onError?: (msg: string) => void,
) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      onSuccess?.("复制成功！");
      return true;
    } catch (err) {
      console.error("clipboard API 复制失败:", err);
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-999999px";
    textarea.style.top = "-999999px";
    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const result = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (result) {
      onSuccess?.("复制成功！");
      return true;
    }
  } catch (err) {
    console.error("execCommand 复制失败:", err);
    onError?.("复制失败，请手动复制");
    return false;
  }
};

// ==================== 数据结构工具 ====================

/**
 * 将平铺的列表转换为树形结构（通用方法）
 * @param list 平铺的列表
 * @param options 配置选项
 * @returns 树形结构的列表
 */
export function buildTree<
  T extends {
    id?: number | string;
    parentId: number | string;
    children?: T[];
    [key: string]: any;
  },
>(
  list: T[],
  options?: {
    /** 根节点的 parentId 值，默认为 0 */
    rootParentId?: number | string;
    /** 排序字段，默认为 'sort'，兼容 'orderNum' */
    sortField?: string;
    /** 是否清理空的 children 数组，默认为 true */
    cleanEmptyChildren?: boolean;
  },
): T[] {
  const { rootParentId = 0, sortField = "sort", cleanEmptyChildren = true } = options || {};

  console.time('[buildTree] 总耗时');
  console.log('[buildTree] 数据量:', list.length);

  // 1. 使用 Map 存储 ID → 节点的映射（避免重复查找）
  const nodeMap = new Map<number | string, T>();
  // 2. 使用 Map 存储 parentId → children 的映射（构建树时直接使用）
  const childrenMap = new Map<number | string, T[]>();

  console.time('[buildTree] 建立 Map 映射');
  // 单次遍历：建立两个映射
  for (const item of list) {
    if (item.id === undefined) continue;

    nodeMap.set(item.id, item);

    // 初始化 children 数组
    if (!childrenMap.has(item.parentId)) {
      childrenMap.set(item.parentId, []);
    }
    childrenMap.get(item.parentId)!.push(item);
  }
  console.timeEnd('[buildTree] 建立 Map 映射');

  // 提取排序函数到外部，避免每次递归都创建（性能优化）
  const getSortValue = (item: T): number => {
    const value = item[sortField];
    return typeof value === "number" ? value : 0;
  };

  let recursionCount = 0;
  let sortCount = 0;

  // 3. 递归构建树（构建时排序，避免后续遍历）
  const build = (parentId: number | string): T[] => {
    recursionCount++;
    const children = childrenMap.get(parentId);
    if (!children) return [];

    // 复制数组后再排序，避免修改原数据（性能优化）
    sortCount++;
    const sortedChildren = [...children].sort((a, b) => getSortValue(a) - getSortValue(b));

    const result: T[] = [];
    for (let i = 0; i < sortedChildren.length; i++) {
      const item = sortedChildren[i];
      // 递归构建子树
      const itemChildren = build(item.id!);

      // 根据选项决定是否清理空的 children
      if (itemChildren.length > 0) {
        // 有子节点：创建新对象并设置 children
        result.push({ ...item, children: itemChildren });
      } else if (cleanEmptyChildren) {
        // 清理模式：移除空的 children 属性
        // 只有当原 item 有 children 属性时才创建新对象
        const itemWithChildren = item as any;
        if (itemWithChildren.children !== undefined) {
          const { children: _removed, ...rest } = itemWithChildren;
          result.push(rest as T);
        } else {
          result.push(item);
        }
      } else {
        // 保留模式：直接返回原 item
        result.push(item);
      }
    }
    return result;
  };

  const result = build(rootParentId);

  console.log('[buildTree] 递归次数:', recursionCount);
  console.log('[buildTree] 排序次数:', sortCount);
  console.timeEnd('[buildTree] 总耗时');

  return result;
}

/**
 * 在树中搜索匹配的节点（优化版）
 * 搜索规则：
 * 1. 匹配名称包含关键词的节点
 * 2. 包含匹配节点的所有子孙节点
 * 3. 包含匹配节点到根节点的所有祖先节点
 * @param options 搜索选项
 * @returns 过滤后的树形数据
 */
export function searchTree<
  T extends {
    id?: number | string;
    parentId: number;
    name?: string;
    deptName?: string;
    children?: T[];
    [key: string]: any;
  },
>(options: {
  /** 树形数据 */
  treeData: T[];
  /** 搜索关键词 */
  searchValue: string;
  /** 名称字段，默认为 'name'，兼容 'deptName' */
  nameField?: string;
}): T[] {
  const { treeData, searchValue, nameField = "name" } = options;

  if (!searchValue) {
    return treeData;
  }

  // 1. 扁平化树形数据，同时建立 ID 到节点的映射和 parentId 到 children 的映射
  const flattenList: T[] = [];
  const nodeMap = new Map<number | string, T>();
  const childrenMap = new Map<number | string, T[]>();

  const flatten = (items: T[]) => {
    for (const item of items) {
      flattenList.push(item);
      nodeMap.set(item.id!, item);

      // 建立 parentId → children 的映射，避免后续重复 filter
      if (!childrenMap.has(item.parentId)) {
        childrenMap.set(item.parentId, []);
      }
      childrenMap.get(item.parentId)!.push(item);

      if (item.children) {
        flatten(item.children);
      }
    }
  };
  flatten(treeData);

  // 2. 收集所有需要保留的节点ID（使用 Set 快速查找）
  const keepIds = new Set<number | string>();

  // 添加某个节点及其所有子孙（使用 childrenMap，O(1) 查找子节点）
  const addDescendants = (nodeId: number | string) => {
    const children = childrenMap.get(nodeId);
    if (!children) return;

    for (const child of children) {
      keepIds.add(child.id!);
      addDescendants(child.id!);
    }
  };

  // 添加某个节点到根节点的路径（使用 nodeMap，O(1) 查找父节点）
  const addAncestors = (nodeId: number | string) => {
    const node = nodeMap.get(nodeId);
    if (!node || node.parentId === 0) return;
    keepIds.add(node.parentId);
    addAncestors(node.parentId);
  };

  // 3. 搜索匹配的节点（只遍历一次）
  const lowerSearchValue = searchValue.toLowerCase();
  for (const node of flattenList) {
    // 兼容 name 和 deptName 字段
    const nodeName = (node[nameField as keyof T] as string) || "";
    if (nodeName.toLowerCase().includes(lowerSearchValue)) {
      keepIds.add(node.id!);
      // 1. 添加该节点及其所有子孙
      addDescendants(node.id!);
      // 2. 添加该节点到根节点的所有祖先
      addAncestors(node.id!);
    }
  }

  if (keepIds.size === 0) {
    return [];
  }

  // 4. 重建树形结构（使用 childrenMap，避免重复 filter）
  const buildTree = (parentId = 0): T[] => {
    const children = childrenMap.get(parentId);
    if (!children) return [];

    const result: T[] = [];
    for (const item of children) {
      if (keepIds.has(item.id!)) {
        const itemChildren = buildTree(Number(item.id));
        // 只修改 children 属性，避免深拷贝
        result.push({
          ...item,
          children: itemChildren.length > 0 ? itemChildren : undefined,
        } as T);
      }
    }
    return result;
  };

  return buildTree(0);
}

