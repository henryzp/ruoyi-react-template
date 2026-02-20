/**
 * 全局变量存储
 */
class GlobalVar {
  private store = new Map<string, any>()

  set(key: string, value: any) {
    this.store.set(key, value)
  }

  get(key: string) {
    return this.store.get(key)
  }

  has(key: string) {
    return this.store.has(key)
  }

  delete(key: string) {
    this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }
}

export const globalVar = new GlobalVar()

// 初始化 keepAlive 组件存储
globalVar.set('keepAliveComp', new Map<string, any>())
