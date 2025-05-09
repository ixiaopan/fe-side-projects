/**
 * @doc https://next.api.aliyun.com/api/devops/2021-06-25/GetPipelineArtifactUrl?lang=TYPESCRIPT
 */

import devops20210625, * as $devops20210625 from '@alicloud/devops20210625'
import * as $OpenApi from '@alicloud/openapi-client'
import * as $Util from '@alicloud/tea-util'

import { ACCESS_KEY, ACCESS_KEY_S, ORG_ID } from '../config/flow.config'
import logger from '../util/log'
import { ENV_ENUM } from '../enum/envEnum'

const isMock = process.env.NODE_ENV == ENV_ENUM.MOCK

const mockFlow = {
  counter: {},

  mockData: () => {
    return {
      pipelineRun: {
        createTime: 1679635846000,
        pipelineId: 1688971,
        pipelineRunId: 992,
        stages: [
          {
            name: 'Group0-Stage0',
            stageInfo: {
              jobs: [
                {
                  id: 134762231,
                  name: '构建',
                  startTime: 1679635863000,
                  status: 'RUNNING',
                },
              ],
              name: 'Group0-Stage0',
              startTime: 1679635863000,
              status: 'RUNNING',
            },
          },
          {
            name: 'Group1-Stage0',
            stageInfo: {
              jobs: [
                {
                  id: 134762232,
                  name: '主机部署',
                  status: 'INIT',
                },
              ],
              name: 'Group1-Stage0',
              status: 'INIT',
            },
          },
        ],
        status: 'RUNNING',
        triggerMode: 4,
        updateTime: 1679635888000,
      },
      success: true,
    }
  },

  running: (pipelineId, pipelineRunId) => {
    const data = mockFlow.mockData()

    if (typeof mockFlow.counter[pipelineId + '-' + pipelineRunId] != 'number') {
      mockFlow.counter[pipelineId + '-' + pipelineRunId] = 0
    }
    mockFlow.counter[pipelineId + '-' + pipelineRunId]++

    const num = mockFlow.counter[pipelineId + '-' + pipelineRunId]
    console.log('counter', num)

    if (num >= 8) {
      mockFlow.counter[pipelineId + '-' + pipelineRunId] = 0

      data.pipelineRun.status = 'SUCCESS'

      data.pipelineRun.stages[0].stageInfo.jobs[0].status = 'SUCCESS'
      data.pipelineRun.stages[0].stageInfo.status = 'SUCCESS'

      data.pipelineRun.stages[1].stageInfo.jobs[0].status = 'SUCCESS'
      data.pipelineRun.stages[1].stageInfo.status = 'SUCCESS'
    }
    // 模拟构建成功
    else if (num >= 4) {
      data.pipelineRun.stages[0].stageInfo.jobs[0].status = 'SUCCESS'
      data.pipelineRun.stages[0].stageInfo.status = 'SUCCESS'

      data.pipelineRun.stages[1].stageInfo.jobs[0].status = 'RUNNING'
      data.pipelineRun.stages[1].stageInfo.status = 'RUNNING'

      // 模拟失败
      // data.pipelineRun.stages[1].stageInfo.jobs[0].status = 'FAIL'
      // data.pipelineRun.stages[1].stageInfo.status = 'FAIL'
      // data.pipelineRun.status = 'FAIL'

      // mockFlow.counter[pipelineId + '-' + pipelineRunId] = 0
    }
    return data
  },
}

class FlowClient {
  client

  constructor(accessKeyId: string, accessKeySecret: string) {
    if (isMock) {
      return this
    }

    const config = new $OpenApi.Config({
      accessKeyId,
      accessKeySecret,
    })

    config.endpoint = `xxx`

    this.client = new devops20210625(config)
  }

  static createClient(accessKeyId: string, accessKeySecret: string) {
    return new FlowClient(accessKeyId, accessKeySecret)
  }

