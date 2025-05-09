<template>
  <div class="bs-iter-page">
    <div class="bs-iter-head">
      <a-button type="primary" @click="onCreateIter">新建迭代</a-button>
    </div>

    <a-table
      rowKey="iid"
      :loading="loading"
      :columns="columns"
      :data-source="iterList"
      :rowClassName="(_record) => (_record.status == ITER_STATUS.PUBLISHED ? 'bs-iter-row-disabled' : '')"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'branch'">
          <div>
            <a-tag :color="ITER_STATUS_TAG_COLOR[record.status]">
              {{
                record.status == ITER_STATUS.PUBLISHING && record.audit?.agreed
                  ? '审批通过'
                  : ITER_STATUS_TEXT[record.status]
              }}
            </a-tag>
            <span :class="[record.disabled ? '' : 'g-text-link']" @click="() => openIterDetail(record)">
              {{ record.title }}
            </span>
          </div>

          <div style="margin-top: 8px">
            <span>{{ record.branch }}</span>
          </div>
        </template>

        <template v-if="column.key === 'dev'">
          <div v-if="record.devDeploy?.status">
            <a-tag
              color="orange"
              v-if="branchMode && record.devBranch && !record.devBranch.integrated && !record.devBranch.commitId"
            >
              已下线
            </a-tag>

            <div class="bs-iter-badge" @mouseenter="() => onQueryStatus(ENV_TYPE.DEV, record)">
              <div class="bs-iter-badge-env">
                <span>dev</span>

                <span
                  v-if="
                    record.devDeploy?.pipelineRunId &&
                    (record.devDeploy?.status == PIPELINE_STATE.FAIL ||
                      devLatestVersion == record.devDeploy?.pipelineRunId)
                  "
                >
                  #{{ record.devDeploy?.pipelineRunId }}
                </span>
              </div>

              <span
                class="bs-iter-badge-status bs-iter-badge-conflicts"
                v-if="
                  record.devDeploy?.status == PIPELINE_STATE.RUNNING &&
                  record.devBranch?.commitId &&
                  record.devBranch?.releaseBranch
                "
              >
                CONFLICTS
              </span>
              <span v-else :class="['bs-iter-badge-status', `bs-iter-badge-${record.devDeploy?.status}`]">
                {{ record.devDeploy?.status.toLowerCase() }}
              </span>

              <a-tooltip
                v-if="!record.disabled"
                :title="
                  record.devDeploy?.status == PIPELINE_STATE.RUNNING ||
                  record.devDeploy?.status == PIPELINE_STATE.WAITING
                    ? '正在部署'
                    : '部署到开发'
                "
              >
                <SyncOutlined
                  class="bs-iter-badge-play"
                  v-if="
                    record.devDeploy?.status == PIPELINE_STATE.RUNNING ||
                    record.devDeploy?.status == PIPELINE_STATE.WAITING
                  "
                  :spin="true"
                />
                <play-circle-outlined
                  v-else
                  class="bs-iter-badge-play"
                  @click="() => onQuickDeploy(ENV_TYPE.DEV, record._id)"
                />
              </a-tooltip>
            </div>

            <div v-if="record.devDeploy?.endTime" class="bs-iter-relative-time">
              {{ dayjs(record.devDeploy?.endTime).fromNow() }}
            </div>
          </div>
        </template>

        <template v-if="column.key === 'beta'">
          <div v-if="record.betaDeploy?.status">
            <!-- 开启分支模式，曾经部署过，但是不去集成下线了 -->
            <a-tag
              color="orange"
              v-if="branchMode && record.betaBranch && !record.betaBranch.integrated && !record.betaBranch.commitId"
            >
              已下线
            </a-tag>

            <div class="bs-iter-badge" @mouseenter="() => onQueryStatus(ENV_TYPE.TEST, record)">
              <div class="bs-iter-badge-env">
                <span>beta</span>

                <span
                  v-if="
                    record.betaDeploy?.pipelineRunId &&
                    (record.betaDeploy?.status == PIPELINE_STATE.FAIL ||
                      betaLatestVersion == record.betaDeploy?.pipelineRunId)
                  "
                >
                  #{{ record.betaDeploy?.pipelineRunId }}
                </span>
              </div>

              <span
                class="bs-iter-badge-status bs-iter-badge-conflicts"
                v-if="
                  record.betaDeploy?.status == PIPELINE_STATE.RUNNING &&
                  record.betaBranch?.commitId &&
                  record.betaBranch?.releaseBranch
                "
              >
                CONFLICTS
              </span>
              <span v-else :class="['bs-iter-badge-status', `bs-iter-badge-${record.betaDeploy?.status}`]">
                {{ record.betaDeploy?.status.toLowerCase() }}
              </span>

              <a-tooltip
                v-if="!record.disabled"
                :title="
                  record.betaDeploy?.status == PIPELINE_STATE.RUNNING ||
                  record.betaDeploy?.status == PIPELINE_STATE.WAITING
                    ? '正在部署'
                    : '部署到测试'
                "
              >
                <SyncOutlined
                  class="bs-iter-badge-play"
                  v-if="
                    record.betaDeploy?.status == PIPELINE_STATE.RUNNING ||
                    record.betaDeploy?.status == PIPELINE_STATE.WAITING
                  "
                  :spin="true"
                />
                <play-circle-outlined
                  v-else
                  class="bs-iter-badge-play"
                  @click="() => onQuickDeploy(ENV_TYPE.TEST, record._id)"
                />
              </a-tooltip>
            </div>

            <div v-if="record.betaDeploy?.endTime" class="bs-iter-relative-time">
              {{ dayjs(record.betaDeploy?.endTime).fromNow() }}
            </div>
          </div>
        </template>

        <template v-if="column.key === 'action' && !record.disabled">
          <!-- 不集成了 -->
          <span
            v-if="record.devBranch?.integrated || record.betaBranch?.integrated"
            class="g-text-link"
            @click="() => offlineEnv(record)"
          >
            下线
          </span>
          <a-divider type="vertical" />

          <span class="g-text-link" @click="() => readDaily(record)">日报</span>
          <a-divider type="vertical" />

          <span class="g-text-link" @click="() => editIter(record)">编辑</span>
          <a-divider type="vertical" />

          <a-popconfirm
            title="确认删除"
            ok-text="是"
            cancel-text="否"
            @confirm="() => delInter(record)"
            @cancel="() => (record.delConfirmVisible = false)"
            :visible="record.delConfirmVisible"
          >
            <span @click.stop="() => onDelClick(record)" class="g-text-link">删除</span>
          </a-popconfirm>
        </template>
      </template>
    </a-table>

    <CreateIteration
      ref="createRef"
      :appId="appId"
      :projectId="projectId"
      :projectName="projectName"
      @created="onCreatedUpdated"
    />

    <IterDaily ref="dailyRef" />

    <Offline ref="offlineRef" :appId="appId" />
  </div>
