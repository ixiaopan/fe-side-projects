import cors from 'koa2-cors'

const whiteList = []

export function setupCORS(app) {
  app.use(
    cors({
      origin: (ctx: any) => {
        const url = ctx.header.referer?.substr(0, ctx.header.referer.length - 1)

        if (url && whiteList.some((u) => url.includes(u))) {
          return url
        }

        if (ctx.header['access-control-request-headers']?.includes('x-fe-mock')) {
          return url
        }

        if (ctx.header['x-fe-mock'] == 'fe-mock') {
          return url
        }
      },

      allowMethods: ['POST', 'GET', 'DELETE'],
      // allowHeaders: ['Content-Type', 'x-access-token', 'x-fe-mock'],
    })
  )
}
