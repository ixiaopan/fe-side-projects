export enum PAGE_ENUM {
  LOGIN = 'login',
  HOME = 'home',
  USER = 'user',
}

export enum CARD_TYPE {
  LINK = 'link',
  CARD = 'card',
}

export enum WORK_STATUS {
  WIP = 'WIP',
  DONE = 'DONE',
}

export const PORTAL_LIST = [
  {
    title: '新人手册',
    list: [
      {
        title: '环境配置',
        link: '',
        type: CARD_TYPE.CARD,
      },
      {
        title: '前端规范',
        link: '',
        type: CARD_TYPE.CARD,
      },
      {
        title: '研发流程',
        link: '',
        type: CARD_TYPE.CARD,
      },
      {
        title: '周报系统',
        link: `/child/report`,
        type: CARD_TYPE.LINK,
      },
    ],
  },
  {
    title: '研发平台',
    list: [
      {
        title: 'Basement',
        doc: '',
        git: '',
        link: `/child/basement`,
        desc: '前端迭代管理&发布平台',
        type: CARD_TYPE.CARD,
      },
      {
        title: 'Npm Platform',
        doc: '',
        link: `/child/npm-platform`,
        desc: 'npm包管理平台',
        type: CARD_TYPE.CARD,
      },
      {
        title: 'API Mock',
        git: '',
        link: `/child/mockme`,
        doc: '',
        desc: 'API MOCK',
      },
    ],
  },


  {
    title: '周边小工具',
    list: [
      {
        title: '定时任务',
        git: '',
        link: '',
        doc: '',
        desc: 'MR Hook & Weekly RSS',
      },
    ],
  },
]
