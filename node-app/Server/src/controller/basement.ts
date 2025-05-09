/**
 * @file 迭代管理模型
 */

import mongoose from 'mongoose'
import dayjs from 'dayjs'

import { RESPONSE_ENUM } from '../enum/httpEnum'
import { sendPublishReminder, sendPlainText } from '../util/message'
import GitlabService from './gitlab'
import FlowIns from '../controller/flow'
import MogicPipeline, { ENV_TYPE, PipelineManager } from './deploy'

enum ITER_STATUS {
  INIT = 1,
  DEV,
  TESTING,
  UAT,
  PUBLISHING,
  PUBLISHED,
  INVALID,
}

const BasementSchema = new mongoose.Schema(
  {
    projectId: {
      // gitlab project id
      type: Number,
      required: [true, 'projectId is required'],
    },
    name: {
      type: String,
      required: [true, 'name is required'],
    },
    nameAlias: String, // 应用别名，兼容 monorepo
    url: {
      type: String,
      required: [true, 'url is required'],
    },
    desc: String,
    template: String,
    type: String,

    // 部署流水线
    devPipelineId: String,
    betaPipelineId: String,
    prodPipelineId: String,

    // 跳过部署第一步 【分支管理器】有些项目没有这一步
    branchMode: Boolean,
    // 是否需要发布审批
    needProdAudit: Boolean,
    monorepo: Boolean,
  },
  {
    timestamps: true,
  }
)
const BasementModel = mongoose.model('basement', BasementSchema)

const IterationSchema = new mongoose.Schema(
  {
    // 对于 monorepo 的项目，无法使用gitProjectId区分
    appId: String, // 20230818新增 ObjectId 来区分
    projectId: {
      type: Number,
      required: [true, 'projectId is required'],
    },
    projectName: String,

    title: {
      type: String,
      required: [true, '需求名称 is required'],
    },
    desc: String,
    pd: String,
    prd: String,
    ui: String,
    analysis: String, // 系分文档

    branch: {
      type: String,
      required: [true, '分支名称 is required'],
    },
    branchUrl: {
      type: String,
      required: [true, '分支URL is required'],
    },
    owner: [
      {
        name: String,
        userId: String,
      },
    ],
    requireBackend: {
      type: Number,
      required: [true, '是否依赖 is required'],
    },
    // 迭代状态
    status: {
      type: Number,
      default: ITER_STATUS.INIT,
    },
    remark: String,

    testDate: {
      type: Number,
      required: [true, '提测时间 is required'],
    },
    lastTestDate: Number, // 真正提测的时间
    testDateHistory: [Number],

    uatDate: Number,
    lastUATDate: Number, // 真正UAT的时间
    uatDateHistory: [Number],

    pubDate: {
      type: Number,
      required: [true, '上线时间 is required'],
    },
    lastPubDate: Number, // 真正上线的时间
    pubDateHistory: [Number],

    dailyReportList: [
      // 日报
      {
        content: String,
        date: Number, // timestamp
        synced: Number,
      },
    ],

    // 部署的环境
    dev: Boolean, // 一个快捷标记，表示是否在部署
    devBranch: {
      integrated: Boolean,
      commitId: String,
      releaseBranch: String,
      releaseBranchUrl: String,
    },
    devDeploy: {
      startTime: Number,
      endTime: Number,

      pipelineId: Number,
      pipelineRunId: Number,
      jobId: Number,

      stage: Number,
      error: String,
      operator: String,
      status: String,
      // 构建产物
      artifacts: {
        name: String,
        url: String,
      },
    },
    devReleaseLog: String, // 分支集成的日志

    beta: Boolean,
    betaBranch: {
      integrated: Boolean,
      commitId: String,
      releaseBranch: String,
      releaseBranchUrl: String,
    },
    betaDeploy: {
      startTime: Number,
      endTime: Number,

      pipelineId: Number,
      pipelineRunId: Number,
      jobId: Number,

      stage: Number,
      error: String,
      operator: String,
      status: String,
      // 构建产物
      artifacts: {
        name: String,
        url: String,
      },
    },
    betaReleaseLog: String, // 分支集成的日志

    prodMR: {
      id: Number,
      title: String,
      web_url: String,
    },
    prod: Boolean,
    prodDeploy: {
      startTime: Number,
      endTime: Number,

      pipelineId: Number,
      pipelineRunId: Number,
      jobId: Number,

      stage: Number,
      error: String,
      branch: String,
      operator: String,
      status: String,
      // 构建产物
      artifacts: {
        name: String,
        url: String,
      },
    },

    // 发布审批
    audit: {
      userId: String,
      userName: String,
      agreed: Number,
      desc: String,
    },

    // mr
    mrList: [
      {
        mrId: String,
        userName: [String],
      },
    ],
  },
  {
    timestamps: true,
  }
)
const IterationModel = mongoose.model('iteration', IterationSchema)

class BasementController {
  prefix = '/basement'

