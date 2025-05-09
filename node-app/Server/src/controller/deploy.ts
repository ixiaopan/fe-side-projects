import logger from '../util/log'
import FlowIns from './flow'
import GitlabService, { createReleaseBranch, getMainBranchByProjectId } from './gitlab'

type IOption = {
  iid: string
  env: ENV_TYPE
  branch: string
  projectId: number
  appId: string
  projectUrl: string
  branchMode: boolean

  devPipelineId: string
  betaPipelineId: string
  prodPipelineId: string
  mrId?: number
  skipCheck?: boolean // 跳过第一步
  skipProdPipeline?: boolean // 跳过生成流水线，比如小程序无法对接flow流水线

  onStart?: Function
  onStepChange?: Function
  onSuccess?: Function
  onFail?: Function
  onReleaseCreated?: Function
  onConflict?: Function
  onJob?: Function // 获取到构建任务的id
  onReleaseLog?: Function // 分支集成的日志
  onCancelRelease?: Function // 取消分支集成因为冲突

  beforeEach?: Function
  afterEach?: Function

  beforeCheck?: Function
  onCheck?: Function
  afterCheck?: Function

  beforeBuild?: Function
  onBuild?: Function
  afterBuild?: Function

  onCancel?: Function

  beforeDeploy?: Function
  onDeploy?: Function
  afterDeploy?: Function

  beforeDone?: Function
  onDone?: Function
  afterDone?: Function
}

enum PIPELINE_STATE {
  WAITING = 'WAITING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
}

const isFunction = (f) => typeof f == 'function'

// 环境类型
export enum ENV_TYPE {
  DEV = 1,
  TEST,
  PRE,
  PROD,
}

export class PipelineManager {
  // 可以有多个，按顺序执行
  devPipeline: MogicPipeline[] = []
  devRunning: MogicPipeline | undefined

  betaPipeline: MogicPipeline[] = []
  betaRunning: MogicPipeline | undefined

  prodPipeline: MogicPipeline[] = []
  prodRunning: MogicPipeline | undefined

  add(data: IOption) {
    const ins = new MogicPipeline({
      ...data,
      onStart: async (o: MogicPipeline) => {
        if (isFunction(data.onStart)) {
          await data.onStart(o)
        }
      },
      beforeEach: async (stage: number) => {
        if (isFunction(data.onStepChange)) {
          await data.onStepChange(stage)
        }
      },
      onJob: async (o: MogicPipeline) => {
        if (isFunction(data.onJob)) {
          await data.onJob(o.pipelineId, o.pipelineRunId, o.jobId)
        }
      },
      afterEach: async (err: string, o: MogicPipeline) => {
        if (err) {
          // 和下面的onCancel可以合二为一
          if (isFunction(data.onFail)) {
            await data.onFail(err, o.currentStage)
          }
          this.next(o.payload.env)
        }
      },
      afterDone: async (err: string, o: MogicPipeline) => {
        if (isFunction(data.onSuccess)) {
          await data.onSuccess(o.currentStage, o.artifacts)
          this.next(o.payload.env)
        }
      },
      onCancel: async (err: string, o: MogicPipeline) => {
        if (isFunction(data.onFail)) {
          await data.onFail(err, o.currentStage)
        }
        this.next(o.payload.env)
      },
    })

    if (data.env == ENV_TYPE.DEV) {
      this.devPipeline.push(ins)
      this.next(ENV_TYPE.DEV)
    }
    //
    else if (data.env == ENV_TYPE.TEST) {
      this.betaPipeline.push(ins)
      this.next(ENV_TYPE.TEST)
    }
    //
    else if (data.env == ENV_TYPE.PROD) {
      this.prodPipeline.push(ins)
      this.next(ENV_TYPE.PROD)
    }

    return ins
  }
  next(env: ENV_TYPE) {
    const _next = (list, running: MogicPipeline) => {
      logger.info('running', running?.payload.branch, running?.state)

      if (!running || (running.state != PIPELINE_STATE.RUNNING && running.state != PIPELINE_STATE.WAITING)) {
        const nextPipeline = list.shift()

        nextPipeline?.start()

        logger.info('next pipeline', nextPipeline?.options?.branch)

        return nextPipeline
      }
      return running
    }

    if (env == ENV_TYPE.DEV) {
      this.devRunning = _next(this.devPipeline, this.devRunning)
    } else if (env == ENV_TYPE.TEST) {
      this.betaRunning = _next(this.betaPipeline, this.betaRunning)
    } else if (env == ENV_TYPE.PROD) {
      this.prodRunning = _next(this.prodPipeline, this.prodRunning)
    }
  }
  findRunByEnv(env) {
    if (env == ENV_TYPE.DEV) {
      return this.devRunning
    }

    if (env == ENV_TYPE.TEST) {
      return this.betaRunning
    }

    if (env == ENV_TYPE.PROD) {
      return this.prodRunning
    }
  }

