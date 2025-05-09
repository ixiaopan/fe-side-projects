import type { Router } from 'vue-router'
import { createTitleGuard } from './titleGuard'
import { createPermissionGuard } from './permission'

export function setupRouterGuard(router: Router) {
  createTitleGuard(router)
  createPermissionGuard(router)
}
