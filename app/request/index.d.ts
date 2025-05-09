import type { RawAxiosRequestHeaders, AxiosInstance, AxiosRequestConfig } from 'axios'

export type { AxiosResponse, AxiosError,} from 'axios'

export interface RequestOptions {
  // -- 单个请求全局配置
  // 业务接口host
  apiUrl?: string
  // 系统名
  sysPrefix?: string
  // Whether to join url
  joinPrefix?: boolean

  returnNativeResponse?: boolean
  needTransformResponse?: boolean
  // 消息提示类型
  errorMessageMode?: 'none' | 'modal' | 'message'
  ignoreMessage?: boolean
  // 忽略重复请求
  cancelRequest?: boolean
  includeParams?: boolean | string[]
  // 是否携带token
  withToken?: boolean
  // 接口验签
  withSignature?: boolean

  // -- 覆盖全局配置
  headers?: any
  // 超时时间
  timeout?: number
  // 是否开启mock
  mock?: boolean
}

export type EAxiosOption = {
  // SDK全局配置
  serverMode?: boolean // 是否是 localhost 开发模式
  mockUrl?: string
  throwCatch?: boolean
  // 
  headers?: any
  timeout?: number
  transform?: any  
  
  // 单个请求全局配置
  requestOptions?: RequestOptions
}

export interface RequestConfigWithOptions extends AxiosRequestConfig {
  requestOptions?: RequestOptions
  headers?: RawAxiosRequestHeaders
}

export const axios: AxiosInstance

export class EAxios {
  constructor(config?: EAxiosOption)
  
  get(config: AxiosRequestConfig, options?: RequestOptions): Promise<any>
  
  post(config: AxiosRequestConfig, options?: RequestOptions): Promise<any>
  
  request(config: AxiosRequestConfig, options?: RequestOptions): Promise<any>
}