</template>

<script lang="ts" setup>
import { ref, createVNode, computed } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlayCircleOutlined, SyncOutlined } from '@ant-design/icons-vue'
import { ROLE_TYPE } from '@fe-portal/shared'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import BasementService from '@/api/basement'
import { goBasementAuditPage } from '@/router/goto'
import { ENV_TYPE, ITER_STATUS, ITER_STATUS_TAG_COLOR, ITER_STATUS_TEXT, PIPELINE_STATE } from '@/enums/appEnum'

import CreateIteration from '@/components/createIteration.vue'
import IterDaily from '@/components/iterDaily.vue'
import Offline from '@/components/offline.vue'

dayjs.extend(relativeTime)

const props = defineProps({
  branchMode: Boolean,
  projectName: String,
  projectId: {
    type: Number,
    required: true,
  },
})

// 从环境中移出
const offlineRef = ref()
function offlineEnv(record: any) {
  if ([PIPELINE_STATE.RUNNING, PIPELINE_STATE.WAITING].includes(record.betaDeploy?.status)) {
    message.warning('正在部署，请完成部署再下线')
    return
  }

  offlineRef.value?.openModal(record)
}

// 日报
const dailyRef = ref()
function readDaily(record: any) {
  dailyRef.value?.openModal(record)
}

