<template>
  <a-page-header
    class="bs-audit-page"
    :title="'【' + iterData?.projectName + '】' + iterData?.title"
    :sub-title="iterData?.desc"
    @back="onBack"
  >
    <template #extra>
      <a-button type="primary" v-if="textBtnText" @click="onTestUAT">{{ textBtnText }}</a-button>

      <a-button v-if="waitingAgree" type="primary" @click="onAgree">同意发布</a-button>

      <a-tooltip v-else>
        <template v-if="!hasEnd && releaseDisabled" #title>
          {{ releaseDisabled ? '只有提测之后，才能申请发布' : '' }}
        </template>
        <a-button
          :disabled="pubDisabled || iterData?.prodDeploy?.status == 'RUNNING' || releaseDisabled"
          :danger="auditing"
          type="primary"
          @click="onPreparePub"
        >
          {{ auditing ? '撤销发布' : '发布' }}
        </a-button>
      </a-tooltip>
    </template>

    <div class="bs-audit-content">
      <a-descriptions size="small" :column="2">
        <a-descriptions-item v-for="item in description" :key="item.id" :label="item.label">
          <!-- 状态 -->
          <a-tooltip v-if="item.id === 'status'">
            <template v-if="auditing" #title>
              {{ needProdAudit ? iterData?.audit?.userName : '无需审批' }}
            </template>

            <a-tag :color="ITER_STATUS_TAG_COLOR[item.status!]">
              {{ item.text }}
            </a-tag>
          </a-tooltip>

          <div v-else-if="item.urlList">
            <template v-for="link in item.urlList" :key="link.url">
              <a v-if="link.url && /https?:\/\//.test(link.url)" class="g-text-link" :href="link.url" target="_blank">
                {{ link.text }}
              </a>
              ,
            </template>
          </div>

          <span v-else>{{ item.text }}</span>
        </a-descriptions-item>
      </a-descriptions>
    </div>

    <template #footer>
      <a-tabs v-model:activeKey="activeTab" v-if="iterData">
        <a-tab-pane :key="ENV_TYPE.DEV" :tab="ENV_TEXT[ENV_TYPE.DEV]" :disabled="devTabDisabled || hasEnd">
          <IterRelease
            :env="ENV_TYPE.DEV"
            :iid="iid"
            :appId="appId"
            :projectId="projectId"
            :hasEnd="hasEnd"
            :deployData="iterData?.devDeploy"
            :branchMode="branchMode"
            :branch="iterData?.branch"
            :branchUrl="iterData?.branchUrl"
            :checkingRelease="iterData.devBranch"
            :withReleaseLog="!!iterData?.devReleaseLog"
            @start="startLoop"
            @failed="init"
            @published="init"
          />
        </a-tab-pane>

        <a-tab-pane :key="ENV_TYPE.TEST" :tab="ENV_TEXT[ENV_TYPE.TEST]" :disabled="betaTabDisabled || hasEnd">
          <IterRelease
            :env="ENV_TYPE.TEST"
            :iid="iid"
            :appId="appId"
            :projectId="projectId"
            :hasEnd="hasEnd"
            :deployData="iterData?.betaDeploy"
            :branchMode="branchMode"
            :branch="iterData?.branch"
            :branchUrl="iterData?.branchUrl"
            :checkingRelease="iterData.betaBranch"
            :withReleaseLog="!!iterData?.betaReleaseLog"
            @start="startLoop"
            @failed="init"
            @published="init"
          />
        </a-tab-pane>

        <a-tab-pane
          :key="ENV_TYPE.PROD"
          :tab="ENV_TEXT[ENV_TYPE.PROD]"
          :disabled="prodTabDisabled || hasEnd || !auditing"
        >
          <IterRelease
            :env="ENV_TYPE.PROD"
            :iid="iid"
            :appId="appId"
            :projectId="projectId"
            :hasEnd="hasEnd"
            :emptyPipeline="prodTabDisabled"
            :deployData="iterData?.prodDeploy"
            :agreed="!needProdAudit || !!iterData?.audit?.agreed"
            @start="startLoop"
            @failed="init"
            @published="init"
          />
        </a-tab-pane>
      </a-tabs>
    </template>

    <a-modal title="申请发布" v-model:visible="pubModalVisible" @ok="onConfirmApplyPub" @cancel="onCancelApplyPub">
      <div v-if="needProdAudit">
        申请发布后，
        <p>1、自动创建 MR 到 main</p>
        <p>2、自动发起审批流程，通过后开发者负责执行发布</p>
      </div>
      <div v-else>无需审批，自动创建 MR 到 main</div>

      <a-form v-if="needProdAudit" ref="formRef" :model="formState" :rules="rules">
        <a-form-item label="审批负责人" name="uid">
          <a-radio-group v-model:value="formState.uid" name="auditGroup" :options="auditList" />
        </a-form-item>
        <a-form-item label="备注" name="desc">
          <a-textarea v-model:value="formState.desc" />
        </a-form-item>
      </a-form>

      <a-divider />
      <a-button type="danger" @click="onEmergency">申请紧急发布</a-button>
    </a-modal>
  </a-page-header>