  // 运行流水线
  async runPipeline(pipelineId: number, branchModeBranches?: string[], runningBranches?: any) {
    if (!pipelineId) {
      return {
        errorMessage: 'pipeline is not found',
        success: false,
      }
    }
    if (!branchModeBranches?.length && !runningBranches) {
      return {
        errorMessage: 'branch cannot be empty',
        success: false,
      }
    }

    // 本地mock
    if (isMock) {
      return {
        success: true,
        pipelineRunId: 992,
      }
    }

    try {
      const request = new $devops20210625.StartPipelineRunRequest({
        params: JSON.stringify({
          // 分支模式、普通模式二选一
          ...(branchModeBranches ? { branchModeBranchs: branchModeBranches } : null),
          ...(runningBranches ? { runningBranchs: runningBranches } : null),
        }),
      })

      const runtime = new $Util.RuntimeOptions({
        // 设置链接超时时间
        connectTimeout: 10 * 1000,
        // 设置读取超时时间
        readTimeout: 10 * 1000,
      })
      const headers: { [key: string]: string } = {}

      const res = await this.client.startPipelineRunWithOptions(ORG_ID, pipelineId, request, headers, runtime)
      return res.body
    } catch (error) {
      logger.error(error)
    }
  }

  // 查询当前运行的实例详情
  async queryPipelineRun(pipelineId: number, pipelineRunId: number) {
    if (!pipelineId) {
      return {
        errorMessage: 'pipeline is not found',
        success: false,
      }
    }
    if (!pipelineRunId) {
      return {
        errorMessage: 'pipelineRunId is not found',
        success: false,
      }
    }

    // 本地mock
    if (isMock) {
      return mockFlow.running(pipelineId, pipelineRunId)
    }

    try {
      const headers: { [key: string]: string } = {}
      const runtime = new $Util.RuntimeOptions({
        // 设置链接超时时间
        connectTimeout: 10 * 1000,
        // 设置读取超时时间
        readTimeout: 10 * 1000,
      })
      const res = await this.client.getPipelineRunWithOptions(ORG_ID, pipelineId, pipelineRunId, headers, runtime)
      return res.body
    } catch (error) {
      logger.error(error)
    }
  }

  // 每一个阶段的详情
  async queryJobRun(pipelineId: number, pipelineRunId: number, jobId: number) {
    if (!pipelineId) {
      return {
        errorMessage: 'pipeline is not found',
        success: false,
      }
    }
    if (!pipelineRunId) {
      return {
        errorMessage: 'pipelineRunId is not found',
        success: false,
      }
    }
    if (!jobId) {
      return {
        errorMessage: 'jobId is not found',
        success: false,
      }
    }

    // 本地mock
    if (isMock) {
      return {
        success: true,
        pipelineRunId: 999,
      }
    }

    const runtime = new $Util.RuntimeOptions({
      // 设置链接超时时间
      connectTimeout: 10 * 1000,
      // 设置读取超时时间
      readTimeout: 10 * 1000,
    })
    const headers: { [key: string]: string } = {}

    try {
      const res = await this.client.logPipelineJobRunWithOptions(
        ORG_ID,
        pipelineId,
        jobId,
        pipelineRunId,
        headers,
        runtime
      )
      return res.body
    } catch (error) {
      logger.error(error)
    }
  }

  // 取消流水线部署
  async cancelPipelineRun(pipelineId: number, pipelineRunId: number) {
    if (!pipelineId) {
      return {
        errorMessage: 'pipeline is not found',
        success: false,
      }
    }
    if (!pipelineRunId) {
      return {
        errorMessage: 'pipelineRunId is not found',
        success: false,
      }
    }

    // 本地mock
    if (isMock) {
      return {
        success: true,
      }
    }

    const runtime = new $Util.RuntimeOptions({
      // 设置链接超时时间
      connectTimeout: 10 * 1000,
      // 设置读取超时时间
      readTimeout: 10 * 1000,
    })
    const headers: { [key: string]: string } = {}

    try {
      const res = await this.client.stopPipelineRunWithOptions(ORG_ID, pipelineId, pipelineRunId, headers, runtime)
      return res.body
    } catch (error) {
      logger.error(error)
    }
  }
}

export default FlowClient.createClient(ACCESS_KEY, ACCESS_KEY_S)