  // 创建应用
  async create(ctx: any) {
    const {
      name,
      nameAlias,
      template,
      type,
      desc,
      autoGit,
      projectId,
      url,

      devPipelineId,
      betaPipelineId,
      prodPipelineId,

      branchMode,
      needProdAudit,
      monorepo,
    } = ctx.request?.body || {}

    if (!name || (!autoGit && (!projectId || !url))) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'appName/appId/appUrl is required',
      })
    }

    let data = { id: projectId, http_url_to_repo: url }
    if (autoGit) {
      data = await GitlabService.createGitProject({ name, template, desc })
      if (!data?.id) {
        return (ctx.body = {
          code: RESPONSE_ENUM.FAIL,
          msg: 'create project failed',
        })
      }
    }

    const doc = await BasementModel.create({
      projectId: data.id,
      url: data.http_url_to_repo,

      name,
      nameAlias,
      desc,
      template,
      type,

      devPipelineId,
      betaPipelineId,
      prodPipelineId,

      branchMode,
      needProdAudit,
      monorepo,
    })
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'create project failed',
      })
    }
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc.projectId,
    }
  }
  // 更新应用
  async update(ctx: any) {
    const {
      id,
      desc,
      url,
      type,
      nameAlias,
      devPipelineId,
      betaPipelineId,
      prodPipelineId,
      branchMode,
      needProdAudit,
      monorepo,
    } = ctx.request?.body || {}

    if (!id) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'id is required',
      })
    }

    const oldV = await BasementModel.findByIdAndUpdate(id, {
      nameAlias,
      desc,
      url,
      type,

      devPipelineId,
      betaPipelineId,
      prodPipelineId,

      branchMode,
      needProdAudit,
      monorepo,
    })
    if (!oldV) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'update failed',
      })
    }

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }
  // 应用列表
  async queryList(ctx: any) {
    // 留个口子，清理脏数据
    if (ctx.query?.backdoor) {
      const doc = await BasementModel.find()
      ctx.body = {
        code: RESPONSE_ENUM.SUCCESS,
        msg: 'success',
        data: doc,
      }
      return
    }

    const docList = await BasementModel.aggregate([
      {
        $addFields: { id: { $toString: '$_id' } },
      },
      {
        $lookup: {
          from: 'iterations',
          localField: 'id',
          foreignField: 'appId',
          as: 'iterList',
        },
      },
      {
        $project: {
          projectId: 1,
          nameAlias: 1,
          name: 1,
          url: 1,
          monorepo: 1,
          desc: 1,
          type: 1,
          iterNum: {
            $size: {
              $filter: {
                input: '$iterList',
                as: 'item',
                cond: {
                  $in: ['$$item.status', [ITER_STATUS.INIT, ITER_STATUS.DEV, ITER_STATUS.TESTING, ITER_STATUS.UAT]],
                },
              },
            },
          },
          id: '$_id',
          _id: 0,
        },
      },
    ])

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: docList,
    }
  }
  // 获取应用信息
  async getAppDetail(ctx: any) {
    const { id } = ctx.request?.body || {}
    const doc = await BasementModel.findById(id, { __v: 0, createdAt: 0, updatedAt: 0 })
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc,
    }
  }
  // 删除应用
  async delete(ctx: any) {
    const { id } = ctx.request?.body || {}
    const doc = await BasementModel.findByIdAndDelete(id)
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'del failed',
      })
    }
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }

  // --- 创建迭代
  // 获取迭代列表
  async queryIterList(ctx: any) {
    const { appId, projectId, type = 0 } = ctx.request.query

    // 留个口子，清理脏数据
    if (type == -1) {
      const doc = await IterationModel.find({
        ...(appId ? { appId } : null),
        ...(projectId ? { projectId } : null),
      })
      ctx.body = {
        code: RESPONSE_ENUM.SUCCESS,
        msg: 'success',
        data: doc,
      }
      return
    }

    const doc = await IterationModel.find(
      {
        appId,
        status: type == 0 ? { $ne: ITER_STATUS.PUBLISHED } : ITER_STATUS.PUBLISHED,
      },
      {
        __v: 0,
        createdAt: 0,
        updatedAt: 0,
        'owner._id': 0,
      }
    )
      .sort(type == 0 ? { status: 1, createdAt: -1 } : { 'prodDeploy.endTime': -1 })
      .limit(20)
    // -1 是降序

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc,
    }
  }
  // 创建迭代
  async createIter(ctx: any) {
    const {
      appId = '',
      projectId,
      projectName = '',
      title,
      desc,
      pd,
      prd,
      ui,
      analysis,
      owner,
      autoBranch,
      branch,
      branchUrl,
      requireBackend,
      pubDate,
      testDate,
      uatDate,
      remark,
    } = ctx.request?.body || {}

    if (!appId || !projectId || !owner?.length || !pubDate || !testDate || !title) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'params is required',
      })
    }

    const exist = await IterationModel.findOne({ projectId, branch })
    if (exist) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: '分支已存在',
      })
    }

    let data = { name: branch, web_url: branchUrl }
    if (autoBranch) {
      // @ts-ignore
      data = await GitlabService.createGitBranch({ projectId, branch })
      if (!data?.name) {
        return (ctx.body = {
          code: RESPONSE_ENUM.FAIL,
          msg: '创建分支失败',
        })
      }
    }

    const res = await IterationModel.create({
      appId,
      projectId: Number(projectId),
      projectName,
      title,
      desc,
      pd,
      prd,
      ui,
      analysis,
      owner,
      branch: data.name,
      branchUrl: data.web_url,
      requireBackend,
      testDate,
      uatDate,
      pubDate,
      status: ITER_STATUS.DEV,
      remark,
    })
    if (!res) {
      ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'add iteration to db failed',
      }
      return
    }
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }
  // 更新迭代
  updateIter = async (ctx: any) => {
    const {
      iid,
      title,
      desc,
      pd,
      prd,
      ui,
      analysis,
      owner,
      remark,
      testDate,
      uatDate,
      pubDate,
      lastTest,
      lastUAT,
      lastPub,
      backdoor,
    } = ctx.request?.body || {}
    // 留个后门
    if (backdoor) {
      const body = ctx.request?.body || {}

      const data = Object.keys(body).reduce((m, k) => {
        if (k != 'backdoor' && k != 'iid' && k != 'projectId') {
          m[k] = body[k]
        }
        return m
      }, {})

      await IterationModel.findByIdAndUpdate(iid, data)

      ctx.body = {
        code: RESPONSE_ENUM.SUCCESS,
        msg: 'success',
        data,
      }
      return
    }

    if (!owner?.length || !title || !pubDate || !testDate) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'params is required',
      })
    }

    const res = await IterationModel.findByIdAndUpdate(iid, {
      title,
      desc,
      owner,
      pd,
      prd,
      ui,
      analysis,
      remark,
      pubDate,
      testDate,
      uatDate,
      $addToSet: {
        testDateHistory: lastTest,
        uatDateHistory: lastUAT,
        pubDateHistory: lastPub,
      },
    })
    if (!res) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'update iter failed',
      })
    }

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }
  // 删除迭代
  async deleteIter(ctx: any) {
    const { iid } = ctx.request?.body || {}

    const res = await IterationModel.findByIdAndDelete(iid)
    if (!res) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'remove iter failed',
      })
    }
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }
  // 获取迭代详情
  async fetchIterDetail(ctx: any) {
    const { iid } = ctx.request.query || {}

    let doc = await IterationModel.findById(iid, { __v: 0, createdAt: 0, updatedAt: 0, 'owner.userId': 0 })

    // 兼容 fe-portal-server 部署导致服务器重启，从而定时器中断，无法获取flow详情
    if (doc?.projectId == 265 && !PipelineManager.findManagerByProjectId(doc.appId)) {
      let pipelineId, pipelineRunId, stage
      if (doc.dev || doc.devDeploy?.status == 'RUNNING') {
        stage = doc.devDeploy?.stage
        pipelineId = doc.devDeploy?.pipelineId
        pipelineRunId = doc.devDeploy?.pipelineRunId
      }
      // 测试
      else if (doc.beta || doc.betaDeploy?.status == 'RUNNING') {
        stage = doc.betaDeploy?.stage
        pipelineId = doc.betaDeploy?.pipelineId
        pipelineRunId = doc.betaDeploy?.pipelineRunId
      }
      // 生产
      else if (doc.prod || doc.prodDeploy?.status == 'RUNNING') {
        stage = doc.prodDeploy?.stage
        pipelineId = doc.prodDeploy?.pipelineId
        pipelineRunId = doc.prodDeploy?.pipelineRunId
      }

      // 最后【部署阶段】才会发生服务器重启
      if (stage == 2) {
        const res = await FlowIns.queryPipelineRun(pipelineId, pipelineRunId)

        if (res?.pipelineRun?.status == 'SUCCESS') {
          const stageInfoList = res.pipelineRun.stages.map((s: any) => s.stageInfo)
          // 不一定有构建产物
          let artifacts
          try {
            const params = JSON.parse(stageInfoList[stageInfoList.length - 1].jobs[0].params)
            const packageLabel = JSON.parse(params.package_label)

            artifacts = {
              name: packageLabel.artifact,
              url: packageLabel.downloadUrl,
            }
          } catch (e) {}

          doc = await IterationModel.findByIdAndUpdate(iid, {
            ...(doc.dev || doc.devDeploy?.status == 'RUNNING'
              ? {
                  dev: false,
                  'devDeploy.stage': 4,
                  'devDeploy.endTime': Date.now(),
                  'devDeploy.status': 'SUCCESS',
                  'devDeploy.error': '',
                  'devDeploy.artifacts': artifacts,
                }
              : null),

            ...(doc.beta || doc.betaDeploy?.status == 'RUNNING'
              ? {
                  beta: false,
                  'betaDeploy.stage': 4,
                  'betaDeploy.endTime': Date.now(),
                  'betaDeploy.status': 'SUCCESS',
                  'betaDeploy.error': '',
                  'betaDeploy.artifacts': artifacts,
                }
              : null),

            ...(doc.prod || doc.prodDeploy?.status == 'RUNNING'
              ? {
                  prod: false,
                  'prodDeploy.stage': 4,
                  'prodDeploy.endTime': Date.now(),
                  'prodDeploy.status': 'SUCCESS',
                  'prodDeploy.error': '',
                  'prodDeploy.artifacts': artifacts,
                  status: ITER_STATUS.PUBLISHED,
                }
              : null),
          })
        }
      }
    }

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc?.toJSON(),
    }
  }
  // 状态变更：提测、UAT、废弃、发布审批
  async updateIterStatus(ctx: any) {
    const { iid, status, revert, ownerId, ownerName, auditId, auditName, desc, url } = ctx.request.body || {}

    const doc = await IterationModel.findById(iid)
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: '迭代不存在',
      })
    }

    let res

    // 撤销状态
    if (revert) {
      res = await IterationModel.findByIdAndUpdate(iid, {
        status,
        'audit.userId': '',
        'audit.userName': '',
        'audit.desc': '',
        'audit.agreed': 0,
      })
    }

    // 发布中
    else if (status == ITER_STATUS.PUBLISHING) {
      // 申请的时候，会自动创建 MR
      let existedMR2Main = await GitlabService.checkMRExisted({
        projectId: doc.projectId,
        source_branch: doc.branch,
      })
      if (!existedMR2Main) {
        const mrRes = await GitlabService.createMR({
          title: doc.title,
          projectId: doc.projectId,
          source_branch: doc.branch,
        })
        if (!mrRes) {
          return (ctx.body = {
            code: RESPONSE_ENUM.FAIL,
            msg: '创建MR失败，请重试',
          })
        }
        existedMR2Main = mrRes
      }

      res = await IterationModel.findByIdAndUpdate(iid, {
        status,
        'audit.userId': auditId,
        'audit.userName': auditName,
        'audit.desc': desc,
        prodMR: {
          id: existedMR2Main.iid,
          title: existedMR2Main.title,
          web_url: existedMR2Main.web_url,
        },
      })

      // 机器人提醒到前端群，通知 【审批】
      try {
        if (res?.title && auditId && auditName) {
          sendPublishReminder({
            url,
            title: `【${res?.projectName}】${res?.title}(${res?.branch})`,
            ownerId,
            ownerName,
            auditId,
            auditName,
            remark: desc,
          })
        }
      } catch (e) {}
    }

    // 其他状态
    else {
      res = await IterationModel.findByIdAndUpdate(iid, { status })
    }

    if (!res) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'error',
      })
    }
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }
  // 提醒去提测
  async reminderIterTesting(ctx: any) {
    const { iid, type } = ctx.request.body || {}

    const doc = await IterationModel.findById(iid, { owner: 1, title: 1 })

    if (doc?.owner?.length && [1, 2].includes(type)) {
      const userAt = doc.owner?.map((u) => `<at user_id="${u.userId}">${u.name}</at>`)
      if (type == 1) {
        sendPlainText(`${userAt} ${doc.title} 【请及时提测】`)
      } else if (type == 2) {
        sendPlainText(`${userAt} ${doc.title} 【请及时上线】`)
      }
      return (ctx.body = {
        code: RESPONSE_ENUM.SUCCESS,
        msg: 'success',
        data: true,
      })
    }

    ctx.body = {
      code: RESPONSE_ENUM.FAIL,
      msg: 'reminder fail',
    }
  }
  // 在 分支管理 用到的
  async fetchIterStatusByBranchName(ctx: any) {
    const { appId, nameList } = ctx.request.query || {}

    const nextNameList = nameList.split(',')
    if (!nextNameList?.length) {
      ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'nameList invalid',
      }
      return
    }

    const data = await IterationModel.find(
      {
        appId,
        branch: { $in: nextNameList },
      },
      { branch: 1, title: 1, status: 1, _id: 1 }
    )

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'SUCCESS',
      data,
    }
  }

  // ---- 发布检查
  // 检查是否存在在发布中的迭代
  async checkIterPublishing(ctx: any) {
    const { appId } = ctx.request.query || {}
    if (!appId) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'params error',
      })
    }

    const doc = await IterationModel.find({ appId, status: ITER_STATUS.PUBLISHING })
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'check publishing error',
      })
    }

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: !!doc?.length,
    }
  }
  // 同意发布
  async agreeIterPub(ctx: any) {
    const u = ctx.state.user
    const { iid, force } = ctx.request.body || {}

    const doc = await IterationModel.findById(iid)
    if (doc && (force == 1 || (u && doc?.audit?.userId == u?.userId))) {
      const oldV = await IterationModel.findByIdAndUpdate(iid, {
        'audit.agreed': 1,
        ...(force == 1 ? { status: ITER_STATUS.PUBLISHING } : null),
      })

      if (oldV) {
        const userAt = doc.owner?.map((u) => `<at user_id="${u.userId}">${u.name}</at>`)
        sendPlainText(`${userAt} 已同意发布`)

        ctx.body = {
          code: RESPONSE_ENUM.SUCCESS,
          msg: 'success',
          data: true,
        }
        return
      }
    }

    ctx.body = {
      code: RESPONSE_ENUM.FAIL,
      msg: 'agree error',
    }
  }

  // --- 项目进度日报
  async queryDailyReportList(ctx: any) {
    const { iid } = ctx.request?.query || {}

    const doc = await IterationModel.findById(iid, { dailyReportList: 1 })
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc.dailyReportList.slice().reverse(),
    }
  }
  async createIterDailyReport(ctx: any) {
    const { iid, content, date, synced = 0 } = ctx.request?.body || {}

    if (!content || !date) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'content/date is required',
      })
    }

    const oldV = await IterationModel.findByIdAndUpdate(iid, {
      $push: {
        dailyReportList: {
          content,
          date,
          synced,
        },
      },
    })

    if (synced) {
      try {
        const d = await IterationModel.findById(iid, { title: 1 })
        sendPlainText(`${dayjs(date).format('MM-DD')} ${d.title}\n${content}`)
      } catch (e) {}
    }

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: !!oldV,
    }
  }
  // 同步到前端群
  async syncIterDailyReport(ctx: any) {
    const { iid, _id, content, date } = ctx.request?.body || {}

    const oldV = await IterationModel.updateOne(
      {
        'dailyReportList._id': _id,
      },
      {
        $set: {
          'dailyReportList.$.synced': true,
        },
      }
    )

    const d = await IterationModel.findById(iid, { title: 1 })
    sendPlainText(`${dayjs(date).format('MM-DD')} ${d.title}\n${content}`)

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: !!oldV,
    }
  }

  // --- 部署
  // 开始部署
  async startPipelineRun(ctx: any) {
    const { env, iid, projectId, appId, skipCheck, skipProdPipeline } = ctx.request.body || {}
    if (!iid || !appId  || !projectId || !env) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'invalid params',
      })
    }

    // 是否配置流水线
    const project = await BasementModel.findById(appId, {
      devPipelineId: 1,
      betaPipelineId: 1,
      prodPipelineId: 1,
      url: 1,
      branchMode: 1,
      needProdAudit: 1,
    })
    if (
      (env == ENV_TYPE.DEV && !project?.devPipelineId) ||
      (env == ENV_TYPE.TEST && !project?.betaPipelineId) ||
      (!skipProdPipeline && env == ENV_TYPE.PROD && !project?.prodPipelineId)
    ) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: '应用/流水线id不存在',
      })
    }

    // 临时方案 规避一下 不让排队
    if (env == ENV_TYPE.DEV || env == ENV_TYPE.TEST) {
      const existed = await IterationModel.find({
        appId,
        ...(env == ENV_TYPE.DEV ? { dev: true, status: { $ne: ITER_STATUS.PUBLISHED } } : null),
        ...(env == ENV_TYPE.TEST ? { beta: true, status: { $ne: ITER_STATUS.PUBLISHED } } : null),
      })
      if (existed?.length) {
        return (ctx.body = {
          code: RESPONSE_ENUM.FAIL,
          msg: '等上一条流水线部署完成，再部署',
        })
      }
    }

    const doc = await IterationModel.findById(iid)
    // 生产环境 检查是否同意了
    if (env == ENV_TYPE.PROD && project?.needProdAudit && !doc?.audit?.agreed) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: '审批未通过',
      })
    }

    // 更新自己的状态
    await IterationModel.findByIdAndUpdate(iid, {
      ...(env == ENV_TYPE.DEV
        ? {
            dev: true,
            'devDeploy.stage': 0,
            'devDeploy.status': 'WAITING',
            'devDeploy.operator': ctx.state.user.name,
            'devDeploy.pipelineId': '',
            'devDeploy.pipelineRunId': '',
            'devDeploy.jobId': '',
            'devDeploy.error': '',
          }
        : null),

      ...(env == ENV_TYPE.TEST
        ? {
            beta: true,
            'betaDeploy.stage': 0,
            'betaDeploy.status': 'WAITING',
            'betaDeploy.operator': ctx.state.user.name,
            'betaDeploy.pipelineId': '',
            'betaDeploy.pipelineRunId': '',
            'betaDeploy.jobId': '',
            'betaDeploy.error': '',
          }
        : null),

      ...(env == ENV_TYPE.PROD
        ? {
            prod: true,
            'prodDeploy.stage': 0,
            'prodDeploy.status': 'WAITING',
            'prodDeploy.operator': ctx.state.user.name,
            'prodDeploy.pipelineId': '',
            'prodDeploy.pipelineRunId': '',
            'prodDeploy.jobId': '',
            'prodDeploy.error': '',
          }
        : null),
    })

    PipelineManager.create({
      env,
      iid,
      branch: doc.branch,
      // 生产模式
      mrId: doc.prodMR?.id,
      skipCheck, // 是否跳过第一步
      skipProdPipeline, // 跳过生成流水线，比如小程序无法对接flow流水线

      // 项目的信息
      projectId,
      appId,
      projectUrl: project.url,
      branchMode: project.branchMode, // 分支模式
      devPipelineId: project.devPipelineId,
      betaPipelineId: project.betaPipelineId,
      prodPipelineId: project.prodPipelineId,

      onReleaseLog: async (env: number, log: string) => {
        await IterationModel.findByIdAndUpdate(iid, {
          ...(env == ENV_TYPE.DEV
            ? {
                devReleaseLog: log,
              }
            : null),
          ...(env == ENV_TYPE.TEST
            ? {
                betaReleaseLog: log,
              }
            : null),
        })
      },
      onStart: async (o: MogicPipeline) => {
        // 分支模式下，开发/测试走集成
        const isBranchMode = project.branchMode && (env == ENV_TYPE.DEV || env == ENV_TYPE.TEST)
        if (isBranchMode) {
          // 当前环境下，曾经被集成过的分支
          const sourceBranchList = await IterationModel.find(
            {
              appId,
              ...(env == ENV_TYPE.DEV
                ? { 'devBranch.integrated': true, status: { $ne: ITER_STATUS.PUBLISHED } }
                : null),
              ...(env == ENV_TYPE.TEST
                ? { 'betaBranch.integrated': true, status: { $ne: ITER_STATUS.PUBLISHED } }
                : null),
            },
            { branch: 1, branchUrl: 1, devBranch: 1, betaBranch: 1 }
          )

          // 看看有没有自己
          const includeMe = sourceBranchList?.find((o) => o.branch == doc.branch)
          if (!includeMe) {
            o.lastRelease = {
              releaseBranch: '',
              releaseBranchUrl: '',
              sourceBranchList: (sourceBranchList || [])
                .map((c) => ({ branch: c.branch, branchUrl: c.branchUrl }))
                .concat({ branch: doc.branch, branchUrl: doc.branchUrl }),
              needCreateBranch: true,
            }
            return
          }

          // 再看下自己身上的最新release（后面每次部署成功都会更新同环境其他迭代此字段)
          const releaseBranchByEnv =
            env == ENV_TYPE.DEV ? includeMe?.devBranch?.releaseBranch : includeMe?.betaBranch?.releaseBranch

          // 由于下线导致当前环境不存在release分支了，看下面的下线接口实现
          let needCreateBranch = !releaseBranchByEnv
          // 存在集成的分支，判断是不是比最新上线的记录早，如果是就要重新基于 main 创建
          if (releaseBranchByEnv) {
            const latestPublishRecord = await IterationModel.find({ status: ITER_STATUS.PUBLISHED })
              .sort({ 'prodDeploy.endTime': -1 })
              .limit(1)

            if (latestPublishRecord?.length) {
              const temp = releaseBranchByEnv.replace(/release\/beta-|release\/dev-/, '').split('-')
              // @ts-ignore
              const releaseTime = dayjs(new Date(...temp)).subtract(1, 'month')

              const latestPublishTime = dayjs(latestPublishRecord[0]?.prodDeploy?.endTime)

              needCreateBranch = releaseTime.isBefore(latestPublishTime)
            }
          }

          o.lastRelease = {
            releaseBranch: needCreateBranch ? '' : releaseBranchByEnv,
            releaseBranchUrl: needCreateBranch
              ? ''
              : env == ENV_TYPE.DEV
              ? includeMe?.devBranch?.releaseBranchUrl
              : includeMe?.betaBranch?.releaseBranchUrl,
            sourceBranchList: sourceBranchList.map((o) => ({ branch: o.branch, branchUrl: o.branchUrl })),
            needCreateBranch,
          }
        }
      },
      onConflict: async (data: { releaseBranch: string; releaseBranchUrl: string; commitId: string }) => {
        await IterationModel.findByIdAndUpdate(iid, {
          ...(env == ENV_TYPE.DEV
            ? {
                'devBranch.commitId': data.commitId,
                'devBranch.releaseBranch': data.releaseBranch,
              }
            : null),

          ...(env == ENV_TYPE.TEST
            ? {
                'betaBranch.commitId': data.commitId,
                'betaBranch.releaseBranch': data.releaseBranch,
              }
            : null),
        })
      },
      onReleaseCreated: async (data: {
        appId: string
        env: number
        releaseBranch: string
        releaseBranchUrl: string
        sourceBranchList: { branch: string }[]
      }) => {
        await IterationModel.updateMany(
          {
            appId: data.appId,
            branch: { $in: data.sourceBranchList?.map((o) => o.branch) },
          },
          {
            $set: {
              ...(data.env == ENV_TYPE.DEV
                ? {
                    'devBranch.integrated': true,
                    'devBranch.commitId': '',
                    'devBranch.releaseBranch': data.releaseBranch,
                    'devBranch.releaseBranchUrl': data.releaseBranchUrl,
                  }
                : null),
              ...(data.env == ENV_TYPE.TEST
                ? {
                    'betaBranch.integrated': true,
                    'betaBranch.commitId': '',
                    'betaBranch.releaseBranch': data.releaseBranch,
                    'betaBranch.releaseBranchUrl': data.releaseBranchUrl,
                  }
                : null),
            },
          }
        )
      },
      onCancelRelease: async (data: {
        appId: string
        env: number
        releaseBranch: string
        releaseBranchUrl: string
        sourceBranchList: { branch: string }[]
      }) => {
        const ok = await IterationModel.updateMany(
          {
            appId: data.appId,
            branch: { $in: data.sourceBranchList?.map((o) => o.branch) },
          },
          {
            $set: {
              ...(data.env == ENV_TYPE.DEV
                ? {
                    'devBranch.integrated': true,
                    'devBranch.commitId': '',
                    'devBranch.releaseBranch': data.releaseBranch,
                    'devBranch.releaseBranchUrl': data.releaseBranchUrl,
                  }
                : null),
              ...(data.env == ENV_TYPE.TEST
                ? {
                    'betaBranch.integrated': true,
                    'betaBranch.commitId': '',
                    'betaBranch.releaseBranch': data.releaseBranch,
                    'betaBranch.releaseBranchUrl': data.releaseBranchUrl,
                  }
                : null),
            },
          }
        )

        return !!ok
      },

      onStepChange: async (stage) => {
        await IterationModel.findByIdAndUpdate(iid, {
          ...(env == ENV_TYPE.DEV
            ? {
                'devDeploy.stage': stage,
                'devDeploy.status': 'RUNNING',
                'devDeploy.error': '',
              }
            : null),

          ...(env == ENV_TYPE.TEST
            ? {
                'betaDeploy.stage': stage,
                'betaDeploy.status': 'RUNNING',
                'betaDeploy.error': '',
              }
            : null),

          ...(env == ENV_TYPE.PROD
            ? {
                'prodDeploy.stage': stage,
                'prodDeploy.status': 'RUNNING',
                'prodDeploy.error': '',
              }
            : null),
        })
      },
      // jobId是【构建任务ID】，因为就构建/部署2个任务，构建任务更重要
      onJob: async (pipelineId, pipelineRunId, buildJobId) => {
        await IterationModel.findByIdAndUpdate(iid, {
          ...(env == ENV_TYPE.DEV
            ? {
                'devDeploy.pipelineId': pipelineId,
                'devDeploy.pipelineRunId': pipelineRunId,
                'devDeploy.jobId': buildJobId,
              }
            : null),

          ...(env == ENV_TYPE.TEST
            ? {
                'betaDeploy.pipelineId': pipelineId,
                'betaDeploy.pipelineRunId': pipelineRunId,
                'betaDeploy.jobId': buildJobId,
              }
            : null),

          ...(env == ENV_TYPE.PROD
            ? {
                'prodDeploy.pipelineId': pipelineId,
                'prodDeploy.pipelineRunId': pipelineRunId,
                'prodDeploy.jobId': buildJobId,
              }
            : null),
        })
      },
      onSuccess: async (stage: number, artifacts) => {
        await IterationModel.findByIdAndUpdate(iid, {
          ...(env == ENV_TYPE.DEV
            ? {
                dev: false,
                'devDeploy.stage': stage,
                'devDeploy.endTime': Date.now(),
                'devDeploy.status': 'SUCCESS',
                'devDeploy.error': '',
                'devDeploy.artifacts': artifacts,
              }
            : null),

          ...(env == ENV_TYPE.TEST
            ? {
                beta: false,
                'betaDeploy.stage': stage,
                'betaDeploy.endTime': Date.now(),
                'betaDeploy.status': 'SUCCESS',
                'betaDeploy.error': '',
                'betaDeploy.artifacts': artifacts,
              }
            : null),

          ...(env == ENV_TYPE.PROD
            ? {
                // 清空掉，以防万一
                dev: false,
                beta: false,

                // 生产必须的
                prod: false,
                'prodDeploy.stage': stage,
                'prodDeploy.endTime': Date.now(),
                'prodDeploy.status': 'SUCCESS',
                'prodDeploy.error': '',
                'prodDeploy.artifacts': artifacts,
                status: ITER_STATUS.PUBLISHED,

                // 都上线了，无需参与集成
                'devBranch.integrated': false,
                'devBranch.commitId': '',
                'devBranch.releaseBranch': '',
                'devBranch.releaseBranchUrl': '',

                'betaBranch.integrated': false,
                'betaBranch.commitId': '',
                'betaBranch.releaseBranch': '',
                'betaBranch.releaseBranchUrl': '',
              }
            : null),
        })
      },
      onFail: async (error: string, stage: number) => {
        await IterationModel.findByIdAndUpdate(iid, {
          ...(env == ENV_TYPE.DEV
            ? {
                dev: false,
                'devDeploy.stage': stage,
                'devDeploy.endTime': Date.now(),
                'devDeploy.status': 'FAIL',
                'devDeploy.error': error,
              }
            : null),

          ...(env == ENV_TYPE.TEST
            ? {
                beta: false,
                'betaDeploy.stage': stage,
                'betaDeploy.endTime': Date.now(),
                'betaDeploy.status': 'FAIL',
                'betaDeploy.error': error,
              }
            : null),

          ...(env == ENV_TYPE.PROD
            ? {
                prod: false,
                'prodDeploy.stage': stage,
                'prodDeploy.endTime': Date.now(),
                'prodDeploy.status': 'FAIL',
                'prodDeploy.error': error,
              }
            : null),
        })
      },
    })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }
  // 查询分支集成的日志
  async queryReleaseDetail(ctx: any) {
    const { iid } = ctx.request.query || {}

    const doc = await IterationModel.findById(iid, { devReleaseLog: 1, betaReleaseLog: 1 })

    if (!doc) {
      ctx.body = {
        msg: '查询失败',
        code: RESPONSE_ENUM.FAIL,
      }
      return
    }

    ctx.body = {
      msg: 'SUCCESS',
      code: RESPONSE_ENUM.SUCCESS,
      data: doc,
    }
  }
  // 目前只查询构建任务的日志
  async queryBuildJobDetail(ctx: any) {
    const { env, iid } = ctx.request.query || {}

    const doc = await IterationModel.findById(iid, {
      devDeploy: 1,
      betaDeploy: 1,
      prodDeploy: 1,
    })

    let pipelineId, pipelineRunId, jobId
    if (env == ENV_TYPE.DEV) {
      pipelineId = doc.devDeploy?.pipelineId
      pipelineRunId = doc.devDeploy?.pipelineRunId
      jobId = doc.devDeploy?.jobId
    } else if (env == ENV_TYPE.TEST) {
      pipelineId = doc.betaDeploy?.pipelineId
      pipelineRunId = doc.betaDeploy?.pipelineRunId
      jobId = doc.betaDeploy?.jobId
    } else if (env == ENV_TYPE.PROD) {
      pipelineId = doc.prodDeploy?.pipelineId
      pipelineRunId = doc.prodDeploy?.pipelineRunId
      jobId = doc.prodDeploy?.jobId
    }

    const res = await FlowIns.queryJobRun(pipelineId, pipelineRunId, jobId)
    if (!res?.success) {
      ctx.body = {
        msg: res?.errorMessage || '查询Job详情失败',
        code: RESPONSE_ENUM.FAIL,
      }
      return
    }

    ctx.body = {
      msg: 'SUCCESS',
      code: RESPONSE_ENUM.SUCCESS,
      data: res,
    }
  }
  // 取消流水线部署
  async cancelPipelineRun(ctx: any) {
    const { env, appId, iid } = ctx.request.body || {}
    if (!env || !iid || !appId) {
      return (ctx.body = {
        msg: 'invalid params',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    const ok = await PipelineManager.cancelByProjectEnvId(env, appId, iid)
    ctx.body = ok
      ? {
          code: RESPONSE_ENUM.SUCCESS,
          data: true,
        }
      : {
          code: RESPONSE_ENUM.FAIL,
          msg: '取消部署失败',
        }
  }
  // 查询相同应用下，部署在同一环境的分支列表
  async queryRunBranchesByEnv(ctx: any) {
    const { env, appId } = ctx.request.query || {}
    if (!env || !appId) {
      return (ctx.body = {
        msg: 'invalid params',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    const data = await IterationModel.find(
      {
        appId,
        status: { $ne: ITER_STATUS.PUBLISHED },
        ...(env == ENV_TYPE.DEV ? { 'devBranch.integrated': true } : null),
        ...(env == ENV_TYPE.TEST ? { 'betaBranch.integrated': true } : null),
      },
      {
        branch: 1,
        branchUrl: 1,
        devBranch: 1,
        betaBranch: 1,
        status: 1,
        _id: 0,
        'owner.name': 1,
      }
    )

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data,
    }
  }
  // 解决冲突
  async resolveConflict(ctx: any) {
    const { env, appId, iid } = ctx.request.body || {}
    if (!env || !appId || !iid) {
      return (ctx.body = {
        msg: 'invalid params',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    const ins: PipelineManager = PipelineManager.findManagerByProjectId(appId)
    const running: MogicPipeline = ins?.findRunByEnv(env)

    await IterationModel.findByIdAndUpdate(iid, {
      ...(env == ENV_TYPE.DEV
        ? {
            'devBranch.commitId': '',
          }
        : null),
      ...(env == ENV_TYPE.TEST
        ? {
            'betaBranch.commitId': '',
          }
        : null),
    })
    running?.resolveConflict()

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      data: true,
    }
  }
  // 从环境中移出某个分支，即不去部署这个分支了
  async offlineEnv(ctx: any) {
    const { env, iid, appId } = ctx.request.body || {}
    if (!env || !appId || !iid) {
      return (ctx.body = {
        msg: 'invalid params',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    // 该环境有部署，不能操作
    const doc = await IterationModel.find({
      appId,
      // 可以用 status 判断的 `dev/beta` 是快捷方式也是可以的
      ...(env == ENV_TYPE.DEV ? { dev: true } : null),
      ...(env == ENV_TYPE.TEST ? { beta: true } : null),
    })
    if (doc?.length) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: '该环境有其他迭代正在部署',
      })
    }

    await IterationModel.updateMany(
      {
        appId,
        ...(env == ENV_TYPE.DEV
          ? {
              'devBranch.integrated': true,
            }
          : null),
        ...(env == ENV_TYPE.TEST
          ? {
              'betaBranch.integrated': true,
            }
          : null),
      },
      {
        $set: {
          ...(env == ENV_TYPE.DEV
            ? {
                'devBranch.integrated': true,
                'devBranch.commitId': '',
                'devBranch.releaseBranch': '',
                'devBranch.releaseBranchUrl': '',
              }
            : null),
          ...(env == ENV_TYPE.TEST
            ? {
                'betaBranch.integrated': true,
                'betaBranch.commitId': '',
                'betaBranch.releaseBranch': '',
                'betaBranch.releaseBranchUrl': '',
              }
            : null),
        },
      }
    )

    await IterationModel.findByIdAndUpdate(iid, {
      ...(env == ENV_TYPE.DEV
        ? {
            'devBranch.integrated': false,
            'devBranch.commitId': '',
            'devBranch.releaseBranch': '',
            'devBranch.releaseBranchUrl': '',
          }
        : null),

      ...(env == ENV_TYPE.TEST
        ? {
            'betaBranch.integrated': false,
            'betaBranch.commitId': '',
            'betaBranch.releaseBranch': '',
            'betaBranch.releaseBranchUrl': '',
          }
        : null),
    })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
    }
  }
  // 放弃集成当冲突发生
  async offlineConflictRelease(ctx: any) {
    const { env, iid, appId } = ctx.request.body || {}
    if (!env || !appId || !iid) {
      return (ctx.body = {
        msg: 'invalid params',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    const ok = await PipelineManager.cancelReleaseDueConflict(env, appId, iid)
    ctx.body = ok
      ? {
          code: RESPONSE_ENUM.SUCCESS,
          data: true,
        }
      : {
          code: RESPONSE_ENUM.FAIL,
          msg: '取消集成失败',
        }
  }

  // --- 分支管理
  // 根据正则查询分支
  async queryBranchByReg(ctx: any) {
    const { projectId, type } = ctx.request.query || {}

    const queryType = {
      story: '^story',
      release: '^release',
      refactor: '^refactor',
      hotfix: '^hotfix',
    }

    if (!type || !queryType[type] || !projectId) {
      return (ctx.body = {
        msg: 'invalid params',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    const data = await GitlabService.queryAllBranches({
      projectId,
      search: queryType[type],
      per_page: 50,
    })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      message: 'SUCCESS',
      data,
    }
  }
  // 根据分支名删除分支
  async delBranchByName(ctx: any) {
    const { projectId, branch } = ctx.request.body || {}
    if (!projectId || !branch) {
      return (ctx.body = {
        msg: 'invalid params',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    const ok = await GitlabService.delGitBranch({ projectId, branch })
    if (!ok) {
      ctx.body = {
        msg: 'del failed',
        code: RESPONSE_ENUM.FAIL,
      }
      return
    }
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      message: 'SUCCESS',
      data: true,
    }
  }
  // 按照迭代维度 查询 mr 列表
  async queryMRGroupByIter(ctx: any) {
    // opened, closed, locked, merged, all
    const { state, projectId } = ctx.request.query || {}
    if (!projectId) {
      return (ctx.body = {
        msg: 'invalid params',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    const totalList = await GitlabService.queryMergeRequests({ projectId, query: { state } })
    // 分组的key
    const keyList = Array.from(new Set(totalList?.map((o) => o.target_branch)))

    // 读取 reviewer 找不到也没关系，这仅仅用来存一下 CR负责人然后给前端高亮显示，不影响使用
    let iterList
    try {
      iterList = await IterationModel.find(
        {
          projectId,
          branch: {
            $in: keyList.filter((s) => s != 'main' && s != 'master'),
          },
        },
        { branch: 1, mrList: 1 }
      )
    } catch (e) {}

    const data = keyList.reduce((m: { id: string; count?: number; list: any }[], k: string) => {
      let curIter,
        count = -1
      if (k != 'main' && k != 'master') {
        curIter = iterList?.find((iter: any) => iter.branch == k)
        count = curIter?.mrList?.length || -1

        totalList.forEach((r) => {
          const curMRIter = curIter?.mrList?.find((c) => c.mrId == r.iid)

          if (curMRIter) {
            r.mr_reviewers = curMRIter.userName
          }
        })
      }

      m.push({
        id: k,
        count,
        list: totalList?.filter((o) => o.target_branch == k),
      })
      return m
    }, [])

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      message: 'SUCCESS',
      data,
    }
  }
  // 创建一个MR
  async createMergeRequest(ctx: any) {
    const { projectId, sourceBranch, targetBranch, reviewer } = ctx.request.body || {}
    if (!projectId || !sourceBranch || !targetBranch) {
      return (ctx.body = {
        msg: 'invalid params',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    const branchDetail = await GitlabService.queryBranch({ projectId, branch: sourceBranch })
    if (!branchDetail) {
      return (ctx.body = {
        msg: '源分支不存在',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    const data = await GitlabService.createMR({
      // 用分支名兜底
      title: branchDetail.commit?.message || sourceBranch,
      projectId,
      source_branch: sourceBranch,
      target_branch: targetBranch,
    })
    if (!data) {
      return (ctx.body = {
        msg: 'create failed',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    // TODO：MR自动提醒at

    // 写入 reviewer
    if (targetBranch !== 'main' && targetBranch != 'master') {
      try {
        // 找不到也没关系，这仅仅用来存一下 CR负责人然后给前端高亮显示，不影响使用
        await IterationModel.findOneAndUpdate(
          {
            projectId,
            branch: targetBranch,
          },
          {
            $push: {
              mrList: {
                mrId: data.iid,
                userName: reviewer,
              },
            },
          }
        )
      } catch (e) {}
    }

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      message: 'SUCCESS',
      data,
    }
  }
  // 查询一个项目所有的Tags
  async queryTags(ctx: any) {
    const { projectId } = ctx.request.query || {}
    if (!projectId) {
      return (ctx.body = {
        msg: 'invalid params',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    const data = await GitlabService.queryTags({ projectId })
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      message: 'SUCCESS',
      data,
    }
  }
  // 打 tag
  async createTagByCommitId(ctx: any) {
    const { projectId } = ctx.request.body || {}
    if (!projectId) {
      return (ctx.body = {
        msg: 'invalid params',
        code: RESPONSE_ENUM.FAIL,
      })
    }

    // const data = await GitlabService.createTag({ projectId, tag_name, commitId })
  }
}

const modelIns = new BasementController()
export function setupBasementRouter(router: any) {
  router.post(`${modelIns.prefix}/create`, modelIns.create)
  router.get(`${modelIns.prefix}/queryList`, modelIns.queryList)
  router.post(`${modelIns.prefix}/detail`, modelIns.getAppDetail)
  router.post(`${modelIns.prefix}/update`, modelIns.update)
  router.post(`${modelIns.prefix}/delete`, modelIns.delete)

  router.get(`${modelIns.prefix}/queryIterList`, modelIns.queryIterList)
  router.post(`${modelIns.prefix}/createIter`, modelIns.createIter)
  router.post(`${modelIns.prefix}/updateIter`, modelIns.updateIter)
  router.post(`${modelIns.prefix}/delIter`, modelIns.deleteIter)
  router.get(`${modelIns.prefix}/fetchIterDetail`, modelIns.fetchIterDetail)
  router.post(`${modelIns.prefix}/updateIterStatus`, modelIns.updateIterStatus)
  router.post(`${modelIns.prefix}/reminderIterTesting`, modelIns.reminderIterTesting)
  router.get(`${modelIns.prefix}/queryIterStatusByName`, modelIns.fetchIterStatusByBranchName)

  router.post(`${modelIns.prefix}/agreeIterPub`, modelIns.agreeIterPub)
  router.get(`${modelIns.prefix}/checkIterPublishing`, modelIns.checkIterPublishing)

  router.get(`${modelIns.prefix}/queryIterDailyReportList`, modelIns.queryDailyReportList)
  router.post(`${modelIns.prefix}/addIterDailyReport`, modelIns.createIterDailyReport)
  router.post(`${modelIns.prefix}/syncIterDailyReport`, modelIns.syncIterDailyReport)

  router.post(`${modelIns.prefix}/deploy`, modelIns.startPipelineRun)
  router.get(`${modelIns.prefix}/queryJobDetail`, modelIns.queryBuildJobDetail)
  router.get(`${modelIns.prefix}/queryRunBranchesByEnv`, modelIns.queryRunBranchesByEnv)
  router.post(`${modelIns.prefix}/cancelPipelineRun`, modelIns.cancelPipelineRun)
  router.post(`${modelIns.prefix}/resolveConflict`, modelIns.resolveConflict)
  router.post(`${modelIns.prefix}/offlineEnv`, modelIns.offlineEnv)
  router.post(`${modelIns.prefix}/offlineConflictRelease`, modelIns.offlineConflictRelease)
  router.get(`${modelIns.prefix}/queryReleaseLog`, modelIns.queryReleaseDetail)

  router.get(`${modelIns.prefix}/queryBranchByReg`, modelIns.queryBranchByReg)
  router.post(`${modelIns.prefix}/delBranchByName`, modelIns.delBranchByName)
  router.get(`${modelIns.prefix}/queryMRGroupByIter`, modelIns.queryMRGroupByIter)
  router.post(`${modelIns.prefix}/createMergeRequest`, modelIns.createMergeRequest)
  router.get(`${modelIns.prefix}/queryTags`, modelIns.queryTags)
  router.post(`${modelIns.prefix}/createTagByCommitId`, modelIns.createTagByCommitId)
}