</template>

<script lang="ts" setup>
import { onUnmounted, ref, reactive, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { lockClick } from '@fe-portal/shared'

import BasementService from '@/api/basement'
import { goAppOverviewPage } from '@/router/goto'
import { ENV_TYPE, ENV_TEXT, ITER_STATUS_TAG_COLOR, ITER_STATUS, ITER_STATUS_TEXT } from '@/enums/appEnum'

import IterRelease from '@/components/release.vue'
import { BIZ_TYPE } from '@/enums/appEnum'

const userInfo = computed(() => window.microApp?.getGlobalData().fetchUserInfo())

const route = useRoute()
const appId = route.params?.id as any
const iid = route.params?.iid as any

interface IIter {
  projectId: string
  projectName: string
  title: string

  pd?: string
  desc?: string
  prd?: string
  ui?: string
  analysis?: string

  branch: string
  branchUrl: string
  owner: [
    {
      userId: string
      name: string
    }
  ]
  requireBackend: boolean
  status: number
  remark?: string

  testDate: number
  pubDate: number
  uatDate?: number

  // 开发环境部署
  devReleaseLog: string
  devBranch?: {
    integrated: boolean
    commitId: string
    releaseBranch: string
    releaseBranchUrl: string
  }
  devDeploy?: {
    startTime: number
    endTime: number

    pipelineId: null | string | number
    pipelineRunId: null | string | number
    operator: string
    error: string
    stage: number
    status: string // WAITING, RUNNING, SUCCESS, FAIL
    // 生产环境构建产物
    artifacts?:
      | {
          name: string
          url: string
        }
      | undefined
  }
  // 测试环境部署
  betaReleaseLog: string
  betaBranch?: {
    integrated: boolean
    commitId: string
    releaseBranch: string
    releaseBranchUrl: string
  }
  betaDeploy?: {
    startTime: number
    endTime: number

    pipelineId: null | string | number
    pipelineRunId: null | string | number
    operator: string
    error: string
    stage: number
    status: string // WAITING, RUNNING, SUCCESS, FAIL
    // 生产环境构建产物
    artifacts?: {
      name: string
      url: string
    }
  }
  // 生产环境部署
  prodDeploy?: {
    startTime: number
    endTime: number

    pipelineId: null | string | number
    pipelineRunId: null | string | number
    operator: string
    error: string
    stage: number
    status: string // WAITING, RUNNING, SUCCESS, FAIL
    // 生产环境构建产物
    artifacts?: {
      name: string
      url: string
    }
  }
  prodMR?: {
    id: number
    title: string
    web_url: string
  }
  // 发布审批
  audit?: {
    userId: string
    userName: string
    desc: string
    agreed: number
  }
}

const iterData = ref<IIter>()
const activeTab = ref()
const projectId = ref(-1)
// 非小程序应用配置了流水线才开启
const pubDisabled = ref(false)

// 不是所有项目都有开发、测试流水线的
const devTabDisabled = ref(true)
const betaTabDisabled = ref(true)
// 生产环境是都有的，但是不一定有配置流水线ID，提前检测一下
const prodTabDisabled = ref(true)
// 是否是分支集成模式
const branchMode = ref(false)
// 是否需要发布审批，有些不需要如非业务项目(组件库等)
const needProdAudit = ref(false)

// 发布审批中
const auditing = computed(() => ITER_STATUS.PUBLISHING == iterData.value?.status)
// 是审批者自己
const isAuditUser = computed(() => userInfo.value.userId == iterData.value?.audit?.userId)
// 等待审批同意
const waitingAgree = computed(() => isAuditUser.value && auditing.value && !iterData.value?.audit?.agreed)
// 迭代已经结束
const hasEnd = computed(() => [ITER_STATUS.PUBLISHED, ITER_STATUS.INVALID].includes(Number(iterData.value?.status)))
// 按钮文案
const textBtnText = computed(() => {
  if (iterData.value?.status == ITER_STATUS.DEV) {
    return '提测'
  }
  if (iterData.value?.status == ITER_STATUS.TESTING) {
    return 'UAT'
  }

  return ''
})

// 发布按钮禁用
const releaseDisabled = computed(() =>
  [ITER_STATUS.INIT, ITER_STATUS.DEV, ITER_STATUS.PUBLISHED, ITER_STATUS.INVALID].includes(
    Number(iterData.value?.status)
  )
)

// === entry
// 发布申请中/迭代已经结束，进入生产环境tab即可
watchEffect(() => {
  if (hasEnd.value || auditing.value) {
    activeTab.value = ENV_TYPE.PROD
  }
})

async function refresh(opts?: { fromTimer?: boolean }) {
  const iterRes = await BasementService.fetchIterDetail({
    iid,
  })

  iterData.value = iterRes.data

  // 只要任意一个环境在运行，都不会停止轮询
  if (
    ['WAITING', 'RUNNING'].includes(iterRes?.data?.devDeploy?.status || '') ||
    ['WAITING', 'RUNNING'].includes(iterRes?.data?.betaDeploy?.status || '') ||
    ['WAITING', 'RUNNING'].includes(iterRes?.data?.prodDeploy?.status || '')
  ) {
    !opts?.fromTimer && startLoop()
  } else {
    stopLoop()
  }
}
async function init() {
  const projRes = await BasementService.fetchBasementDetail({ id: appId })

  devTabDisabled.value = !projRes?.data?.devPipelineId
  betaTabDisabled.value = !projRes?.data?.betaPipelineId
  prodTabDisabled.value = !projRes?.data?.prodPipelineId

  projectId.value = projRes?.data?.projectId

  // 非小程序应用配置了流水线才能点击发布
  pubDisabled.value = !projRes?.data?.prodPipelineId && projRes?.data?.type != BIZ_TYPE.MINI_PROGRAM

  activeTab.value = devTabDisabled.value
    ? betaTabDisabled.value
      ? prodTabDisabled.value
        ? ''
        : ENV_TYPE.PROD
      : ENV_TYPE.TEST
    : ENV_TYPE.DEV

  branchMode.value = projRes?.data?.branchMode
  needProdAudit.value = projRes?.data?.needProdAudit

  await refresh()
}
init()

// --- 定时器
let timer: number
function startLoop() {
  stopLoop()

  refresh({ fromTimer: true })

  timer = setInterval(() => {
    refresh({ fromTimer: true })
  }, 10 * 1000)
}
function stopLoop() {
  timer && clearInterval(timer)
  timer = 0
}
onUnmounted(() => {
  stopLoop()
})

// === 提测、UAT、发布
async function agreeIterPub(opts?: { force?: number }) {
  const res = await BasementService.agreeIterPub({ iid, ...opts })
  if (res?.data) {
    message.success('审批成功')
    init()
    return res?.data
  }
}
// 审批者同意发布
function onAgree() {
  Modal.confirm({
    title: '确认同意发布',
    content: '',
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      await agreeIterPub()
    },
  })
}
// 提测、UAT 状态变更
function onTestUAT() {
  let title = '',
    content = '',
    msg = '',
    nextStatus = 0
  if (iterData.value?.status == ITER_STATUS.DEV) {
    title = '确认提测'
    content = '提测后可选择UAT或直接发布'
    msg = '提测成功'
    nextStatus = ITER_STATUS.TESTING
  } else if (iterData.value?.status == ITER_STATUS.TESTING) {
    title = '确认UAT'
    msg = '正在UAT验收'
    content = ''
    nextStatus = ITER_STATUS.UAT
  }

  if (!title) {
    message.error('error')
    return
  }

  Modal.confirm({
    title,
    content,
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      const res = await BasementService.updateIterStatus({ iid, status: nextStatus })
      if (res?.data) {
        message.success(msg)
        init()
      }
    },
  })
}