  static managerByProject = {}
  static create(options: IOption) {
    if (!PipelineManager.managerByProject[options.appId]) {
      PipelineManager.managerByProject[options.appId] = new PipelineManager()
    }

    const ins = PipelineManager.managerByProject[options.appId]
    ins.add(options)
  }
  // 取消流水线部署
  static async cancelByProjectEnvId(env: ENV_TYPE, appId: number, iid: string) {
    const ins = PipelineManager.managerByProject[appId]

    if (env == ENV_TYPE.DEV) {
      if (ins.devRunning.payload.iid == iid) {
        return await ins.devRunning.cancel()
      }
    } else if (env == ENV_TYPE.TEST) {
      if (ins.betaRunning.payload.iid == iid) {
        return await ins.betaRunning.cancel()
      }
    } else if (env == ENV_TYPE.PROD) {
      if (ins.prodRunning.payload.iid == iid) {
        return await ins.prodRunning.cancel()
      }
    }
  }
  // 取消集成
  static async cancelReleaseDueConflict(env: ENV_TYPE, appId: number, iid: string) {
    const ins = PipelineManager.managerByProject[appId]

    if (env == ENV_TYPE.DEV) {
      if (ins.devRunning.payload.iid == iid) {
        return await ins.devRunning.cancelReleaseDueConflict()
      }
    } else if (env == ENV_TYPE.TEST) {
      if (ins.betaRunning.payload.iid == iid) {
        return await ins.betaRunning.cancelReleaseDueConflict()
      }
    }
  }
  static findManagerByProjectId(id: string | number) {
    return PipelineManager.managerByProject[id]
  }
}

export default class MogicPipeline {
  private _transition

  options: IOption

  payload = {
    iid: '',
    branch: '',
    projectId: 0,
    appId: '',
    env: ENV_TYPE.DEV,
  }
  finalRelease = {
    commitId: '',
    releaseBranch: '',
    releaseBranchUrl: '',
  }

  // 分支模式才有这个
  lastRelease: null | {
    releaseBranch: string
    releaseBranchUrl: string
    needCreateBranch: boolean
    sourceBranchList: {
      branch: string
      branchUrl: string
      commitId?: string
    }[]
  }

  _runTimer: any = 0

  pipelineId
  pipelineRunId
  jobId

  currentStage = 0
  state: PIPELINE_STATE = PIPELINE_STATE.WAITING
  error = ''
  artifacts

  _conflictResolver
  _buildResolver
  _deployResolver

  constructor(options: IOption) {
    this.payload.env = options.env
    this.payload.iid = options.iid
    this.payload.projectId = options.projectId
    this.payload.appId = options.appId
    this.payload.branch = options.branch

    this.options = options

    this._transition = [
      {
        name: 'Branch Check',
        from: 'init',
        to: 'check',
      },
      {
        name: 'Build',
        from: 'check',
        to: 'build',
      },
      {
        name: 'Deploy',
        from: 'build',
        to: 'deploy',
      },
      {
        name: 'Done',
        from: 'deploy',
        to: 'done',
      },
    ]

    console.log('pipeline', options)
  }

