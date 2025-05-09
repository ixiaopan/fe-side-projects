import { isMock } from '../util'
import logger from '../util/log'

const DB_CONFIG = {
  MOCK: {
    user: '',
    pwd: '',
    host: '127.0.0.1',
    port: 27017,
    db: 'side-project',
  },

  PROD: {
    user: '',
    pwd: '',
    host: '',
    port: 27017,
    db: '',
  },
}

function transformDBUrl(config: { user?: string; pwd?: string; host: string; port: number; db: string }) {
  if (!config?.host) {
    logger.fatal('db host is required')
    return
  }

  if (!config?.port) {
    logger.fatal('db port is required')
    return
  }

  if (!config?.db) {
    logger.fatal('db name required')
    return
  }

  const userPwd = config.user && config.pwd ? config.user + ':' + config.pwd + '@' : ''
  const suffix = isMock ? '' : '?authSource=admin'

  logger.info(userPwd ? `DB is accessed by ${config.user} with pwd` : 'DB is accessed w/o pwd')

  return `mongodb://${userPwd}${config.host}:${config.port}/${config.db}${suffix}`
}

export const DB_URL = transformDBUrl(isMock ? DB_CONFIG.MOCK : DB_CONFIG.PROD)
