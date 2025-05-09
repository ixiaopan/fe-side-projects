import { createRouter, createWebHashHistory } from 'vue-router'

import { PAGE_ENUM } from '@/enums/appEnum'

const basicRoutes = [
  {
    path: '/',
    name: PAGE_ENUM.BASEMENT_HOME,
    component: () => import('@/pages/index.vue'),
    meta: {
      title: 'Basement',
    },
  },
  {
    path: '/:id',
    name: PAGE_ENUM.BASEMENT_ITER_LIST,
    component: () => import('@/pages/list-next.vue'),
    meta: {
      title: 'Basement',
    },
  },
  {
    path: '/:id/:iid',
    name: PAGE_ENUM.BASEMENT_ITER_AUDIT,
    component: () => import('@/pages/audit.vue'),
    meta: {
      title: 'Basement',
    },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes: basicRoutes,
  scrollBehavior() {
    return { left: 0, top: 0 }
  },
})

export function setupRouter(app) {
  app.use(router)
}

export default router
