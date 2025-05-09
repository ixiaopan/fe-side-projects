import axios from 'axios'
import { message } from 'ant-design-vue'

// 共用组件
export { default as UserSelect } from './UserSelect/index.vue'

export const ROLE_TYPE = {
  ADMIN: '1',
  MANAGER: '2',
  MEMBER: '3',
  REPORTER: '4',
  GUEST: '5',
}
export const ROLE_TYPE_TEXT = {
  [ROLE_TYPE.ADMIN]: 'Admin',
  [ROLE_TYPE.MANAGER]: '管理员',
  [ROLE_TYPE.MEMBER]: '普通成员',
  [ROLE_TYPE.REPORTER]: 'reporter',
  [ROLE_TYPE.GUEST]: '游客',
}

// 缓存
export const TOKEN_KEY = 'TOKEN__'
export const USER_INFO_KEY = 'USER__INFO__'

// 报错码
export const HTTP_RESPONSE_CODE = {
  TOKEN_INVALID: 50001,
}
//
export function createAxios(cfg?: { baseURL?: string; timeout?: number }) {
  const ins = axios.create(cfg || {})

  ins.interceptors.request.use((config) => {
    // @ts-ignore
    const token = localStorage.getItem(TOKEN_KEY)

    if (token) {
      config.headers['x-access-token'] = token
    }

    return config
  })

  ins.interceptors.response.use((res) => {
    if (res.data?.code !== 200) {
      message.error(res.data?.msg || '出错啦')
    }

    // token过期
    if (res.data?.code == HTTP_RESPONSE_CODE.TOKEN_INVALID) {
      window.microApp?.setGlobalData(res.data)
    }

    return res
  })

  return ins
}

export function noop() {}

export function parseJSON(o: string) {
  try {
    return JSON.parse(o)
  } catch (e) {
    // console.error(e)
    return null
  }
}

export function isFunction(f: any): boolean {
  return typeof f == 'function'
}

// 新tab打开
export function openNewTab(url: string, replace?: boolean) {
  if (!url) return

  if (replace) {
    window.location.href = url
    return
  }

  return window.open(url, '_blank')
}

// Gitlab
export const GITLAB_HOST = 'https://gitlab.com'

function ensureHostSuffix(host = GITLAB_HOST) {
  return /\/$/.test(host) ? host : host + '/'
}

export function replaceHost(url: string, host = GITLAB_HOST) {
  return url.replace(/^https?:\/\/([\d|\.:]+)\//, () => ensureHostSuffix(host))
}
// 兼容系统使用 master 其他使用 main 的情况
export const getMainBranchByProjectId = (projectId: number) => {
  return projectId == 5 ? 'master' : 'main'
}

/**
 *
 * @param fn click handler
 * @param manually 是否手动解锁
 * @returns
 */
export function lockClick(fn: any, manually = false) {
  let locked = false
  const cancelLock = () => {
    locked = false
  }
  return (...args: any) => {
    if (locked) return
    locked = true

    return new Promise((resolve) => {
      const p = fn(...args, cancelLock)
      resolve(p)
    }).finally(() => {
      if (!manually) {
        cancelLock()
      }
    })
  }
}
