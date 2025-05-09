import { createRouter, createWebHashHistory } from 'vue-router'

const basicRoutes = [
  {
    path: '/',
    name: 'mockme',
    meta: {
      title: 'mockme',
    },
    component: () => import('@/pages/index.vue'),
  },
  {
    path: '/:id',
    component: () => import('@/pages/detail.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes: basicRoutes,
  scrollBehavior() {
    return { left: 0, top: 0 }
  },
})

export function goAppDetail(id: string) {
  router.push({ path: `/${id}` })
}
export function goHome() {
  router.push({ path: '/', replace: true })
}

export function setupRouter(app) {
  app.use(router)
}

export default router
