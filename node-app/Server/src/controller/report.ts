/**
 * @file 周报数据模型
 */

import mongoose from 'mongoose'
import dayjs from 'dayjs'
import { RESPONSE_ENUM } from '../enum/httpEnum'

const ReportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    userId: {
      type: String,
      required: [true, 'feishu userId is required'],
    },
    content: {
      type: String,
      required: [true, 'content is required'],
    },
    dateOfFriday: {
      type: Date,
      required: [true, 'dateOfFriday is required'],
    },
    del: Boolean,
  },
  {
    timestamps: true,
  }
)
const ReportModel = mongoose.model('report', ReportSchema)

//
class ReportController {
  prefix = '/report'

  // 创建
  async createByUserId(ctx: any) {
    const { name, userId, content, dateOfFriday } = ctx.request?.body || {}

    if (!userId || !name || !content || !dateOfFriday) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: '传参错误',
      })
    }

    // Update only the first document that matches filter
    const existedDoc = await ReportModel.updateOne({ userId, dateOfFriday }, { name, content })
    if (existedDoc.matchedCount) {
      return (ctx.body = {
        code: RESPONSE_ENUM.SUCCESS,
        msg: 'success',
        data: true,
      })
    }

    // 不存在 新增
    const doc = await ReportModel.create({
      name,
      userId,
      content,
      dateOfFriday,
      del: false,
    })
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'failed',
      })
    }
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }

  // 查询历史周报
  async getArchive(ctx) {
    const dateOfFridayList = await ReportModel.aggregate([
      {
        $group: {
          _id: '$dateOfFriday',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ])

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: dateOfFridayList.map((o) => ({ count: o.count, dateOfFriday: dayjs(o._id).format('YYYY-MM-DD') })),
    }
  }

  // 查询本周周报
  async getWeekReport(ctx: any) {
    const { dateOfFriday } = ctx.params || {}

    const doc = await ReportModel.find({ dateOfFriday }, { content: 1, name: 1, _id: 0 })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc || [],
    }
  }

  // 详情
  async getReportByUserId(ctx: any) {
    const { userId, dateOfFriday } = ctx.request.query || {}

    const doc = await ReportModel.findOne({ userId, dateOfFriday })
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc
        ? {
            userId,
            name: doc.name,
            content: doc.content,
          }
        : null,
    }
  }
}
const modelIns = new ReportController()
export function setupReportRouter(router: any) {
  router.post(`${modelIns.prefix}`, modelIns.createByUserId)

  router.get(`${modelIns.prefix}`, modelIns.getArchive)

  router.get(`${modelIns.prefix}/:dateOfFriday`, modelIns.getWeekReport)

  router.get(`${modelIns.prefix}/user/detail`, modelIns.getReportByUserId)
}
