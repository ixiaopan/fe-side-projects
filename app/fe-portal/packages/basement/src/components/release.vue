<template>
  <div class="bs-audit-env bs-audit-prod">
    <div class="bs-audit-env-head">
      <a-tooltip v-if="deployData?.endTime">
        <template #title>执行人：{{ deployData?.operator }}</template>
        <span class="bs-audit-env-deploy-time">
          上次部署: {{ dayjs(deployData.endTime).format('YYYY-MM-DD HH:mm:ss') }}
        </span>
      </a-tooltip>

      <a-tooltip v-if="env == ENV_TYPE.PROD">
        <template v-if="!agreed" #title>审批通过，才能发布</template>
        <a-button :disabled="hasEnd || deploying || !agreed" type="primary" @click="onConfirm">发布到线上</a-button>
      </a-tooltip>
      <a-button v-else :disabled="hasEnd || deploying" type="primary" @click="onConfirm">
        部署到{{ ENV_TEXT[env] }}
      </a-button>
    </div>

    <div class="bs-audit-pipeline">
      <div class="bs-audit-pipeline-card-list">
        <div v-for="(item, idx) in STEP_LIST" :key="item.id" class="bs-audit-pipeline-card">
          <p class="bs-audit-pipeline-card-meta">
            <span class="bs-audit-pipeline-card-status">
              <!-- done -->
              <check-circle-two-tone v-if="idx < step" two-tone-color="#52c41a" />

              <template v-else-if="idx == step">
                <!-- error -->
                <close-circle-two-tone v-if="error" two-tone-color="red" />

                <!-- loading -->
                <loading-outlined v-else :style="{ color: '#1890ff' }" />
              </template>

              <!-- wait -->
              <clock-circle-outlined v-else />
            </span>

            <!-- 标题 -->
            <span class="bs-audit-pipeline-card-title">{{ item.label }}</span>

            <!-- 云效runId -->
            <a
              v-if="item.withLog && deployData?.pipelineRunId"
              class="bs-audit-pipeline-card-meta-action"
              :href="`https://flow.aliyun.com/pipelines/${deployData?.pipelineId}/builds/${deployData?.pipelineRunId}`"
              target="_blank"
            >
              #{{ deployData?.pipelineRunId }}
            </a>

            <!-- 集成分支 -->
            <span
              v-if="item.withBranch && branchMode && !isProd"
              class="bs-audit-pipeline-card-meta-action g-text-link"
              :style="{ marginRight: '8px' }"
              @click="openReleaseDetail"
            >
              分支集成
            </span>

            <!-- 是否跳过 生产环境自动merge -->
            <span class="bs-audit-pipeline-card-meta-action" v-if="isProd && item.withBranch">
              <a-checkbox v-model:checked="skipCheck" />
              跳过此步骤
            </span>
          </p>

          <!-- 运行分支/日志 -->
          <div class="bs-audit-pipeline-card-info">
            <!-- 分支集成/日志 -->
            <template v-if="item.withBranch">
              <span
                :style="{ color: 'red', cursor: 'pointer' }"
                v-if="!hasResolved && checkingRelease?.commitId && checkingRelease?.releaseBranch"
                @click="openConflictDetail"
              >
                解决冲突
              </span>
              <!-- 有冲突才让取消，避免阻塞别人部署 -->
              <span
                :style="{ color: 'red', cursor: 'pointer' }"
                v-if="!hasResolved && checkingRelease?.commitId && checkingRelease?.releaseBranch"
                @click="cancelReleaseDueConflicts"
              >
                取消集成
              </span>
              <!-- 在运行中、运行成功后 -->
              <span class="g-text-link" v-if="deploying || withReleaseLog" @click="openReleaseLog">日志</span>
            </template>

            <!-- 构建日志 -->
            <template v-if="item.withLog && deployingHasRunId">
              <span class="g-text-link" @click="() => onQueryBuildLog(idx)">日志</span>
              <span v-if="deploying" :style="{ color: 'red', cursor: 'pointer' }" @click="cancelPipelineRun">
                取消部署
              </span>
            </template>
          </div>

          <!-- 错误 -->
          <div v-if="step == idx && error" class="bs-audit-pipeline-card-output bs-audit-pipeline-card-error">
            {{ error }}
          </div>

          <!-- 构建产物 -->
          <div class="bs-audit-pipeline-card-output" v-if="artifactsVisible && item.withArtifacts">
            <a :href="deployData?.artifacts?.url" target="_blank">{{ deployData?.artifacts?.name }}</a>
          </div>
        </div>
      </div>
    </div>

    <a-modal v-model:visible="runBranchVisible" :style="{ width: '60vw' }">
      <div>部署环境：{{ props.env == ENV_TYPE.DEV ? '开发环境' : '测试环境' }}</div>

      <div>
        集成分支：
        <a v-if="runRelease?.branch && runRelease?.url" :href="runRelease?.url" target="_blank">
          {{ runRelease?.branch }}
        </a>
      </div>

      <div>
        运行分支
        <a-table :columns="releaseColumns" :data-source="runBranchList" :pagination="false">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'branch'">
              <a :href="record?.branchUrl" target="_blank">{{ record.branch }}</a>
            </template>

            <template v-if="column.key === 'status'">
              <a-tag :color="ITER_STATUS_TAG_COLOR[record.status]">
                {{ ITER_STATUS_TEXT[record.status] }}
              </a-tag>
            </template>

            <template v-if="column.key === 'owner'">
              <span>{{ record.owner?.map((o) => o.name).join(',') }}</span>
            </template>
          </template>
        </a-table>
      </div>
    </a-modal>

    <a-modal v-model:visible="conflictVisible" :style="{ width: '80vw' }">
      <p>按提示解决冲突</p>

      <div class="bs-audit-code-hint">
        <p>
          1. 切换到集成分支
          <span class="g-text-link copy" :data-clipboard-text="stepOneTips">复制</span>
        </p>
        <code class="bs-audit-code">
          {{ stepOneTips }}
        </code>
      </div>
      <div class="bs-audit-code-hint">
        <p>
          2. 手动解决冲突
          <span class="g-text-link copy" :data-clipboard-text="`git merge --no-ff ${checkingRelease?.commitId}`">
            复制
          </span>
        </p>
        <code class="bs-audit-code">git merge --no-ff {{ checkingRelease?.commitId }}</code>
      </div>
      <div class="bs-audit-code-hint">
        <p>3. 提交到远程仓库</p>
        <code class="bs-audit-code">git push</code>
      </div>

      <div class="bs-audit-code-hint">
        <a-button @click="onResolveConflict">我已解决冲突</a-button>
      </div>
    </a-modal>

    <a-modal
      :closable="false"
      v-model:visible="logVisible"
      :bodyStyle="{ height: '80vh', paddingLeft: 0 }"
      :style="{ width: '80vw' }"
    >
      <div class="bs-audit-pipeline-log-container">
        <div class="bs-audit-pipeline-log-steps">
          <div class="bs-audit-pipeline-log-steps-title">构建</div>
          <div
            v-for="(item, index) in buildLogList"
            :class="[index === currentLogIndex && 'step-item-active', 'step-item']"
            :key="index"
            @click="() => changeStep(index)"
          >
            <close-circle-two-tone v-if="item?.indexOf('ERROR') > 0" two-tone-color="red" />
            <check-circle-two-tone v-else two-tone-color="#52c41a" />
            <span class="text">步骤{{ index + 1 }}</span>
          </div>
        </div>
        <div class="bs-audit-pipeline-log" v-html="buildLogList[currentLogIndex]"></div>
      </div>
    </a-modal>

    <a-modal v-model:visible="releaseLogVisible" :style="{ width: '80vw' }">
      <p v-for="(item, idx) in releaseLog" :key="idx">{{ item }}</p>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watchEffect } from 'vue'
