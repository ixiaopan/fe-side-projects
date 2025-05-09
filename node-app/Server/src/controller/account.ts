/**
 * @file 登录数据模型
 * @doc https://open.feishu.cn/document/common-capabilities/sso/web-application-sso/web-app-overview
 */

import axios from 'axios'
import mongoose from 'mongoose'
import { RESPONSE_ENUM } from '../enum/httpEnum'
import { CLIENT_SECRET, CLIENT_ID } from '../config/account.config'
import logger from '../util/log'

const ROLE_TYPE = {
  ADMIN: '1',
  MANAGER: '2',
  MEMBER: '3',
  REPORTER: '4',
  GUEST: '5',
}

const AccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    userId: {
      type: String,
      required: [true, 'userId is required'],
    },
    avatar: String,
    token: String,
    del: Boolean,
    role: { type: String, default: ROLE_TYPE.GUEST }, // 默认【访客】角色
    auditable: Number, // 是否有权限审批发布
  },
  {
    timestamps: true,
  }
)
export const AccountModel = mongoose.model('account', AccountSchema)

//
const client_id = CLIENT_ID
const client_secret = CLIENT_SECRET

class AccountController {
  prefix = '/account'

  async auth(ctx: any) {
    const { redirect_uri } = ctx.request.query || {}

    const query = `client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code`

    return (ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: `https://passport.feishu.cn/suite/passport/oauth/authorize?${query}`,
    })
  }

  async token(ctx: any) {
    const { redirect_uri, code } = ctx.request.body || {}

    //   {
    //     "access_token": "",
    //     "token_type": "Bearer",
    //     "expires_in": 3600,
    //     "refresh_token": "",
    //     "refresh_expires_in": 864000
    // }
    try {
      let res = await axios.post(
        'https://passport.feishu.cn/suite/passport/oauth/token',
        {
          grant_type: 'authorization_code',
          client_id,
          client_secret,
          code,
          redirect_uri,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )
      const { access_token } = res.data

      res = await axios.get('https://passport.feishu.cn/suite/passport/oauth/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })

      const { user_id, name, avatar_url } = res.data || {}

      let doc = await AccountModel.findOne({ userId: user_id })
      if (doc) {
        doc.token = access_token

        const res = await doc.save()

        if (!res) {
          return (ctx.body = {
            code: RESPONSE_ENUM.FAIL,
            msg: 'auth failed',
          })
        }
      } else {
        doc = await AccountModel.create({
          name,
          userId: user_id,
          avatar: avatar_url,
          token: access_token,
        })

        if (!doc) {
          return (ctx.body = {
            code: RESPONSE_ENUM.FAIL,
            msg: 'auth failed',
          })
        }
      }
      ctx.body = {
        code: RESPONSE_ENUM.SUCCESS,
        msg: 'success',
        data: {
          name,
          userId: user_id,
          avatar: avatar_url,
          token: access_token,
        },
      }
    } catch (e) {
      logger.error(e)
    }
  }

  async getUserInfo(ctx: any) {
    const token = (ctx.request.headers || {})['x-access-token']

    const doc = await AccountModel.findOne({ token }, { _id: 1, userId: 1, name: 1, avatar: 1, role: 1, auditable: 1 })
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: '用户不存在',
      })
    }

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc,
    }
  }
  async getUserList(ctx: any) {
    const data = await AccountModel.find({}, { _id: 1, userId: 1, name: 1, avatar: 1, role: 1, auditable: 1 })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data,
    }
  }
  async getAuditableUserList(ctx: any) {
    const data = await AccountModel.find({ auditable: 1 }, { _id: 0, userId: 1, name: 1 })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data,
    }
  }
  async removeUser(ctx: any) {
    const { id } = ctx.request?.body || {}

    const res = await AccountModel.findByIdAndRemove(id)
    if (!res) {
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

  async updateAuditable(ctx: any) {
    const { _id, auditable } = ctx.request?.body || {}
    if (typeof auditable != 'number') {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'params error',
      })
    }

    const res = await AccountModel.findByIdAndUpdate(_id, { auditable })
    if (!res) {
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
  async updateUserRole(ctx: any) {
    const { _id, role } = ctx.request?.body || {}
    if (!role) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'params error',
      })
    }

    const res = await AccountModel.findByIdAndUpdate(_id, {
      role,
      auditable: role == ROLE_TYPE.ADMIN, // admin 自带审批权限
    })
    if (!res) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'update role failed',
      })
    }

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }
}

const modelIns = new AccountController()
export function setupAccountRouter(router: any) {
  router.get(`${modelIns.prefix}/auth`, modelIns.auth)
  router.post(`${modelIns.prefix}/token`, modelIns.token)

  router.get(`${modelIns.prefix}/getUserInfo`, modelIns.getUserInfo)
  router.get(`${modelIns.prefix}/getUserList`, modelIns.getUserList)
  router.get(`${modelIns.prefix}/getAuditableUserList`, modelIns.getAuditableUserList)
  router.post(`${modelIns.prefix}/removeUser`, modelIns.removeUser)

  router.post(`${modelIns.prefix}/updateUserRole`, modelIns.updateUserRole)
  router.post(`${modelIns.prefix}/updateUserAuditable`, modelIns.updateAuditable)
}

const whitePathList = [
  '/account/auth',
  '/account/token',
  '/mockme/proxy',
]

export function tokenIntercept() {
  return async (ctx, next) => {
    if (whitePathList.includes(ctx.request.path)) {
      return next()
    }
    if (ctx.request.path.startsWith('/mockme/proxy')) {
      return next()
    }

    const headers = ctx.request.headers || {}
    const tokenValue = headers['x-access-token']

    // 空
    if (!tokenValue) {
      return (ctx.body = {
        code: RESPONSE_ENUM.TOKEN_INVALID,
        msg: 'token is null',
      })
    }
    // 不合法
    const user = await AccountModel.findOne({ token: tokenValue })
    if (!user) {
      return (ctx.body = {
        code: RESPONSE_ENUM.TOKEN_INVALID,
        msg: 'token invalid',
      })
    }
    ctx.state.user = user
    await next()
  }
}
