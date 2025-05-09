import Koa from 'koa'
import koaBody from 'koa-body'
import KoaRouter from '@koa/router'
import mongoose from 'mongoose'

import logger, { logAccess } from './util/log' // must be the first line, otherwise, the `isMock` in log.ts is undefined
import { DB_URL } from './config/db.config'

import { setupCORS } from './controller/cors'
import { setupReportRouter } from './controller/report'
import { setupBasementRouter } from './controller/basement'
import { setupAccountRouter, tokenIntercept } from './controller/account'
import { setupNpmPlatformRouter } from './controller/npmPlatform'
import { setupMockMeRouter } from './controller/mockme'
import { setupShopRouter } from './controller/shop'

main().catch((err) => logger.error(err))

async function main() {
  await mongoose.connect(DB_URL)

  const app = new Koa()
  const router = new KoaRouter()

  //
  router.get('/', (ctx) => {
    ctx.body = 'hello world'
    logger.debug('hello world')
  })

  // 鉴权
  setupCORS(app)

  app.use(tokenIntercept())
  app.use(logAccess())
  app.use(koaBody())

  setupAccountRouter(router)
  setupReportRouter(router)
  setupBasementRouter(router)
  setupNpmPlatformRouter(router)
  setupMockMeRouter(router)
  setupShopRouter(router)

  app.use(router.routes())

  app.on('error', (err) => logger.error(err))

  app.listen(8001, () => {
    logger.info('server listening on 8001')
  })
}