  // 生产环境发起【合并MR】
  // 开发/测试 根据 skipCheck 判断是否发起【分支集成】
  private async check() {
    logger.info(
      `step 1 check, branchMode: ${this.options.branchMode}, needCreateBranch: ${this.lastRelease?.needCreateBranch}, previous branch: ${this.lastRelease?.releaseBranch}`
    )

    if (this.payload.env == ENV_TYPE.PROD) {
      // 跳过此步骤
      if (this.options.skipCheck) {
        return
      }

      // step 1 检查是否存在MR
      const res = await GitlabService.checkMRExisted({
        projectId: this.payload.projectId,
        mrId: this.options.mrId,
      })
      if (!res) {
        return '请先创建MR（申请发布会自动创建MR）'
      }

      // step 2 MERGE
      const ok = await GitlabService.mergeMR({
        projectId: this.payload.projectId,
        mrId: this.options.mrId,
      })
      if (!ok) {
        return '合入main失败'
      }
    }
    // 开发、测试
    else {
      if (this.options.branchMode) {
        try {
          const { sourceBranchList } = this.lastRelease || {}

          logger.info(`step 1 check, sourceBranchList: ${sourceBranchList?.map((c) => c.branch).join(',')}`)

          // 源分支不能为空
          if (!sourceBranchList?.length) {
            return `source branch is empty`
          }

          // 远程分支是否存在
          const list = await GitlabService.queryAllBranches({ projectId: this.payload.projectId, per_page: 100 })
          const invalidList = sourceBranchList?.filter((o) => {
            const me = list?.find((d) => d.name == o.branch)
            if (me) {
              o.commitId = me?.commit?.id
            }
            return !me
          })
          if (invalidList?.length) {
            return `${invalidList.map((o) => o.branch).join(',')} not exist`
          }

          // 创建/更新对应环境的release分支
          const data: any = await this.stepMerge()

          this.finalRelease = data

          if (isFunction(this.options.onReleaseCreated)) {
            await this.options.onReleaseCreated({
              ...data,
              env: this.payload.env,
              appId: this.options.appId,
              sourceBranchList,
            })
          }
        } catch (e) {
          logger.error(e)
          return e.message || 'failed to create release branch'
        }
      }
    }
  }

  private async stepMerge() {
    try {
      const data = await createReleaseBranch({
        ...this.lastRelease,

        // 说明存在冲突，这时候不需要重新开新的集成分支
        ...(this.finalRelease?.commitId ? { needCreateBranch: false } : null),
        ...(this.finalRelease?.commitId ? { releaseBranch: this.finalRelease.releaseBranch } : null),

        env: this.payload.env,
        remote: this.options.projectUrl,
        mainBranch: getMainBranchByProjectId(this.payload.projectId),

        onReleaseLog: this.options.onReleaseLog,
      })
      return data
    } catch (e) {
      // 冲突的话，手动处理
      // MergeException {
      //   name: 'MergeException',
      //   message: 'CONFLICTS: package.json:content',
      //   detail: {
      //     releaseBranch: 'release/dev-2023-05-18-1684397900508',
      //     commitId: '535403bef18a2b07bebcd2df9428514e3499ecbd'
      //   }
      // }
      logger.info('stepMerge', e)

      if (/CONFLICTS/i.test(e.message)) {
        this.finalRelease.releaseBranch = e.detail?.releaseBranch
        this.finalRelease.releaseBranchUrl = e.detail?.releaseBranchUrl
        this.finalRelease.commitId = e.detail?.commitId

        if (isFunction(this.options.onConflict)) {
          this.options.onConflict(this.finalRelease)
        }

        return new Promise((res) => {
          this._conflictResolver = res
        })
      }

      // 其他错误直接抛出
      throw new Error(e)
    }
  }

  private async build() {
    let runningBranches, pipelineId

    if (this.payload.env == ENV_TYPE.PROD) {
      if (this.options.skipProdPipeline) {
        return
      }
      runningBranches = {
        [this.options.projectUrl]: getMainBranchByProjectId(this.payload.projectId),
      }
      pipelineId = this.options.prodPipelineId
    } else if (this.payload.env == ENV_TYPE.DEV) {
      runningBranches = {
        [this.options.projectUrl]: this.options.branchMode ? this.finalRelease?.releaseBranch : this.payload.branch,
      }
      pipelineId = this.options.devPipelineId
    } else if (this.payload.env == ENV_TYPE.TEST) {
      runningBranches = {
        [this.options.projectUrl]: this.options.branchMode ? this.finalRelease?.releaseBranch : this.payload.branch,
      }
      pipelineId = this.options.betaPipelineId
    }

    logger.info('step 2 building', runningBranches)

    const res = await FlowIns.runPipeline(pipelineId, null, runningBranches)
    this.pipelineId = pipelineId
    this.pipelineRunId = res.pipelineRunId

    this._startLoop()

    return new Promise((res) => {
      this._buildResolver = res
    })
  }
  private async deploy() {
    logger.info('step 3 deploying')

    if (this.payload.env == ENV_TYPE.PROD && this.options.skipProdPipeline) {
      return
    }

    return new Promise((res) => {
      this._deployResolver = res
    })
  }

  private _startLoop() {
    this._runTimer = setInterval(async () => {
      await this.deployRunDetail()
    }, 10 * 1000)
  }