// 提醒提测；有点烦，下掉
// async function onRemind(e: Event, iid: string, type: number) {
//   e.stopPropagation()

//   const res = await BasementService.reminderTesting({ iid, type })

//   res.data ? message.success('提醒成功') : message.error('提醒失败')
// }

// 初始化
const route = useRoute()
const appId = route.params?.id as string
const userInfo = computed(() => window.microApp?.getGlobalData().fetchUserInfo())

const loading = ref(false)
const iterList = ref([])
// 开发环境最近一次部署成功的版本
const devLatestVersion = computed(() => {
  const versionList = iterList.value
    .filter((o: any) => o.devDeploy?.status == PIPELINE_STATE.SUCCESS)
    .map((o: any) => o.devDeploy?.pipelineRunId)
    .filter(Boolean)
  return versionList.reduce((a, b) => Math.max(a, b), -Infinity)
})
// 测试环境最近一次部署成功的版本
const betaLatestVersion = computed(() => {
  const versionList = iterList.value
    .filter((o: any) => o.betaDeploy?.status == PIPELINE_STATE.SUCCESS)
    .map((o: any) => o.betaDeploy?.pipelineRunId)
    .filter(Boolean)
  return versionList.reduce((a, b) => Math.max(a, b), -Infinity)
})

async function init() {
  loading.value = true

  // 默认只取20个，因为是开发中的需求，不会太多的
  const res = await BasementService.fetchIterList(appId)

  loading.value = false

  iterList.value = (res?.data || []).map((o: any) => {
    // 不是自己的需求
    o.disabled = [ROLE_TYPE.ADMIN, ROLE_TYPE.MANAGER].includes(userInfo.value?.role)
      ? false
      : !o.owner?.map((p: any) => p.name).includes(userInfo.value?.name)

    return o
  })
}
init()

// 快速构建
async function onQuickDeploy(env: ENV_TYPE, iid: string) {
  const res = await BasementService.deploy({
    env,
    iid,
    appId,
    projectId: props.projectId,
  })

  if (res?.code == 200) {
    const iter: any = iterList.value.find((o: any) => o._id == iid)

    if (iter) {
      if (env == ENV_TYPE.DEV) {
        iter.devDeploy.status = PIPELINE_STATE.RUNNING
      }
      // 测试
      else if (env == ENV_TYPE.TEST) {
        iter.betaDeploy.status = PIPELINE_STATE.RUNNING
      }
    }
  }
}
// 快速查询一下，应该改为这个页面自动轮询比较好，懒得做
let flag = false
async function onQueryStatus(env: ENV_TYPE, record: any) {
  // 开发、测试存在构建中的情况
  if (
    [PIPELINE_STATE.RUNNING, PIPELINE_STATE.WAITING].includes(record.devDeploy?.status) ||
    [PIPELINE_STATE.RUNNING, PIPELINE_STATE.WAITING].includes(record.betaDeploy?.status)
  ) {
    if (flag) return

    flag = true
    const res = await BasementService.fetchIterDetail({ iid: record._id })
    flag = false

    const iter: any = iterList.value.find((o: any) => o._id == record._id)

    if (iter && env == ENV_TYPE.DEV && res.data.devDeploy) {
      iter.devDeploy.status = res.data.devDeploy.status
      iter.devDeploy.endTime = res.data.devDeploy.endTime
    }
    // 测试
    else if (iter && env == ENV_TYPE.TEST && res.data.betaDeploy) {
      iter.betaDeploy.status = res.data.betaDeploy?.status
      iter.betaDeploy.endTime = res.data.betaDeploy?.endTime
    }
  }
}

// 新建/编辑
const createRef = ref()
function onCreateIter() {
  createRef.value.openModal()
}
const editIter = (record: { _id: number }) => {
  createRef.value.openModal(record)
}
function onCreatedUpdated() {
  init()
}

// 删除
const onDelClick = (record: { delConfirmVisible: boolean }) => {
  record.delConfirmVisible = true
}
const delInter = async (record: { _id: number }) => {
  const res = await BasementService.delInter({ iid: record._id })
  // 删除成功，重新刷新页面
  if (res.data) {
    init()
    message.success('删除成功')
  } else {
    message.error(res.msg)
  }
}

