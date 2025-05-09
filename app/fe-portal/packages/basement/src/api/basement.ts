import { createAxios } from '@fe-portal/shared'

const axios = createAxios({ baseURL: import.meta.env.VITE_API_URL })

export default {
  // 创建应用
  async createBasement(data: {
    name: string
    nameAlias?: string
    desc?: string
    template?: string
    type: string
    autoGit: number
    projectId?: number
    url?: string

    devPipelineId?: string | number
    betaPipelineId?: string | number
    prodPipelineId?: string | number

    branchMode?: boolean
    needProdAudit?: boolean
    monorepo?: boolean
  }) {
    return (await axios.post('/basement/create', data)).data
  },
  // 更新应用
  async updateBasement(data: {
    id?: string
    desc?: string
    type?: string
    url?: string
    nameAlias?: string

    devPipelineId?: string | number
    betaPipelineId?: string | number
    prodPipelineId?: string | number

    branchMode?: boolean
    needProdAudit?: boolean
    monorepo?: boolean
  }) {
    return (await axios.post('/basement/update', data)).data
  },
  // 获取所有的业务项目
  async fetchBasement() {
    return (await axios.get('/basement/queryList')).data
  },
  // 获取应用信息
  async fetchBasementDetail(data: { id: string }) {
    return (await axios.post('/basement/detail', data)).data
  },
  // 删除应用
  async delBasement(data: { id: string }) {
    return (await axios.post('/basement/delete', data)).data
  },

  // 获取当前应用所有 需求迭代列表
  async fetchIterList(appId: string, type = 0) {
    return (await axios.get(`/basement/queryIterList`, { params: { appId, type } })).data
  },
  // 创建迭代
  async createIter(payload: {
    appId: string
    projectId: number
    projectName: string
    title: string
    desc?: string
    pd?: string
    prd?: string
    ui?: string
    analysis?: string
    owner?: { name: string; userId: string }[]
    autoBranch?: number
    branch: string
    branchUrl: string
    uatDate: number
    testDate: number
    pubDate: number
    requireBackend?: number
    remark?: string
  }) {
    return (await axios.post(`/basement/createIter`, payload)).data
  },
  // 更新迭代
  async updateIter(payload: {
    iid: number | string
    title: string
    desc?: string
    pd?: string
    prd?: string
    ui?: string
    analysis?: string
    owner?: { name: string; userId: string }[]
    uatDate: number
    testDate: number
    pubDate: number
    lastTest: number
    lastUAT: number
    lastPub: number
    remark?: string
  }) {
    return (await axios.post(`/basement/updateIter`, payload)).data
  },
  // 删除迭代
  async delInter(payload: { iid: number | string }) {
    return (await axios.post(`/basement/delIter`, payload)).data
  },
  // 获取迭代详情
  async fetchIterDetail(payload: { iid: number | string }) {
    return (await axios.get(`/basement/fetchIterDetail?iid=${payload.iid}`)).data
  },
  // 获取迭代的日报列表
  async fetchIterDailyList(params: { iid: number | string }) {
    return (await axios.get(`/basement/queryIterDailyReportList`, { params })).data
  },
  // 新增当日日报
  async addIterDaily(payload: { iid: number | string; content: string; date: number; synced?: number }) {
    return (await axios.post(`/basement/addIterDailyReport`, payload)).data
  },
  // Sync日报
  async syncIterDaily(payload: { iid: number | string; _id: string; content: string; date: number }) {
    return (await axios.post(`/basement/syncIterDailyReport`, payload)).data
  },
  // 变更状态：提测、废弃
  async updateIterStatus(payload: {
    iid: string
    status: number
    revert?: boolean
    ownerId?: string
    ownerName?: string
    auditId?: string
    auditName?: string
    desc?: string
    url?: string
  }) {
    return (await axios.post(`/basement/updateIterStatus`, payload)).data
  },
  // 提醒提测
  async reminderTesting(payload: { iid: string; type: number }) {
    return (await axios.post(`/basement/reminderIterTesting`, payload)).data
  },

  // 同意发布
  async agreeIterPub(payload: { iid: string; force?: number }) {
    return (await axios.post(`/basement/agreeIterPub`, payload)).data
  },
  // 检查是否有发布中的
  async checkIterPublishing(params: { appId: string }) {
    return (await axios.get(`/basement/checkIterPublishing`, { params })).data
  },

  // 部署
  async deploy(data: { env: number; iid: string; appId: string; projectId: number; skipCheck?: boolean; skipProdPipeline?: boolean }) {
    return (await axios.post(`/basement/deploy`, data)).data
  },
  // 集成分支日志
  async queryReleaseLog(params: { iid: string }) {
    return (await axios.get(`/basement/queryReleaseLog`, { params })).data
  },
  // 流水线job执行的详情
  async queryJobDetail(params: { env: number; iid: string }) {
    return (await axios.get(`/basement/queryJobDetail`, { params })).data
  },
  // 取消集成因为分支冲突
  async offlineConflictRelease(data: { env: number; iid: string; appId: string }) {
    return (await axios.post(`/basement/offlineConflictRelease`, data)).data
  },
  // 取消执行流水线
  async cancelPipelineRun(data: { env: number; iid: string; appId: string }) {
    return (await axios.post(`/basement/cancelPipelineRun`, data)).data
  },
  // 查询相同应用下，部署在同一环境的分支列表
  async queryRunBranchesByEnv(params: { env: number; appId: string }) {
    return (await axios.get('/basement/queryRunBranchesByEnv', { params })).data
  },
  async resolveConflict(data: { env: number; iid: string; appId: string }) {
    return (await axios.post(`/basement/resolveConflict`, data)).data
  },
  async offlineEnv(data: { env: number; iid: string; appId: string }) {
    return (await axios.post(`/basement/offlineEnv`, data)).data
  },

  // 根据正则匹配分支
  async queryBranchByReg(params: { appId: string; projectId: number; type: string }) {
    return (await axios.get(`/basement/queryBranchByReg`, { params })).data
  },
  // 根据分支名查询迭代状态
  async queryIterStatusByName(params: { appId: string; nameList: string }) {
    return (await axios.get(`/basement/queryIterStatusByName`, { params })).data
  },
  // 删除分支
  async delBranchByName(data: { projectId: number; branch: string }) {
    return (await axios.post(`/basement/delBranchByName`, data)).data
  },
  // 根据 迭代 查询 mr 列表
  async queryMRGroupByIter(params: { projectId: number; state: string }) {
    return (await axios.get(`/basement/queryMRGroupByIter`, { params })).data
  },
  // 创建一个MR
  async createMergeRequest(data: {
    projectId: number
    sourceBranch: string
    targetBranch: string
    reviewer?: string[]
  }) {
    return (await axios.post(`/basement/createMergeRequest`, data)).data
  },
  // 查询tags
  async queryTags(params: { projectId: number }) {
    return (await axios.get(`/basement/queryTags`, { params })).data
  },
}
