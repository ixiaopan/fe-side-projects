import type { Router } from 'vue-router'

export function createTitleGuard(router: Router) {
  router.afterEach(async (to) => {
    document.title = to.meta.title || ''

    const mainTitle = document.querySelector('#layout-title')
    if (mainTitle) {
      mainTitle.innerHTML = to.meta.sys || to.meta.title || ''
    }
    return true
  })
}