// --- 【申请发布】表单
const formRef = ref()
const formState = reactive({
  uid: '',
  desc: '',
})
const rules = reactive({
  uid: { required: true, message: 'user is required' },
})
// 获取发布负责人列表
const auditList = ref([])
const pubModalVisible = ref(false)
watchEffect(async () => {
  // 需要发布审批才获取
  if (pubModalVisible.value && needProdAudit.value) {
    const res = await window.microApp?.getGlobalData().fetchAuditableUserList()

    auditList.value = res.data?.map((d: any) => ({
      label: d.name,
      value: d.userId,
    }))
  }
})
// 确认 【申请发布】
const onConfirmApplyPub = lockClick(async () => {
  // 无需审批
  if (!needProdAudit.value) {
    const res = await BasementService.updateIterStatus({
      iid,
      status: ITER_STATUS.PUBLISHING,
    })

    if (res?.data) {
      pubModalVisible.value = false
      init()
    }
    return
  }

  return formRef.value?.validate().then(async () => {
    const o: any = auditList.value.find((o: any) => o.value == formState.uid)

    const res = await BasementService.updateIterStatus({
      iid,
      status: ITER_STATUS.PUBLISHING,
      ownerId: userInfo.value.userId,
      ownerName: userInfo.value.name,
      auditId: formState.uid,
      auditName: o?.label,
      desc: formState.desc,
      url: location.href,
    })

    if (res?.data) {
      message.success('发布审批中')
      pubModalVisible.value = false
      init()
    }
  })
})

