import { createRouter, createWebHistory } from 'vue-router'

import { basicRoutes } from './routes'

const router = createRouter({
  history: createWebHistory('base'),
  routes: basicRoutes,
  scrollBehavior() {
    return { left: 0, top: 0 }
  },
})

export function setupRouter(app) {
  app.use(router)
}

export default router