import { CheckCircleTwoTone, ClockCircleOutlined, CloseCircleTwoTone, LoadingOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { lockClick } from '@fe-portal/shared'
import Clipboard from 'clipboard'

import { ENV_TYPE, ENV_TEXT, ITER_STATUS_TAG_COLOR, ITER_STATUS_TEXT } from '@/enums/appEnum'
import BasementService from '@/api/basement'

const props = defineProps<{
  env: ENV_TYPE
  iid: string
  appId: string
  projectId: number
  hasEnd: boolean // 迭代已经结束
  emptyPipeline?: boolean // 没有流水线

  withReleaseLog?: boolean
  deployData?:
    | {
        startTime: number
        endTime: number

        pipelineId: string | number | null
        pipelineRunId: string | number | null
        operator: string
        error: string
        stage: number
        status: string // WAITING, RUNNING, SUCCESS, FAIL
        artifacts?:
          | {
              name: string
              url: string
            }
          | undefined
      }
    | undefined

  branchMode?: boolean // 是否是分支模式
  branch?: string
  branchUrl?: string // 本次迭代的分支

  // 需要解决冲突的分支提交
  checkingRelease?: {
    commitId?: string
    releaseBranch: string
  }

  agreed?: boolean // 同意发布
}>()

const emits = defineEmits(['start', 'failed', 'published'])

const step = ref()
const error = ref('')

// 是否是生产环境
const isProd = computed(() => props.env == ENV_TYPE.PROD)
// 不同环境步骤的名字不一样
const STEP_LIST = computed(() => [
  {
    id: 'check',
    label: isProd.value ? 'MR合并检查' : '分支管理器',
    withBranch: true,
  },
  {
    id: 'build',
    label: '构建',
    withLog: true,
    withArtifacts: true,
  },
  {
    id: 'deploy',
    label: '部署',
  },
])
// 表示触发云效部署了，这个时候才能显示日志
const deployingHasRunId = computed(() => !!props.deployData?.pipelineRunId)
const deploying = computed(() => ['WAITING', 'RUNNING'].includes(props.deployData?.status || ''))
const deployedSuccess = computed(() => props.deployData?.status == 'SUCCESS')
const artifactsVisible = computed(() => deployedSuccess.value && props.deployData?.artifacts?.url)
const stepOneTips = computed(() => {
  // 内部系统特殊分支
  return `git checkout ${props.projectId == 5 ? 'master' : 'main'}; git pull; git branch -D
          ${props.checkingRelease?.releaseBranch}; git checkout ${props.checkingRelease?.releaseBranch};`
})
// 刷新页面的话 && 实时更新
watchEffect(() => {
  console.log('watch effect', props.deployData?.stage, props.deployData?.status)
  step.value = props.deployData?.stage
  error.value = props.deployData?.error || ''
})

// --- 分支集成
const runBranchVisible = ref(false)
// 同时运行的分支
const runBranchList = ref<
  {
    devBranch?: {
      releaseBranch?: string
      releaseBranchUrl?: string
    }
    betaBranch?: {
      releaseBranch?: string
      releaseBranchUrl?: string
    }
    branch: string
    branchUrl: string
    status?: number
    owner?: { name: string }[]
  }[]
>([])
const runRelease = computed(() => {
  if (props.env == ENV_TYPE.DEV) {
    return (runBranchList.value || []).map((o) => ({
      branch: o.devBranch?.releaseBranch,
      url: o.devBranch?.releaseBranchUrl,
    }))[0]
  }

  if (props.env == ENV_TYPE.TEST) {
    return (runBranchList.value || []).map((o) => ({
      branch: o.betaBranch?.releaseBranch,
      url: o.betaBranch?.releaseBranchUrl,
    }))[0]
  }

  return null
})

const releaseColumns = [
  {
    title: '分支',
    dataIndex: 'branch',
    key: 'branch',
  },
  {
    title: '进度',
    dataIndex: 'status',
    key: 'status',
  },
  {
    title: '开发者',
    dataIndex: 'owner',
    key: 'owner',
  },
]
async function openReleaseDetail() {
  runBranchVisible.value = true

  const res = await BasementService.queryRunBranchesByEnv({
    env: props.env,
    appId: props.appId,
  })

  runBranchList.value = res?.data
}

// --- 分支集成的冲突提示
// 查看集成日志
const releaseLogVisible = ref(false)
const releaseLog = ref<string[]>([])
async function openReleaseLog() {
  releaseLogVisible.value = true

  const res = await BasementService.queryReleaseLog({ iid: props.iid })

  const log = props.env == ENV_TYPE.DEV ? res.data?.devReleaseLog : res.data?.betaReleaseLog

  releaseLog.value = log.split(';')
}

const conflictVisible = ref(false)
const hasResolved = ref(false)
// 因为冲突，取消集成
async function cancelReleaseDueConflicts() {
  const res = await BasementService.offlineConflictRelease({
    env: props.env,
    iid: props.iid,
    appId: props.appId,
  })
  if (res?.data) {
    message.success('取消集成成功')
    emits('failed')
  }
}
// 查看提示
function openConflictDetail() {
  conflictVisible.value = true
}
// 复制提示
const clipboard = new Clipboard('.copy')
clipboard.on('success', () => {
  message.success('复制成功')
})

clipboard.on('error', () => {
  message.success('复制失败')
})

// 解决冲突
let flag = false
async function onResolveConflict() {
  if (flag) return

  flag = true

  const res = await BasementService.resolveConflict({
    env: props.env,
    iid: props.iid,
    appId: props.appId,
  })

  if (res?.data) {
    conflictVisible.value = false

    // 临时标记，冲突已经解决，UI上【解决冲突】这几个字会立即隐藏，无需刷新页面
    hasResolved.value = true
  }

  flag = false
}

// -- 执行发布/部署
const skipCheck = ref(false)

// 取消部署
async function cancelPipelineRun() {
  const res = await BasementService.cancelPipelineRun({
    env: props.env,
    iid: props.iid,
    appId: props.appId,
  })

  if (res?.data) {
    message.success('取消部署成功')
    emits('failed')
  }
}
// 执行部署
async function startPipelineRun() {
  const res = await BasementService.deploy({
    env: props.env,
    iid: props.iid,
    appId: props.appId,
    projectId: props.projectId,
    skipCheck: skipCheck.value,
    ...(isProd.value ? { skipProdPipeline: props.emptyPipeline } : {}),
  })

  if (res?.data) {
    emits('start')
  }
}
// 去部署
async function onConfirm() {
  // 分支模式下，开发/测试走集成
  if (!isProd.value && props.branchMode) {
    startPipelineRun()
  }
  // 非分支模式，直接部署会导致分支之间的覆盖
  else if (!isProd.value || props.agreed) {
    Modal.confirm({
      title: isProd.value ? '确认发布到线上' : '确认部署',
      content:
        isProd.value && props.emptyPipeline
          ? '检测到该业务没有配置线上流水线，确认发布只能合并MR并写入上线记录，不会触发线上部署'
          : '',
      okText: '确认',
      cancelText: '取消',
      async onOk() {
        await startPipelineRun()
      },
    })
  }
}

// -- 查询构建日志
const logVisible = ref(false)
const buildLogList = ref([])
const currentLogIndex = ref(0)
const onQueryBuildLog = lockClick(async () => {
  const res = await BasementService.queryJobDetail({
    env: props.env,
    iid: props.iid,
  })

  if (!res?.data?.log?.content) {
    return message.warning('暂无日志')
  }

  logVisible.value = true

  // 处理日志
  let tempArr = res.data.log.content.split('\n')
  tempArr = tempArr.map((item: any) => {
    if (item.indexOf('SUCCESS') > 0) {
      return (item = `<span style="color: rgb(0, 255, 0);">${item}</span>`)
    } else if (item.indexOf('ERROR') > 0) {
      return (item = `<span style="color: red;">${item}</span>`)
    } else {
      return item
    }
  })
  const list = tempArr.join('<br />').split('[executionStep begins at ').slice(1)
  buildLogList.value = list.map((item: any) => (item = `[executionStep begins at ${item}`))
})

function changeStep(index: number) {
  currentLogIndex.value = index
}
</script>
