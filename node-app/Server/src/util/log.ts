import * as log4js from 'log4js'
import { isMock } from '../util'

log4js.configure({
  appenders: {
    console: {
      type: 'console',
    },

    // 所有的日志
    app: {
      type: 'file',
      filename: 'log/app.log',
      maxLogSize: 10485760,
    },

    // 访问接口日志
    access: {
      type: 'dateFile',
      filename: 'log/access.log',
      pattern: 'yyyy-MM-dd.log',
      alwaysIncludePattern: true,
    },

    // 错误日志
    error: {
      type: 'dateFile',
      filename: 'log/error.log',
      pattern: 'yyyy-MM-dd.log',
      alwaysIncludePattern: true,
    },
    'just-error': {
      type: 'logLevelFilter',
      appender: 'error',
      level: 'error',
    },
  },

  categories: {
    // 线上配置
    default: {
      appenders: ['just-error', 'app'],
      level: 'info',
    },

    // 本地开发
    dev: {
      appenders: ['console', 'app'],
      level: 'debug',
    },

    // 接口访问
    access: {
      appenders: ['access'],
      level: 'info',
    },
  },
})

let logger = log4js.getLogger()
if (isMock) {
  logger = log4js.getLogger('dev')
}

export default logger

export const logAccess = () => {
  const accessLogger = log4js.getLogger('access')

  return async (ctx, next) => {
    accessLogger.info(
      JSON.stringify({
        url: ctx.url,
        query: ctx.query,
        headers: ctx.request.headers,
        ua: ctx.userAgent,
        timestamp: Date.now(),
      })
    )

    await next()
  }
}