// 隐藏 【申请发布】 弹窗
async function onCancelApplyPub() {
  formRef.value?.resetFields()
  auditList.value = []
  pubModalVisible.value = false
}

// 【申请发布】/【撤销申请】弹窗
async function onPreparePub() {
  if (!iterData.value?.status) return

  // 1、测试中才能申请发布， 显示 【申请发布】 弹窗
  if ([ITER_STATUS.TESTING, ITER_STATUS.UAT].includes(iterData.value?.status)) {
    const res = await BasementService.checkIterPublishing({ appId })

    // 不存在发布中的话，可以发起申请
    if (res.data) {
      message.error('存在发布中的需求，请等待')
    } else {
      pubModalVisible.value = true
    }
  }

  // 2、申请中可以撤销【撤销申请发布】
  else if (iterData.value?.status == ITER_STATUS.PUBLISHING) {
    Modal.confirm({
      title: '确认撤销发布',
      content: '撤销后将回到 【提测】状态，可以继续申请发布',
      okText: '确认',
      cancelText: '取消',
      async onOk() {
        const res = await BasementService.updateIterStatus({ iid, status: ITER_STATUS.TESTING, revert: true })
        if (res?.data) {
          message.success('撤销发布成功')
          init()
        }
      },
    })
  }
}

// 紧急发布
function onEmergency() {
  Modal.confirm({
    title: '确认紧急发布',
    content: '紧急发布将会自动审批',
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      const ok = await agreeIterPub({ force: 1 })
      if (ok) {
        pubModalVisible.value = false
      }
      return ok
    },
  })
}

// === 返回上个页面
function onBack() {
  goAppOverviewPage(appId)
}

