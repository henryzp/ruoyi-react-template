/**
 * 生成唯一 ID
 */
export const UUID = (prefix: string = '') => {
  const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}_${id}` : id;
};

/**
 * 返回值是true或false
 * 先标注一下，这么处理数据对象，可能是提高代码的健壮性
 */
export const objectExistValue = (obj: any) => Object.keys(obj).length > 0;

/**
 * 获取跳转接口里带的参数
 * 例子：search: `?title=brand信息&brs8dId=${brs8dId}`,
 * unescape() 函数可对通过 escape() 编码的字符串进行解码。
 */
export const getUrlParam = (url: string, name: string) => {
  const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
  const search = url.split("?")[1];
  if (search) {
    const r = search.substr(0).match(reg);
    if (r !== null) return unescape(r[2]);
    return null;
  } else {
    return null;
  }
};

export function hasErrors(fieldsError: any) {
  return Object.keys(fieldsError).some((field) => fieldsError[field]);
}

export function guid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
