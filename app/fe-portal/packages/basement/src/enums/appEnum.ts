export enum PAGE_ENUM {
  // 发布平台
  BASEMENT_HOME = 'basementHome',
  BASEMENT_ITER_LIST = 'basementIterList',
  BASEMENT_ITER_AUDIT = 'basementIterAudit',
}

// 环境类型
export enum ENV_TYPE {
  DEV = 1,
  TEST,
  PRE,
  PROD,
}

export const ENV_TEXT = {
  [ENV_TYPE.DEV]: '开发环境',
  [ENV_TYPE.TEST]: '测试环境',
  [ENV_TYPE.PRE]: '预发环境',
  [ENV_TYPE.PROD]: '生产环境',
}

// 迭代状态
export enum ITER_STATUS {
  INIT = 1,
  DEV,
  TESTING,
  UAT,
  PUBLISHING,
  PUBLISHED,
  INVALID,
}

export const ITER_STATUS_TEXT = {
  [ITER_STATUS.INIT]: '待开发',
  [ITER_STATUS.DEV]: '开发中',
  [ITER_STATUS.TESTING]: '提测中',
  [ITER_STATUS.UAT]: 'UAT验收',
  [ITER_STATUS.PUBLISHING]: '发布审批中',
  [ITER_STATUS.PUBLISHED]: '已上线',
  [ITER_STATUS.INVALID]: '已失效',
}

export const ITER_STATUS_TAG_COLOR = {
  [ITER_STATUS.INIT]: 'default', // 待开发
  [ITER_STATUS.DEV]: 'blue', // 开发中
  [ITER_STATUS.TESTING]: 'purple', // 提测中
  [ITER_STATUS.UAT]: 'orange', // 验收中
  [ITER_STATUS.PUBLISHING]: 'red', // 审批中
  [ITER_STATUS.PUBLISHED]: 'green', // 已经上线
  [ITER_STATUS.INVALID]: 'red', // 失效
}

export const TEMPLATE_LIST = [
  {
    label: 'pc端模版',
    value: 'pc-template',
  },
  {
    label: 'h5模版',
    value: 'h5-template',
  },
  {
    label: 'node服务模版',
    value: 'node-server',
  },
  {
    label: 'vite插件模版',
    value: 'vite-plugin',
  },
  {
    label: 'npm sdk模版',
    value: 'npm-sdk',
  },
  {
    label: '空模版',
    value: 'blank',
  },
]

export enum PIPELINE_STATE {
  WAITING = 'WAITING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
}

export enum BRANCH_PREFIX {
  STORY = 'story',
  HOTFIX = 'hotfix',
  REFACTOR = 'refactor',
  RELEASE = 'release',
}

export enum BIZ_TYPE {
  WEB = 'web',
  H5 = 'h5',
  MINI_PROGRAM = 'mini-program',
}

export const BIZ_TYPE_LIST = [
  {
    label: 'web',
    value: BIZ_TYPE.H5,
  },
  {
    label: 'h5',
    value: BIZ_TYPE.H5,
  },
  {
    label: '小程序',
    value: BIZ_TYPE.MINI_PROGRAM,
  },
]
