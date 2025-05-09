/**
 * @doc
 * - https://docs.gitlab.com/ee/api/merge_requests.html
 * - https://docs.gitlab.com/ee/api/rest/#pagination
 */

import axios from 'axios'
import { simpleGit, SimpleGit } from 'simple-git'
import path from 'path'
import dayjs from 'dayjs'

import {
  GITLAB_API_V4,
  TEMPLATE_REPO,
  GITLAB_PERSONAL_ACCESS_TOKEN,
  GROUP_ID,
  DEFAULT_BRANCH,
  VISIBILITY,
} from '../config/gitlab.config'
import { ENV_ENUM } from '../enum/envEnum'
import { replaceHost } from '../util/replaceHost'
import { execAsync } from '../util/execAsync'
import logger from '../util/log'

const fs = require('fs-extra')

const config = {
  headers: { 'Private-Token': GITLAB_PERSONAL_ACCESS_TOKEN },
}

const isMock = process.env.NODE_ENV == ENV_ENUM.MOCK

// 兼容一些系统使用 master 其他使用 main 的情况
export const getMainBranchByProjectId = (projectId: number) => {
  return projectId == 5 ? 'master' : 'main'
}

export default {
  // 创建项目
  async createGitProject(payload: { name; template; desc }) {
    // 如果是本地环境，随便mock一个projectId。
    if (isMock) {
      return {
        id: Math.ceil(Math.random() * 100),
        http_url_to_repo: 'https://www.baidu.com',
        branch: 'main',
      }
    }

    const queryData = {
      name: payload.name,
      description: payload.desc,
      namespace_id: GROUP_ID,
      default_branch: DEFAULT_BRANCH,
      visibility: VISIBILITY,
    }

    try {
      // 拿到项目数据
      const res = await axios.post(`${GITLAB_API_V4}/projects`, queryData, config)

      const { http_url_to_repo, id } = res.data

      // TODO: 把模版推送到项目, 这里不用关心成功失败；创建项目才是真正的目的
      // try {
      //   await this.pushProjectToGitlab({ template: payload.template, http_url_to_repo })
      // } catch (e) {}

      return {
        id,
        http_url_to_repo: replaceHost(http_url_to_repo),
      }
    } catch (e) {
      logger.error(e)
    }
  },

  // 推送自定义模版到仓库
  async pushProjectToGitlab(requestData: { template: string; http_url_to_repo: string }) {
    // 如果是本地环境，就不进行push操作, mock 一个返回
    if (isMock) {
      return true
    }

    const { template, http_url_to_repo } = requestData
    try {
      // 下载对应的模版代码到temp临时文件夹
      await execAsync('git', ['clone', '-b', `${template}`, TEMPLATE_REPO, 'temp'], {
        stdio: 'inherit',
        cwd: process.cwd(),
      })
    } catch (e) {
      console.log('克隆代码失败', e)
    }

    // 拿到对应的git地址
    try {
      const dirPath = `${process.cwd()}/temp`
      const http_url = replaceHost(http_url_to_repo)

      await execAsync(
        `cd ${dirPath} && rm -rf .git && git init && git remote add origin ${http_url} && git add . && git commit -m "Initial commit" && git push -u origin main`,
        [],
        {
          stdio: 'inherit',
          cwd: process.cwd(),
          shell: true,
        }
      )

      // 删除temp文件夹
      fs.removeSync(dirPath, (err) => {
        if (err) {
          console.log(err)
        }
      })
      console.log('推送代码成功')
      return true
    } catch (e) {
      console.log('模版代码推送失败', e)
    }
  },

  // 创建分支
  async createGitBranch(payload: { projectId; branch: string; ref?: string }) {
    if (isMock) {
      return {
        name: payload.branch,
        web_url: 'https://www.baidu.com',
      }
    }

    const { projectId, branch } = payload || {}
    const ref = payload.ref || getMainBranchByProjectId(projectId)

    try {
      const res = await axios.post(
        `${GITLAB_API_V4}/projects/${projectId}/repository/branches?branch=${branch}&ref=${ref}`,
        {},
        config
      )

      return {
        name: res.data?.name,
        web_url: replaceHost(res?.data?.web_url),
      }
    } catch (e) {
      logger.error(e)
    }
  },
  // 删除分支
  async delGitBranch(payload: { projectId; branch: string }) {
    if (isMock) {
      return true
    }

    const { projectId, branch } = payload || {}

    try {
      await axios.delete(
        `${GITLAB_API_V4}/projects/${projectId}/repository/branches/${encodeURIComponent(branch)}`,
        config
      )
      return true
    } catch (e) {
      logger.error(e)
    }
  },
  // 查询一个分支的详情
  async queryBranch(payload: { projectId: number; branch: string }) {
    if (isMock) {
      return {
        name: 'story/ai-detection',
        commit: {
          id: 's',
          short_id: 's',
          created_at: '2023-05-29T11:05:05.000+00:00',
          parent_ids: ['a', 'b'],
          title: "Merge branch 'feat/ai-detection' into 'story/ai-detection'",
          message:
            "Merge branch 'feat/ai-detection-' into 'story/ai-detection'\n\nFeat/ai detection ywx\n\nSee merge request web/xxx!2854",
          author_name: 'xxx',
          author_email: 'xx',
          authored_date: '2023-05-29T11:05:05.000+00:00',
          committer_name: 'yxxx',
          committer_email: 'xxxx',
          committed_date: '2023-05-29T11:05:05.000+00:00',
          trailers: {},
          web_url: 'http://xxx.com/-/commit',
        },
        merged: false,
        protected: true,
        developers_can_push: false,
        developers_can_merge: false,
        can_push: false,
        default: false,
        web_url: 'http://xxx.com/project/-/tree/story/ai-detection',
      }
    }

    try {
      const res = await axios.get(
        `${GITLAB_API_V4}/projects/${payload.projectId}/repository/branches/${encodeURIComponent(payload.branch)}`,
        config
      )
      return res.data
    } catch (e) {
      logger.error(e)
    }
  },

  // 发起一个 MR
  async createMR(payload: { projectId: number; title: string; source_branch: string; target_branch?: string }) {
    if (isMock) {
      return {
        iid: 23,
        title: '测试MR到main',
        web_url: 'https://www.baidu.com',
      }
    }

    if (!payload.projectId || !payload.title || !payload.source_branch) return

    const { projectId, source_branch, title } = payload || {}
    const target_branch = payload?.target_branch || getMainBranchByProjectId(projectId)

    try {
      const res = await axios.post(
        `${GITLAB_API_V4}/projects/${projectId}/merge_requests`,
        {
          title,
          id: projectId,
          source_branch,
          target_branch,
        },
        config
      )

      return {
        title,
        iid: res?.data.iid,
        web_url: replaceHost(res?.data?.web_url),
      }
    } catch (e) {
      logger.error(e)
    }
  },

  // 根据 mr_id/source/target 判断一个MR是否存在; 默认是 main/master
  async checkMRExisted(payload: {
    projectId: number
    mrId?: string | number
    source_branch?: string
    target_branch?: string
  }) {
    if (isMock) {
      return {
        iid: 23,
        title: '测试MR到main',
        web_url: 'https://www.baidu.com',
      }
    }

    if (!payload.projectId || (!payload.mrId && !payload.source_branch)) return

    try {
      const target_branch = payload?.target_branch || getMainBranchByProjectId(payload.projectId)

      const res = await axios.get(`${GITLAB_API_V4}/projects/${payload.projectId}/merge_requests?state=opened`, config)

      let doc
      if (payload.mrId) {
        doc = res.data?.find((m: any) => m.iid == payload.mrId)
      } else {
        doc = res.data?.find((m: any) => m.source_branch == payload.source_branch && m.target_branch == target_branch)
      }

      if (doc) {
        return {
          ...doc,
          web_url: replaceHost(doc.web_url),
        }
      }
    } catch (e) {
      logger.error(e)
    }
  },

  // 合并一个 mr
  async mergeMR(payload: { projectId: number; mrId: number }) {
    if (isMock) {
      return true
    }

    if (!payload.projectId || !payload.mrId) return

    try {
      const res = await axios.put(
        `${GITLAB_API_V4}/projects/${payload.projectId}/merge_requests/${payload.mrId}/merge`,
        {},
        config
      )
      return res.data?.state == 'merged'
    } catch (e) {
      logger.error(e)
    }
  },

  // 查询tags
  async queryTags(payload: { projectId: number }) {
    if (isMock) {
      return [
        {
          commit: {
            id: '2695effb5807a22ff3d138d593fd856244e155e7',
            short_id: '2695effb',
            title: 'Initial commit',
            created_at: '2017-07-26T11:08:53.000+02:00',
            parent_ids: ['2a4b78934375d7f53875269ffd4f45fd83a84ebe'],
            message: 'Initial commit',
            author_name: 'John Smith',
            author_email: 'john@example.com',
            authored_date: '2012-05-28T04:42:42-07:00',
            committer_name: 'Jack Smith',
            committer_email: 'jack@example.com',
            committed_date: '2012-05-28T04:42:42-07:00',
          },
          release: {
            tag_name: '1.0.0',
            description: 'Amazing release. Wow',
          },
          name: 'v1.0.0',
          target: '2695effb5807a22ff3d138d593fd856244e155e7',
          message: null,
          protected: true,
        },
      ]
    }

    try {
      const res = await axios.get(`${GITLAB_API_V4}/projects/${payload.projectId}/repository/tags`, config)
      return res.data
    } catch (e) {
      logger.error(e)
    }
  },

  // 查询所有MR opened, closed, locked, or merged/ all
  async queryMergeRequests(payload: { projectId: number; query?: { [key: string]: string } }) {
    if (isMock) {
      return [
        {
          id: 6481,
          iid: 2855,
          project_id: 34,
          title: 'Draft: feat: ai风险检测列表',
          description: '',
          state: 'opened',
          created_at: '2023-05-29T14:11:55.645Z',
          updated_at: '2023-05-30T08:43:11.023Z',
          merged_by: null,
          merged_at: null,
          closed_by: null,
          closed_at: null,
          target_branch: 'story/ai-detection',
          source_branch: 'feat/ai-detection',
          user_notes_count: 3,
          upvotes: 0,
          downvotes: 0,
          author: {
            id: 75,
            name: 'Blue',
            username: 'Blue',
            state: 'active',
            avatar_url: 'http://xxx.com',
            web_url: 'http://xxx.com',
          },
          assignees: [
            {
              id: 44,
              name: 'Bob',
              username: 'Bob',
              state: 'active',
              avatar_url: '',
              web_url: 'http://xxx.com/-/commit',
            },
          ],
          assignee: {
            id: 44,
            name: 'Bob',
            username: 'Bob',
            state: 'active',
            avatar_url: '',
            web_url: 'http://xxx.com/-/commit',
          },
          reviewers: [],
          source_project_id: 34,
          target_project_id: 34,
          labels: [],
          draft: true,
          work_in_progress: true,
          milestone: null,
          merge_when_pipeline_succeeds: false,
          merge_status: 'can_be_merged',
          sha: 'a',
          merge_commit_sha: null,
          squash_commit_sha: null,
          discussion_locked: null,
          should_remove_source_branch: null,
          force_remove_source_branch: true,
          reference: '!2855',
          references: {
            short: '!2855',
            relative: '!2855',
            full: 'web/xx!2855',
          },
          web_url: 'http://xxx.com/web/-/merge_requests/2855',
          time_stats: {
            time_estimate: 0,
            total_time_spent: 0,
            human_time_estimate: null,
            human_total_time_spent: null,
          },
          squash: false,
          task_completion_status: {
            count: 0,
            completed_count: 0,
          },
          has_conflicts: false,
          blocking_discussions_resolved: false,
          approvals_before_merge: null,
        },
        {
          id: 6083,
          iid: 2790,
          project_id: 34,
          title: 'Draft: Story/footage operation log',
          description: '',
          state: 'opened',
          created_at: '2023-05-17T03:03:02.776Z',
          updated_at: '2023-05-31T06:42:11.106Z',
          merged_by: null,
          merged_at: null,
          closed_by: null,
          closed_at: null,
          target_branch: 'main',
          source_branch: 'story/footage-operation-log',
          user_notes_count: 0,
          upvotes: 0,
          downvotes: 0,
          author: {
            id: 27,
            name: 'Green',
            username: 'Green',
            state: 'active',
            avatar_url: '',
            web_url: 'http://xxx.com/xxx',
          },
          assignees: [],
          assignee: null,
          reviewers: [],
          source_project_id: 34,
          target_project_id: 34,
          labels: [],
          draft: true,
          work_in_progress: true,
          milestone: null,
          merge_when_pipeline_succeeds: false,
          merge_status: 'can_be_merged',
          sha: 'er',
          merge_commit_sha: null,
          squash_commit_sha: null,
          discussion_locked: null,
          should_remove_source_branch: null,
          force_remove_source_branch: null,
          reference: '!2790',
          references: {
            short: '!2790',
            relative: '!2790',
            full: 'web/cs!2790',
          },
          web_url: 'http://xxx.com/-/commit',
          time_stats: {
            time_estimate: 0,
            total_time_spent: 0,
            human_time_estimate: null,
            human_total_time_spent: null,
          },
          squash: false,
          task_completion_status: {
            count: 0,
            completed_count: 0,
          },
          has_conflicts: false,
          blocking_discussions_resolved: true,
          approvals_before_merge: null,
        },
      ]
    }

    try {
      const qs = payload.query ? new URLSearchParams(payload.query).toString() : ''

      const res = await axios.get(
        `${GITLAB_API_V4}/projects/${payload.projectId}/merge_requests` + (qs ? `?${qs}` : ''),
        config
      )
      return res.data
    } catch (e) {
      logger.error(e)
    }
  },

  // 查询所有分支
  async queryAllBranches(payload: { projectId: number; per_page?: number; search?: string }) {
    if (isMock) {
      return [
        {
          name: 'story/ai-detection',
          commit: {
            id: 'vv',
            short_id: 'b1787e4f',
            created_at: '2023-05-29T19:05:05.000+08:00',
            parent_ids: null,
            title: "Merge branch 'feat/ai-detection' into 'story/ai-detection'",
            message: "Merge branch 'feat/ai-detection' into 'story/ai-detection'",
            author_name: 'xxx',
            author_email: 'xxx',
            authored_date: '2023-05-29T19:05:05.000+08:00',
            committer_name: 'xxx',
            committer_email: 'xxx',
            committed_date: '2023-05-29T19:05:05.000+08:00',
            web_url:
              'http://xxx.com/-/commit',
          },
          merged: true,
          protected: true,
          developers_can_push: false,
          developers_can_merge: false,
          can_push: false,
          default: false,
          web_url: 'http://1xxx.com/web/-/tree/story/ai-detection',
        },
      ]
    }

    try {
      const searchQuery = payload.search ? `&search=${payload.search}` : ''

      const res = await axios.get(
        `${GITLAB_API_V4}/projects/${payload.projectId}/repository/branches?per_page=${
          payload.per_page || 20
        }${searchQuery}`,
        config
      )
      return res.data
    } catch (e) {
      logger.error(e)
    }
  },
}

