import { globalVar } from './globalVar'

/**
 * Keep-Alive 辅助函数
 */
export class KeepAliveHelper {
  /**
   * 保存 keep-alive 组件
   */
  saveKeepAliveComponent({ comp, id }: { comp: any; id: string }) {
    const keepAliveContent = globalVar.get('keepAliveComp')
    keepAliveContent?.set(id, comp)
  }

  /**
   * 判断是否有 keep-alive 组件
   */
  isHasKeepAliveComponent({ id }: { id: string }) {
    const keepAliveContent = globalVar.get('keepAliveComp')
    return !!keepAliveContent?.get(id)
  }

  /**
   * 获取 keep-alive 组件列表
   */
  getKeepAliveComponentList() {
    const keepAliveContent = globalVar.get('keepAliveComp')
    return keepAliveContent!
  }

  /**
   * 根据 id 获取 keep-alive 组件
   */
  getKeepAliveComponentById({ id }: { id: string }) {
    const keepAliveContent = globalVar.get('keepAliveComp')
    return keepAliveContent!.get(id)
  }
}

export const keepAliveHelper = new KeepAliveHelper()
