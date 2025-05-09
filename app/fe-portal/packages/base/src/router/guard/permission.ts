import type { Router } from 'vue-router'
import { TOKEN_KEY } from '@fe-portal/shared'
import { asyncRoutes, LOGIN_PATH, PageNotFoundRoute, WhiteRoutes } from '@/router/routes'
import { useUserStoreWithout } from '@/store/modules/user'

const whitePathList = WhiteRoutes.map((o) => o.path)

export function createPermissionGuard(router: Router) {
  const userStore = useUserStoreWithout()

  router.beforeEach(async (to, from, next) => {
    const token = localStorage.getItem(TOKEN_KEY)

    // 白名单
    if (whitePathList.includes(to.path)) {
      // 登录状态下进入 login
      if (to.path == LOGIN_PATH && token) {
        try {
          next((to.query?.redirect as string) || '/')
        } catch {}
      }
      // 非Login
      next()
      return
    }

    // 未登录
    if (!token) {
      if (to.meta.ignoreToken) {
        next()
        return
      }

      // 重定向到登录页面
      if (to.path) {
        next({
          path: LOGIN_PATH,
          replace: true,
          // query: {
          //   redirect: to.fullPath,
          // },
        })
        return
      }
    }

    // login后进入404，直接进入主页
    if (from.path == LOGIN_PATH && to.name == PageNotFoundRoute.name) {
      next('/')
      return
    }

    if (!userStore.getUserInfo?.userId) {
      try {
        await userStore.getUserInfoAction()
      } catch (err) {
        next()
        return
      }
    }

    // 缓存了路由了，无需再次创建
    if (userStore?.getDynamicAddedRoute) {
      next()
      return
    }

    // 登录成功之后
    asyncRoutes.forEach((route: any) => {
      console.log('asyncRoutes', route)
      router.addRoute(route)
    })
    router.addRoute(PageNotFoundRoute)
    userStore.setDynamicAddedRoute(true)

    if (to.name === PageNotFoundRoute.name) {
      // 动态添加路由后，此处应当重定向到fullPath，否则会加载404页面内容
      next({ path: to.fullPath, replace: true, hash: to.hash, query: to.query })
    } else {
      const redirect = decodeURIComponent((from.query.redirect || to.path) as string)
      const nextData = to.fullPath === redirect ? { ...to, replace: true } : { path: redirect }
      next(nextData)
    }
  })
}
