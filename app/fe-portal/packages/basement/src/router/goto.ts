import router from '@/router'
import { PAGE_ENUM } from '@/enums/appEnum'

export function openNewTab(url: string, replace?: boolean) {
  if (!url) return

  if (replace) {
    window.location.href = url
    return
  }

  return window.open(url, '_blank')
}

export function goBasementPage() {
  router.push({
    name: PAGE_ENUM.BASEMENT_HOME,
  })
}
export function goAppOverviewPage(appId: string) {
  router.push({
    name: PAGE_ENUM.BASEMENT_ITER_LIST,
    params: { id: appId },
  })
}
export function goBasementAuditPage(appId: string, iid: number) {
  router.push({
    name: PAGE_ENUM.BASEMENT_ITER_AUDIT,
    params: { id: appId, iid },
  })
}
