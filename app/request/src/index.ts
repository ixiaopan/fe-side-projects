import type { AxiosRequestConfig, AxiosInstance, AxiosResponse } from 'axios'
import type { RequestOptions, EAxiosOption, RequestConfigWithOptions } from '..'

import axios from 'axios'
import clonedeep from 'lodash.clonedeep'

import { AxiosCanceler } from './cancel'

class EAxios {
  private axiosInstance: AxiosInstance
  private readonly options: EAxiosOption

  constructor(options: EAxiosOption) {
    this.options = options
    this.axiosInstance = axios.create(options)
    this.setupInterceptors()
  }

  private setupInterceptors() {
    const {
      requestInterceptors,
      // requestInterceptorsCatch,
      responseInterceptors
      // responseInterceptorsCatch,
    } = this.options?.transform

    const axiosCanceler = new AxiosCanceler()

    // @ts-ignore
    this.axiosInstance.interceptors.request.use((config: RequestConfigWithOptions) => {
      // 业务默认不取消重复请求，需要的手动加上
      config.requestOptions?.cancelRequest && axiosCanceler.addPending(config, config.requestOptions)

      // 配置 mock 请求头
      if (this.options?.serverMode && config.requestOptions?.mock) {
        if (!config.headers) {
          config.headers = {}
        }
        config.headers['x-fe-mock'] = 'fe-mock'
      }

      if (typeof requestInterceptors == 'function') {
        config = requestInterceptors(config)
      }

      return config
    }, undefined)

    this.axiosInstance.interceptors.response.use((res: AxiosResponse<any>) => {
      // @ts-ignore
      res && axiosCanceler.removePending(res.config, res.config.requestOptions)

      if (typeof responseInterceptors == 'function') {
        res = responseInterceptors(res)
      }

      return res
    }, undefined)
  }

  private _beforeEachRequest(conf, opt) {
    const { mockUrl, serverMode } = this.options || {}
    const { mock, apiUrl, joinPrefix, sysPrefix, timeout, headers } = opt

    if (joinPrefix) {
      conf.url = `${sysPrefix || ''}${conf.url}`
    }
    if (typeof apiUrl == 'string') {
      conf.url = serverMode && mock ? `${mockUrl}${conf.url}` : `${apiUrl}${conf.url}`
    }

    // 覆盖全局配置
    if (typeof timeout == 'number') { // 规避 0 为 false
      conf.timeout = timeout
    }
    conf.headers = {
      ...conf.headers,
      ...headers,
    }

    // 对特殊字符进行转义
    if (conf.method?.toUpperCase() == 'GET') {
      // 必须是一个简单对象或 URLSearchParams 对象
      if (typeof conf.params == 'object') {
        for (const key in conf.params) {
          const val = conf.params[key]
          if (typeof val == 'string') {
            conf.params[key] = val.replace(/&/g, '%26').replace(/=/g, '%3D').replace(/\+/g, '%2B')
          }
        }
      } else if (conf.params) { // 有值但不是一个简单对象
        console.error('params must be a plain object')
      }
    }
    // 非GET，业务里就是POST
    // data 仅适用 'PUT', 'POST', 'DELETE 和 'PATCH' 请求方法
    else {
      // 非GET请求如果没有提供data，则将params视为data
      if (!('data' in conf)) {
        conf.data = conf.params
        conf.params = undefined
      }
    }

    const { beforeRequest } = this.options?.transform || {}
    if (typeof beforeRequest == 'function') {
      conf = beforeRequest(conf, opt)
    }

    return conf
  }

  get(config: AxiosRequestConfig, options?: RequestOptions) {
    return this.request({ ...config, method: 'GET' }, options)
  }
  post(config: AxiosRequestConfig, options?: RequestOptions) {
    return this.request({ ...config, method: 'POST' }, options)
  }
  request(config: AxiosRequestConfig, options?: RequestOptions) {
    // 会被直接修改，所以要复制一下
    let conf: RequestConfigWithOptions = clonedeep(config)
    // 单个请求的用户配置项
    const opt = { ...this.options?.requestOptions, ...options }

    this._beforeEachRequest(conf, opt)
    // 挂载一下
    conf.requestOptions = opt

    const { transformResponse, responseCatch } = this.options?.transform || {}
    return this.axiosInstance
      .request(conf)
      .then((res: AxiosResponse) => {
        // 是否返回原生响应头
        if (opt.returnNativeResponse) return res

        // 比如：OSS上的JSON
        if (!opt.needTransformResponse) return res?.data

        // HTTP Exception
        if (!res || res.status !== 200 || !res.data) {
          throw new Error('HTTP Exception')
        }

        if (typeof transformResponse == 'function') {
          try {
            const ret = transformResponse(res, opt)
            return ret
          } catch (e) {
            if (typeof responseCatch == 'function') {
              responseCatch(e, opt)
            }

            return res
          }
        }
        return res
      })
      .catch((error) => {
        // 错误是 被取消 导致的，忽略
        if (axios.isCancel(error)) {
          console.log('Axios Request has been canceled', error)
          return error
        }

        if (typeof responseCatch == 'function') {
          responseCatch(error, opt)
        }

        return error
      })
  }
}

export { axios, EAxios }
