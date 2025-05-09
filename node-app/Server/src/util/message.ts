/**
 * @file 飞书消息格式
 * @doc
 * - https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/im-v1/message/create_json
 * - https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN
 */

import axios from 'axios'
import { FE_WEBHOOK } from '../config/robot.config'

export function sendPlainText(text: string) {
  axios.post(FE_WEBHOOK, {
    msg_type: 'text',
    content: {
      text,
    },
  })
}

export function sendRichText(
  title: string,
  content: { tag: string; text?: string; href?: string; user_id?: string }[][],
  url?: string
) {
  axios.post(url || FE_WEBHOOK, {
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title,
          content,
        },
      },
    },
  })
}

export function sendPublishReminder(data: {
  url: string
  title: string
  ownerId: string
  ownerName?: string
  auditId: string
  auditName?: string
  remark?: string
}) {
  const elements = [
    {
      fields: [
        {
          is_short: true,
          text: {
            content: `**需求：**${data.title || ''}`,
            tag: 'lark_md',
          },
        },
      ],
      tag: 'div',
    },
    {
      fields: [
        {
          is_short: true,
          text: {
            content: '**提交人：**' + (data.ownerId ? `<at id=${data.ownerId}></at>` : `${data.ownerName}`),
            tag: 'lark_md',
          },
        },
        {
          is_short: true,
          text: {
            content: `**备注：**${data.remark || ''}`,
            tag: 'lark_md',
          },
        },
      ],
      tag: 'div',
    },
    {
      fields: [
        {
          is_short: true,
          text: {
            content: '**审批人：**' + (data.auditId ? `<at id=${data.auditId}></at>` : `${data.auditName}`),
            tag: 'lark_md',
          },
        },
      ],
      tag: 'div',
    },
    {
      tag: 'hr',
    },
    {
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: '点击查看',
          },
          type: 'primary',
          url: data.url,
        },
      ],
    },
  ]

  axios.post(FE_WEBHOOK, {
    msg_type: 'interactive',
    card: {
      header: {
        template: 'orange',
        title: {
          content: '❗️发布审批',
          tag: 'plain_text',
        },
      },
      elements,
    },
  })
}

export function sendAlertError({
  webhook,
  cate,
  message,
  errorEffectInfo,
  nickname,
  tenantName,
  errorId,
  errorKey,
  env,
}: {
  webhook: string
  cate: string
  message: string
  errorEffectInfo: { userCount: number; count: number }
  nickname: string
  tenantName: string
  errorId: string
  errorKey: string
  env: string
}) {
  const envMap = {
    dev: '开发环境',
    beta: '测试环境',
    prod: '生产环境',
  }
  const elements = [
    {
      fields: [
        {
          is_short: true,
          text: {
            content: `**报错：** 【${cate}】${message || ''}`,
            tag: 'lark_md',
          },
        },
      ],
      tag: 'div',
    },
    {
      fields: [
        {
          is_short: true,
          text: {
            content: `**影响用户数：** ${errorEffectInfo.userCount}`,
            tag: 'lark_md',
          },
        },
        {
          is_short: true,
          text: {
            content: `**发生次数：** ${errorEffectInfo.count}`,
            tag: 'lark_md',
          },
        },
      ],
      tag: 'div',
    },
    {
      fields: [
        {
          is_short: true,
          text: {
            content: `**用户名：** ${nickname || ''}`,
            tag: 'lark_md',
          },
        },
        {
          is_short: true,
          text: {
            content: `**组织名：** ${tenantName || ''}`,
            tag: 'lark_md',
          },
        },
      ],
      tag: 'div',
    },
    {
      tag: 'hr',
    },
    {
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: '点击查看',
          },
          type: 'primary',
          url: `http://mogic-fe.dev.getmogic.com/base/child/monitor#/detail/${errorId}/${errorKey}`,
        },
      ],
    },
  ]

  axios.post(webhook, {
    msg_type: 'interactive',
    card: {
      header: {
        template: 'red',
        title: {
          content: `❗️错误报警【${envMap[env]}】`,
          tag: 'plain_text',
        },
      },
      elements,
    },
  })
}
export function sendAlertHttp({
  webhook,
  httpEffectInfo,
  url,
  env,
  biz,
}: {
  webhook: string
  httpKey: string
  env: string
  url: string
  biz: any
  httpEffectInfo: any
}) {
  const envMap = {
    dev: '开发环境',
    beta: '测试环境',
    prod: '生产环境',
  }
  const elements = [
    {
      fields: [
        {
          is_short: true,
          text: {
            content: `**接口地址** 【${url}}`,
            tag: 'lark_md',
          },
        },
      ],
      tag: 'div',
    },
    {
      fields: [
        {
          is_short: true,
          text: {
            content: `**影响用户数：** ${httpEffectInfo.userCount}`,
            tag: 'lark_md',
          },
        },
        {
          is_short: true,
          text: {
            content: `**发生次数：** ${httpEffectInfo.count}`,
            tag: 'lark_md',
          },
        },
      ],
      tag: 'div',
    },
    {
      fields: [
        {
          is_short: true,
          text: {
            content: `**用户名：** ${biz.nickname || ''}`,
            tag: 'lark_md',
          },
        },
        {
          is_short: true,
          text: {
            content: `**组织名：** ${biz.tenantName || ''}`,
            tag: 'lark_md',
          },
        },
      ],
      tag: 'div',
    },
    {
      tag: 'hr',
    },
    {
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: '点击查看',
          },
          type: 'primary',
          url: `http://mogic-fe.dev.getmogic.com/base/child/monitor#/http`,
        },
      ],
    },
  ]

  axios.post(webhook, {
    msg_type: 'interactive',
    card: {
      header: {
        template: 'red',
        title: {
          content: `❗️http请求报警【${envMap[env]}】`,
          tag: 'plain_text',
        },
      },
      elements,
    },
  })
}
