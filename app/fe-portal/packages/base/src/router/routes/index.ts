import { ROLE_TYPE } from '@fe-portal/shared'
import buildPage from '@/pages/buildPage'
import { PAGE_ENUM } from '@/enums/appEnum'

const modules = import.meta.globEager('./modules/**/*.ts')

function buildMicroRoutes() {
  const routes = []

  console.log('buildMicroRoutes', __APP_MFE__)

  Object.keys(__APP_MFE__).forEach((name) => {
    const { publicPath, description, mfeName } = __APP_MFE__[name] || {}

    if (name !== 'base') {
      routes.push({
        path: publicPath + ':page*',
        name: mfeName,
        component: buildPage(name),
        meta: {
          title: description,
        },
      })
    }
  })
  return routes
}

const routeModuleList = []
Object.keys(modules).forEach((key) => {
  const mod = modules[key].default || {}
  const modList = Array.isArray(mod) ? [...mod] : [mod]
  routeModuleList.push(...modList)
})
export const asyncRoutes = buildMicroRoutes().concat(routeModuleList)

export const LOGIN_PATH = '/login'
export const WhiteRoutes = [
  {
    path: '/login',
    name: PAGE_ENUM.LOGIN,
    component: () => import('@/pages/login/index.vue'),
    meta: {
      title: '登录',
    },
  },
]

export const ConstantRoutes = [
  {
    path: '/',
    name: 'root',
    component: () => import('@/pages/home/index.vue'),
    meta: {
      title: 'FE Portal',
    },
  },
  {
    path: '/user',
    name: PAGE_ENUM.USER,
    component: () => import('@/pages/user/index.vue'),
    meta: {
      title: '成员管理',
    },
    roles: [ROLE_TYPE.ADMIN],
  },
]

export const PageNotFoundRoute = {
  path: '/:path(.*)*',
  name: 'PageNotFound',
  component: () => import('@/pages/404/index.vue'),
  meta: {
    title: '404',
  },
}

export const basicRoutes = [...WhiteRoutes, ...ConstantRoutes, PageNotFoundRoute]

