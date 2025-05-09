import type { AxiosRequestConfig } from 'axios'
import type { RequestOptions } from '..'

import axios from 'axios'
import qs from 'qs'

let pendingMap = new Map()

function getPendingUrl(config: AxiosRequestConfig, opts: RequestOptions) {
  const { cancelRequest, includeParams } = opts || {}
  // 业务默认不取消重复请求，需要的手动加上
  if (!cancelRequest) return

  // 请求方式，参数，请求地址，
  const { method, url, params } = config

  if (includeParams) {
    let nextParam = params

    // 可能只是某几个参数变了，并不是全部参数
    if (includeParams instanceof Array) {
      nextParam = includeParams.reduce((memo, k) => {
        memo[k] = params[k]
        return memo
      }, {})
    }

    return [method, url, qs.stringify(nextParam)].join('&')
  }

  return [method, url].join('&')
}

export class AxiosCanceler {
  addPending(config: AxiosRequestConfig, opts: RequestOptions) {
    this.removePending(config, opts)

    const url = getPendingUrl(config, opts)
    if (!url) return

    config.cancelToken =
      config.cancelToken ||
      new axios.CancelToken((cancel) => {
        if (!pendingMap.has(url)) {
          pendingMap.set(url, cancel)
        }
      })
  }

  removePending(config: AxiosRequestConfig, opts: RequestOptions) {
    const url = getPendingUrl(config, opts)
    if (!url) return

    if (pendingMap.has(url)) {
      const cancel = pendingMap.get(url)

      cancel && cancel()

      pendingMap.delete(url)
    }
  }

  removeAllPending() {
    pendingMap.forEach((cancel) => {
      typeof cancel == 'function' && cancel()
    })

    pendingMap.clear()
  }

  reset(): void {
    pendingMap = new Map()
  }
}