// --- 分支集成
function MergeException(message, detail?: any) {
  this.name = 'MergeException'
  this.message = message
  this.detail = detail
}
export async function createReleaseBranch(data: {
  sourceBranchList: {
    branch: string
    branchUrl: string
    commitId?: string
  }[]
  releaseBranch: string
  releaseBranchUrl: string
  needCreateBranch: boolean
  env: number
  remote: string
  mainBranch: string
  onReleaseLog: Function
}) {
  // 操作日志，前端显示用的
  const jsonLog = []
  const append2Log = async (s: string, w = false) => {
    jsonLog.push(s)

    if (w && typeof data.onReleaseLog == 'function') {
      await data.onReleaseLog(data.env, jsonLog.join(';'))
    }
  }

  //
  const envDir = data.env == 1 ? 'dev' : data.env == 2 ? 'beta' : ''
  if (!envDir) {
    throw new Error('invalid env')
  }

  // 根据环境创建基目录，管理所有的fe项目
  const baseDir = path.join(process.cwd(), envDir)
  await fs.ensureDir(baseDir)

  // 初始化git
  const git: SimpleGit = simpleGit({
    baseDir,
    binary: 'git',
  })
  append2Log(`1. init simple-git in ${baseDir}`)

  // repo名字、目录
  const repoName = (data.remote.split('/') || []).pop().replace(/\.git$/, '')
  const repoDir = path.join(baseDir, repoName)
  // 不存在拉取一下，存在则进入
  const exists = await fs.pathExists(repoDir)
  if (!exists) {
    await git.clone(data.remote)
    append2Log(`2. clone ${data.remote}`)
  }

  // 进入项目
  await git.cwd({ path: repoDir, root: true })
  append2Log(`3. switch to ${repoDir}`)

  // release
  let releaseBranch = data.releaseBranch,
    releaseBranchUrl = data.releaseBranchUrl
  try {
    if (data.needCreateBranch) {
      throw new Error('createNew')
    }
    // 可能存在远程分支已经不在了，这里就会报错
    else if (releaseBranch) {
      await git.checkout(releaseBranch)
      await git.pull()
      await append2Log(`4. checkout and pull the existed ${releaseBranch}`, true)
    }
    //
    else {
      throw new Error('invalid releaseBranch')
    }
  } catch (e) {
    append2Log(`error: ${e.message}`)

    // 切换到main，更新一下
    await git.checkout(data.mainBranch || 'main')
    await git.pull()
    append2Log(`4. checkout and pull ${data.mainBranch || 'main'}`)

    // 远程分支已经不在了，删除本地分支 not necessary
    // if (releaseBranch) {
    // await git.deleteLocalBranch(releaseBranch)
    // }

    // 为空、远程分支已经不在了 => 新建一个release分支
    releaseBranch = 'release/' + envDir + '-' + dayjs().format('YYYY-MM-DD-HH-mm-ss')
    await git.checkoutLocalBranch(releaseBranch)
    await git.push(['--set-upstream', 'origin', releaseBranch])

    await append2Log(`5. create a release branch, ${releaseBranch}`, true)
  }

  releaseBranchUrl = `${data.remote.replace(/\.git$/, '')}/-/tree/${releaseBranch}`

  // 合并每个分支 到 release
  for (const branch of data.sourceBranchList) {
    append2Log(`start to merge ${branch.branch} ${branch.commitId}`)

    // git merge --no-edit -s recursive -Xignore-space-at-eol --no-ff e4fe04881b35c6500a163169ecf2b3336a61db8e
    try {
      await git.merge(['--no-edit', '-s', 'recursive', '--no-ff', branch.commitId])
      await git.push()
    } catch (e) {
      await append2Log(`merge --abort: ${e.message}`, true)

      await git.merge(['--abort'])
      throw new MergeException(e.message, { releaseBranch, releaseBranchUrl, commitId: branch.commitId })
    }
  }

  await append2Log(`release done`, true)

  return {
    releaseBranch,
    releaseBranchUrl,
  }
}
