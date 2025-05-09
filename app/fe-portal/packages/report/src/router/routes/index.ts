import { PAGE_ENUM } from '@/enums/appEnum'

export const basicRoutes = [
  {
    path: '/',
    name: PAGE_ENUM.REPORT,
    component: () => import('@/pages/report.vue'),
    meta: {
      title: '写周报',
      sys: '周报系统',
    },
  },
  {
    path: '/:date',
    name: PAGE_ENUM.REPORT_WEEK,
    component: () => import('@/pages/week.vue'),
    meta: {
      title: '本周周报',
      sys: '周报系统',
    },
  },
  {
    path: '/archives',
    name: PAGE_ENUM.REPORT_ARCHIVES,
    component: () => import('@/pages/archives.vue'),
    meta: {
      title: '周报列表',
      sys: '周报系统',
    },
  },
]
