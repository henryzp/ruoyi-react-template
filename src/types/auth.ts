/**
 * 登录请求DTO
 */
export interface LoginDto {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 租户名称 */
  tenantName?: string
  /** 记住我 */
  rememberMe?: boolean
  /** 验证码 */
  code?: string
  /** 验证码UUID */
  uuid?: string
}

/**
 * 登录响应数据
 */
export interface LoginResponse {
  /** 访问令牌 */
  accessToken: string
  /** 刷新令牌 */
  refreshToken: string
  /** 用户ID */
  userId?: number
  /** 过期时间（秒） */
  expiresIn?: number
}

/**
 * 用户信息
 */
export interface UserInfo {
  /** 用户ID */
  userId?: number
  /** 用户名 */
  username: string
  /** 昵称 */
  nickname?: string
  /** 头像 */
  avatar?: string
  /** 邮箱 */
  email?: string
  /** 手机号 */
  phonenumber?: string
  /** 性别（0男 1女 2未知） */
  sex?: string
  /** 部门ID */
  deptId?: number
  /** 角色列表 */
  roles?: string[]
  /** 权限列表 */
  permissions?: string[]
  /** 菜单列表（路由数据） */
  menus?: any[]
  /** 创建时间 */
  createTime?: string
}

/**
 * 认证状态
 */
export interface AuthState {
  /** 访问令牌 */
  token: string | null
  /** 刷新令牌 */
  refreshToken: string | null
  /** 用户信息 */
  userInfo: UserInfo | null
}

/**
 * Token存储键
 */
export const TOKEN_KEY = 'app-token'
export const REFRESH_TOKEN_KEY = 'app-refresh-token'
export const USER_INFO_KEY = 'app-user-info'
/** 用户信息缓存键（包含权限和菜单） */
export const USER_CACHE_KEY = 'app-user-cache'
/** 菜单路由缓存键 */
export const MENUS_CACHE_KEY = 'app-menus-cache'

/**
 * 租户相关存储键
 */
export const TENANT_ID_KEY = 'tenant-id'
export const VISIT_TENANT_ID_KEY = 'visit-tenant-id'
