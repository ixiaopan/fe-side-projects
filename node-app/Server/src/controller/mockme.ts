/**
 * @file API Mock 数据模型
 */

import mongoose from 'mongoose'
import dayjs from 'dayjs'
import { RESPONSE_ENUM } from '../enum/httpEnum'

const { pathToRegexp } = require('path-to-regexp')

// --- 项目
const MockProjectSchema = new mongoose.Schema({
  id: String,
  name: String,
  desc: String,
})
const MockProjectModel = mongoose.model('mockProject', MockProjectSchema)

// --- API
const MockAPISchema = new mongoose.Schema({
  projectId: String,

  url: String,
  desc: String,
  method: String,
  mocked: Boolean,
  timeout: Number, // 超时时间

  headers: String,
  body: String, // 入参

  json: String, // 出参
})
const MockAPIModel = mongoose.model('mockAPI', MockAPISchema)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class MockMeController {
  prefix = '/mockme'

  // --- 项目
  // 新增项目
  async createProject(ctx: any) {
    const { projectId, projectName, projectDesc = '' } = ctx.request.body

    const data = await MockProjectModel.findOne({ id: projectId })
    if (data) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'projectId has existed',
      })
    }

    const doc = await MockProjectModel.create({
      id: projectId,
      name: projectName,
      desc: projectDesc,
    })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc,
    }
  }
  // 查询项目列表
  async queryProjectList(ctx: any) {
    const data = await MockProjectModel.aggregate([
      {
        $lookup: {
          from: 'mockapis',
          localField: 'id',
          foreignField: 'projectId',
          as: 'apiList',
        },
      },
      {
        $project: {
          _id: 0,
          id: 1,
          name: 1,
          desc: 1,
          count: {
            $size: '$apiList',
          },
        },
      },
    ])

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data,
    }
  }
  async queryProjectById(ctx: any) {
    const { id } = ctx.request.params

    const data = await MockProjectModel.findOne({ id }, { __v: 0, _id: 0 })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data,
    }
  }
  // 更新单个项目
  async updateProjectById(ctx: any) {
    const { projectId, projectName, projectDesc = '' } = ctx.request.body

    const doc = await MockProjectModel.findOneAndUpdate(
      { id: projectId },
      {
        name: projectName,
        desc: projectDesc,
      }
    )

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: !!doc,
    }
  }
  async removeProjectAndAPI(ctx: any) {
    const { id } = ctx.request.params

    const doc = await MockProjectModel.findOneAndRemove({ id })
    const docList = await MockAPIModel.deleteMany({ projectId: id })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: !!doc,
    }
  }

  // --- API
  async createAPI(ctx: any) {
    const { projectId, url = '', method = '', desc = '' } = ctx.request.body

    const data = await MockAPIModel.findOne({ id: projectId, url, method })
    if (data) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'api has existed',
      })
    }

    const doc = await MockAPIModel.create({
      projectId,
      url,
      desc,
      method,
      mocked: false,
    })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc,
    }
  }
  async queryAPIList(ctx: any) {
    const { projectId } = ctx.request.query

    const doc = await MockAPIModel.find(
      {
        projectId,
      },
      { __v: 0, json: 0, headers: 0 }
    )

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc,
    }
  }
  async queryAPIById(ctx: any) {
    const { id } = ctx.request.params

    const doc = await MockAPIModel.findById(id, { __v: 0 })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc,
    }
  }
  async updateAPIById(ctx: any) {
    const { id } = ctx.request.params

    const d = ['url', 'method', 'desc', 'timeout', 'headers', 'body', 'json', 'mocked'].reduce((m, k) => {
      if (k in ctx.request.body) {
        m[k] = ctx.request.body[k]
      }
      return m
    }, {})

    const doc = await MockAPIModel.findByIdAndUpdate(id, d)

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: !!doc,
    }
  }

  // --- 代理
  async proxyAPI(ctx: any) {
    // url /mockme/proxy/vue/your-api
    const urlRegResult = ctx.request.path?.match(/\/mockme\/proxy(.*)/)
    const [, regUrl] = urlRegResult
    const pathNode = pathToRegexp('/:projectId/:proxyURL*').exec(regUrl)
    const [, projectId, proxyURL] = pathNode

    const doc = await MockAPIModel.findOne({ projectId, url: '/' + proxyURL })
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'mock is not found',
      })
    }

    if (doc.mocked) {
      try {
        if (doc.timeout > 0) {
          await sleep(doc.timeout * 1000)
        }

        return (ctx.body = {
          code: RESPONSE_ENUM.SUCCESS,
          msg: 'success',
          data: JSON.parse(doc.json),
        })
      } catch (e) {
        return (ctx.body = {
          code: RESPONSE_ENUM.FAIL,
          msg: 'parse mock data error',
        })
      }
    }

    ctx.body = {
      code: RESPONSE_ENUM.FAIL,
      msg: 'mock is disabled',
    }
  }
}

const modelIns = new MockMeController()
export function setupMockMeRouter(router: any) {
  // --- 项目
  router.get(`${modelIns.prefix}/project`, modelIns.queryProjectList)
  router.post(`${modelIns.prefix}/project`, modelIns.createProject)

  router.get(`${modelIns.prefix}/project/:id`, modelIns.queryProjectById)
  router.post(`${modelIns.prefix}/project/:id`, modelIns.updateProjectById)
  router.delete(`${modelIns.prefix}/project/:id`, modelIns.removeProjectAndAPI)

  // --- API
  router.post(`${modelIns.prefix}/api`, modelIns.createAPI)
  router.get(`${modelIns.prefix}/api`, modelIns.queryAPIList)
  router.get(`${modelIns.prefix}/api/:id`, modelIns.queryAPIById)
  router.post(`${modelIns.prefix}/api/:id`, modelIns.updateAPIById)

  // 业务方
  router.all(`${modelIns.prefix}/proxy/:id/(.*)`, modelIns.proxyAPI)
}