  // --- exported methods
  resolveConflict() {
    // 强制 -1，回到最开始，重新来过
    this.currentStage = -1
    this._conflictResolver(this.finalRelease)
  }
  // 流水线实例的详情
  async deployRunDetail() {
    const res = await FlowIns.queryPipelineRun(this.pipelineId, this.pipelineRunId)

    const stageInfoList = res.pipelineRun.stages.map((s: any) => s.stageInfo)

    // 只记录【构建任务id】
    this.jobId = (((stageInfoList[stageInfoList.length - 2] || {}).jobs || [])[0] || {}).id
    if (isFunction(this.options?.onJob)) {
      await this.options.onJob(this)
    }

    // 整体还在运行
    if (res.pipelineRun.status == 'RUNNING') {
      const idx = stageInfoList.findIndex((s) => s.status == 'RUNNING')

      if (idx - 1 == 0) {
        this._buildResolver && this._buildResolver()
      }
    }

    // 整体失败了
    else if (res.pipelineRun.status == 'FAIL') {
      if (this.currentStage == 1) {
        this._buildResolver && this._buildResolver('构建失败，请查看日志')
      } else if (this.currentStage == 2) {
        this._deployResolver && this._deployResolver('部署失败，请查看日志')
      }
    }

    // 部署成功
    else if (res?.pipelineRun?.status == 'SUCCESS') {
      // 不一定有构建产物
      try {
        const params = JSON.parse(stageInfoList[stageInfoList.length - 1].jobs[0].params)
        const packageLabel = JSON.parse(params.package_label)

        this.artifacts = {
          name: packageLabel.artifact,
          url: packageLabel.downloadUrl,
        }
      } catch (e) {}

      this._deployResolver && this._deployResolver()
    }
  }

  async start() {
    let err: any = ''
    this.state = PIPELINE_STATE.RUNNING

    if (isFunction(this.options?.onStart)) {
      await this.options.onStart(this)
    }

    for (; this.currentStage <= this._transition.length - 1; this.currentStage++) {
      const { to } = this._transition[this.currentStage]

      if (isFunction(this.options?.beforeEach)) {
        await this.options.beforeEach(this.currentStage, this)
      }

      const beforeCb = 'before' + to[0].toUpperCase() + to.slice(1)
      if (isFunction(this.options && this.options[beforeCb])) {
        await this.options[beforeCb](this.currentStage, this)
      }

      switch (to) {
        case 'check':
          err = await this.check()
          break

        case 'build':
          err = await this.build()
          break

        case 'deploy':
          err = await this.deploy()
          break

        default:
          break
      }

      if (err) {
        this.state = PIPELINE_STATE.FAIL
      } else if (to == 'deploy') {
        this.state = PIPELINE_STATE.SUCCESS
      }
      this.error = err

      const afterCb = 'after' + to[0].toUpperCase() + to.slice(1)
      if (isFunction(this.options && this.options[afterCb])) {
        await this.options[afterCb](err, this)
      }

      if (isFunction(this.options?.afterEach)) {
        await this.options.afterEach(err, this)
      }

      if (err) break
    }

    this.destroy()
  }

  // 销毁状态机
  async destroy() {
    logger.info('destroy deploy')

    this._runTimer && clearInterval(this._runTimer)
    this._runTimer = 0
  }

  // 取消分支集成
  async cancelReleaseDueConflict() {
    logger.log('cancel release due conflict')

    if (isFunction(this.options.onCancelRelease)) {
      const ok = await this.options.onCancelRelease({
        appId: this.payload.appId,
        env: this.payload.env,
        sourceBranchList: this.lastRelease?.sourceBranchList,
        releaseBranch: this.finalRelease.releaseBranch,
        releaseBranchUrl: this.finalRelease.releaseBranchUrl,
      })
      if (ok) {
        this.error = '用户取消集成'
        this.state = PIPELINE_STATE.FAIL

        this.destroy()

        if (isFunction(this.options?.onCancel)) {
          await this.options.onCancel(this.error, this)
        }
        return ok
      }
    }
  }
  // 取消部署
  async cancel() {
    logger.log('cancel deploy')

    // 不在运行中。。。
    if (this.state != PIPELINE_STATE.RUNNING) {
      return true
    }

    const res = await FlowIns.cancelPipelineRun(this.pipelineId, this.pipelineRunId)
    if (res?.success) {
      this.error = '用户取消部署'
      this.state = PIPELINE_STATE.FAIL

      this.destroy()

      if (isFunction(this.options?.onCancel)) {
        await this.options.onCancel(this.error, this)
      }

      return res?.success
    }
  }
}
