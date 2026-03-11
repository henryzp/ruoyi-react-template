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
 * 将平铺的部门列表转换为树形结构
 * @param list 平铺的部门列表
 * @returns 树形结构的部门列表
 */
export function buildDeptTree<
  T extends {
    id?: number;
    parentId: number;
    name?: string;
    deptName?: string;
    sort?: number;
    orderNum?: number;
    children?: T[];
    [key: string]: any;
  },
>(list: T[]): T[] {
  const map = new Map<number, T>();
  const tree: T[] = [];

  // 第一遍：创建映射，并标准化字段
  list.forEach((item) => {
    const normalized: T = {
      ...item,
      // 统一字段名：优先使用 deptName，否则使用 name
      deptName: item.deptName || item.name || "",
      orderNum: item.orderNum ?? item.sort ?? 0,
      children: [],
    };
    map.set(item.id!, normalized);
  });

  // 第二遍：构建树形结构
  map.forEach((item) => {
    const parent = map.get(item.parentId);
    if (parent) {
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(item);
    } else {
      // parentId 为 0 或找不到父节点的，作为根节点
      tree.push(item);
    }
  });

  // 按 orderNum 排序
  const sortByOrder = (nodes: T[]) => {
    nodes.sort((a, b) => (a.orderNum || 0) - (b.orderNum || 0));
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        sortByOrder(node.children);
      }
    });
  };

  sortByOrder(tree);

  return tree;
}