// === 元信息
const description = computed(() => {
  return [
    {
      id: 'pd',
      label: '产品负责人',
      text: iterData.value?.pd,
    },
    {
      id: 'branch',
      label: '分支',
      urlList: [
        {
          text: iterData.value?.branch,
          url: iterData.value?.branchUrl,
        },
      ],
    },
    {
      id: 'dependency',
      label: '是否依赖后端',
      text: iterData.value?.requireBackend ? '是' : '否',
    },
    {
      id: 'doc',
      label: '文档',
      urlList: [
        {
          text: 'PRD',
          url: iterData.value?.prd,
        },
        {
          text: 'UI',
          url: iterData.value?.ui,
        },
        {
          text: '系分',
          url: iterData.value?.analysis,
        },
      ],
    },
    {
      id: 'test-time',
      label: '提测时间',
      text: dayjs(iterData.value?.testDate).format('YYYY-MM-DD'),
    },
    {
      id: 'owner',
      label: '负责人',
      text: iterData.value?.owner?.map((o) => o.name).join(','),
    },
    {
      id: 'prod-time',
      label: '上线时间',
      text: dayjs(iterData.value?.pubDate).format('YYYY-MM-DD'),
    },
    {
      id: 'status',
      label: '进度',
      status: iterData.value?.status,
      text:
        iterData.value?.status == ITER_STATUS.PUBLISHING && iterData.value?.audit?.agreed
          ? '审批通过'
          : ITER_STATUS_TEXT[iterData.value?.status || ''],
    },
    {
      id: 'remark',
      label: '备注',
      text: iterData.value?.remark,
    },
    {
      id: 'mr',
      label: 'Prod MR',
      urlList: [
        {
          text: `#${iterData.value?.prodMR?.id}`,
          url: iterData.value?.prodMR?.web_url,
        },
      ],
    },
  ]
})
</script>

<style lang="less">
.bs-audit-page {
  width: 80%;
  margin: 0 auto;
  font: 12px/14px PingFang SC;

  .ant-page-header-content {
    margin-top: 20px;
  }
  .ant-page-header-footer {
    margin-top: 32px;
  }

  .bs-audit-env-head {
    position: absolute; // 提高层级
    right: 24px;
    margin-top: -96px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    .bs-audit-env-deploy-time {
      font-size: 12px;
      margin-right: 8px;
    }
  }
}

.bs-audit-code-hint {
  margin-bottom: 20px;
}
.bs-audit-code {
  display: block;
  background: #333;
  color: #fff;
  padding: 8px;
}

.bs-audit-pipeline {
  margin-top: 60px;
  &-card-list {
    display: flex;
    justify-content: space-between;
    column-gap: 40px;
  }
  &-card {
    flex: 1;
    padding: 10px 0;
    background: #fff;
    min-height: 120px;
  }
  &-card-meta {
    display: flex;
    align-items: center;
    padding: 0 10px;
  }
  &-card-title {
    color: rgb(41, 41, 41);
    font-weight: 500;
  }
  &-card-meta-action {
    margin-left: auto;
    font-size: 12px;
  }
  &-card-status {
    margin-right: 8px;
  }
  &-card-info {
    padding: 10px 20px 20px 30px;
    color: rgb(139, 139, 139);
    font-size: 12px;
    display: flex;
    justify-content: space-between;
  }
  &-card-output {
    position: relative;
    padding: 10px 20px;
    font-size: 12px;
    line-height: 18px;
    color: rgb(41, 41, 41);
    border-top: 1px solid rgb(233, 237, 240);
  }
  &-card-error {
    color: red;
  }
  &-log-container {
    display: flex;
    height: 100%;
    overflow: scroll;
  }
  &-log-steps-title {
    margin-bottom: 6px;
    padding-left: 24px;
    color: rgba(0, 0, 0, 0.6);
    background: #eff1f5;
    line-height: 30px;
  }
  &-log-steps {
    cursor: pointer;
    flex: 1;
    width: 240px;
    color: rgba(0, 0, 0, 0.6);
    line-height: 30px;
    .step-item {
      padding-left: 24px;
      .text {
        margin-left: 8px;
      }
    }
    .step-item-active {
      background: #eff1f5;
    }
  }
  &-log {
    flex: 6;
    height: 100%;
    overflow-y: auto;
    background: #000;
    color: #fff;
  }
}
</style>
