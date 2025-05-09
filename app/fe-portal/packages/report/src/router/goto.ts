import router from '@/router'
import { PAGE_ENUM } from '@/enums/appEnum'

// 周报系统
export function goReportPage() {
  router.push({
    name: PAGE_ENUM.REPORT,
  })
}
export function goReportArchivesPage() {
  router.push({
    name: PAGE_ENUM.REPORT_ARCHIVES,
  })
}
export function goReportWeekPage(date: string) {
  router.push({
    name: PAGE_ENUM.REPORT_WEEK,
    params: { date },
  })
}