// 表格定制
function openIterDetail(record: any) {
  goBasementAuditPage(appId, record._id)
}
function formatDiff(record: { status: number; text: string; type: number; iid: string }) {
  if (!record?.text) return ''

  const t = dayjs(record.text).format('MM-DD')
  if ([ITER_STATUS.INVALID, ITER_STATUS.PUBLISHED].includes(record.status)) {
    return t
  }

  // diff > 0 说明当前时间已经过去指定时间
  const diff = dayjs().diff(dayjs(record.text).format('YYYY-MM-DD'), 'hour')

  let desc = ''
  // remindVisible = false
  if (diff < 0 && diff >= -24) {
    desc = '(明天)'
  } else if (diff >= 0) {
    // 即将 delay
    const delayDay = Math.floor(diff / 24)
    desc = delayDay == 0 ? '(今天)' : `+${delayDay}天`
    // remindVisible = true
  }

  return createVNode('div', { class: 'bs-iter-time' }, [
    t,
    createVNode('div', null, `${desc}`),
    null,
    // remindVisible ? createVNode('div', { onClick: (e: any) => onRemind(e, record.iid, record.type) }, `催一下`) : null,
  ])
}
const columns = [
  {
    title: '分支',
    dataIndex: 'branch',
    key: 'branch',
    width: '20%',
  },
  {
    title: 'dev部署',
    key: 'dev',
    width: '14%',
  },
  {
    title: 'beta部署',
    key: 'beta',
    width: '14%',
  },
  {
    title: '负责人',
    dataIndex: 'owner',
    key: 'owner',
    width: '16%',
    customRender({ text }) {
      return (text?.map((t) => t?.name) || []).join(',')
    },
  },
  {
    title: '提测时间',
    dataIndex: 'testDate',
    key: 'testDate',
    width: '8%',
    customRender({ record }) {
      return formatDiff({ status: record.status, text: record.testDate, iid: record._id, type: 1 })
    },
  },
  {
    title: '上线时间',
    dataIndex: 'pubDate',
    key: 'pubDate',
    width: '8%',
    customRender({ record }) {
      return formatDiff({ status: record.status, text: record.pubDate, iid: record._id, type: 2 })
    },
  },
  {
    title: '操作',
    key: 'action',
    width: '20%',
  },
]
</script>

<style lang="less">
.bs-iter-page {
  margin-top: -50px;
  font: 12px/14px PingFang SC;

  .bs-iter-head {
    padding: 0;
    margin: 0 0 20px;
    display: flex;
    justify-content: flex-end;
  }
  .bs-iter-time {
    div {
      font: 12px/12px PingFang SC;
      color: #e91515;
    }
  }
  .bs-iter-row-disabled {
    background: #fafafa;
  }
  .bs-iter-badge {
    margin-top: 12px;
    display: flex;
    align-items: center;
    border-radius: 4px;
    color: #fff;
    font-size: 12px;
    line-height: 1;
    .bs-iter-badge-env {
      padding: 4px 4px 4px 6px;
      background: #505050;
      border-top-left-radius: 4px;
      border-bottom-left-radius: 4px;
      white-space: nowrap;
    }
    .bs-iter-badge-status {
      display: flex;
      column-gap: 4px;
      padding: 4px 6px 4px 4px;
      border-top-right-radius: 4px;
      border-bottom-right-radius: 4px;
    }
    .bs-iter-badge-SUCCESS {
      background: #4ec726;
    }
    .bs-iter-badge-FAIL {
      background: #cf1322;
    }
    .bs-iter-badge-RUNNING {
      background: #1580c0;
    }
    .bs-iter-badge-WAITING {
      background: #788cd5;
    }
    .bs-iter-badge-conflicts {
      background: #cf1322;
    }
    .bs-iter-badge-play {
      cursor: pointer;
      margin-left: 12px;
      font-size: 16px;
      color: #08c;

      &-disabled {
        cursor: not-allowed;
      }
    }
  }
  .bs-iter-relative-time {
    font-size: 12px;
    color: #aaa;
  }
}
</style>
