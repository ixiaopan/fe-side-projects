import { createRouter, createWebHashHistory } from 'vue-router'

const basicRoutes = [
  {
    path: '/',
    name: 'npmPlatform',
    component: () => import('@/views/index.vue'),
    meta: {
      title: 'npm-platform',
    },
  },
  {
    path: '/detail/:id',
    component: () => import('@/views/detail.vue'),
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
