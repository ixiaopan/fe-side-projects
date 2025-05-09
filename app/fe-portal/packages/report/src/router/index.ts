import { createRouter, createWebHashHistory } from 'vue-router'

import { basicRoutes } from './routes'
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
