<template>
  <a-drawer :title="modalTitle" placement="right" width="880" :visible="visible" @close="closeModal">
    <a-form class="iteration-form" ref="formRef" :model="formState" :rules="rules">
      <a-form-item label="需求名称" name="title">
        <a-input v-model:value="formState.title" />
      </a-form-item>
      <a-form-item label="需求描述" name="desc">
        <a-textarea v-model:value="formState.desc" />
      </a-form-item>
      <a-form-item label="产品负责人" name="pd">
        <a-input v-model:value="formState.pd" />
      </a-form-item>
      <a-form-item label="PRD" name="prd">
        <a-input v-model:value="formState.prd" />
      </a-form-item>
      <a-form-item label="UI" name="ui">
        <a-input v-model:value="formState.ui" />
      </a-form-item>
      <a-form-item label="系分文档" name="analysis">
        <a-input v-model:value="formState.analysis" />
      </a-form-item>

      <a-form-item v-if="!editMode" label="自动创建分支" name="autoBranch">
        <a-radio-group v-model:value="formState.autoBranch" :disabled="editMode" name="autoBranch">
          <a-radio :value="1">是</a-radio>
          <a-radio :value="0">否</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="分支名称" name="branch">
        <a-input v-model:value="formState.branch" placeholder="story/xxx, hotfix/xxx" :disabled="editMode" />
      </a-form-item>
      <a-form-item v-if="!editMode && !formState.autoBranch" label="分支URL" name="branchUrl">
        <a-input v-model:value="formState.branchUrl" placeholder="" :disabled="editMode" />
      </a-form-item>

      <a-form-item label="需求负责人" name="owner">
        <UserSelect :defaultIdList="defaultIdList" @change="onUserChange" />
      </a-form-item>

      <a-form-item label="提测时间" name="testDate">
        <a-date-picker v-model:value="formState.testDate" format="YYYY-MM-DD" />

        <a-popover title="修改记录" v-if="testHistory?.length">
          <template #content>
            <p v-for="(time, index) in testHistory" :key="index">
              {{ index + 1 }}. {{ dayjs(time).format('YYYY-MM-DD') }}
            </p>
          </template>
          <span :style="{ 'margin-left': '8px', 'font-size': '12px' }" class="g-text-link">修改记录</span>
        </a-popover>
      </a-form-item>
      <a-form-item label="UAT时间" name="uatDate">
        <a-date-picker v-model:value="formState.uatDate" />

        <a-popover title="修改记录" v-if="uatHistory?.length">
          <template #content>
            <p v-for="(time, index) in uatHistory" :key="index">
              {{ index + 1 }}. {{ dayjs(time).format('YYYY-MM-DD') }}
            </p>
          </template>
          <span :style="{ 'margin-left': '8px', 'font-size': '12px' }" class="g-text-link">修改记录</span>
        </a-popover>
      </a-form-item>
      <a-form-item label="上线时间" name="pubDate">
        <a-date-picker v-model:value="formState.pubDate" />

        <a-popover title="修改记录" v-if="pubHistory?.length">
          <template #content>
            <p v-for="(time, index) in pubHistory" :key="index">
              {{ index + 1 }}. {{ dayjs(time).format('YYYY-MM-DD') }}
            </p>
          </template>
          <span :style="{ 'margin-left': '8px', 'font-size': '12px' }" class="g-text-link">修改记录</span>
        </a-popover>
      </a-form-item>

      <a-form-item label="是否依赖后端" name="requireBackend">
        <a-radio-group v-model:value="formState.requireBackend" :disabled="editMode" name="requireBackend">
          <a-radio :value="1">是</a-radio>
          <a-radio :value="0">否</a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item label="备注" name="remark">
        <a-textarea v-model:value="formState.remark" />
      </a-form-item>
    </a-form>

    <div class="iteration-create-footer">
      <a-button type="primary" :disabled="disabled" @click="onSubmit">{{ editMode ? '更新' : '创建' }}</a-button>
    </div>
  </a-drawer>
</template>

<script lang="ts" setup>
import type { Dayjs } from 'dayjs'
import { ref, reactive, nextTick, computed } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { UserSelect } from '@fe-portal/shared'

import BasementService from '@/api/basement'

const emits = defineEmits(['created'])

const props = defineProps({
  projectId: {
    type: Number,
    required: true,
  },
  appId: {
    type: String,
    required: true,
  },
  projectName: String,
})

// ----
let lastTest: string | number | Dayjs,
  lastUAT: string | number | Dayjs,
  lastPub: string | number | Dayjs, // 记一下上次的时间
  testHistory: number[],
  uatHistory: number[],
  pubHistory: number[]

interface FormState {
  title: string
  desc?: string
  pd?: string
  branch: string
  branchUrl: string
  owner: [
    {
      userId: string
      name: string
    }
  ]
  prd: string
  ui: string
  analysis?: string
  testDate: Dayjs | string | number
  pubDate: Dayjs | string | number
  uatDate: Dayjs | string | number
  requireBackend: number
  remark?: string
  autoBranch: number // 后端不存储这个字段，仅仅是前端标识
}
interface IRecord extends FormState {
  _id: string
  testDateHistory: number[]
  uatDateHistory: number[]
  pubDateHistory: number[]
}

const formRef = ref()
const formState = reactive<FormState>({
  title: '',
  pd: '',
  desc: '',
  prd: '',
  ui: '',
  branch: '',
  branchUrl: '',
  autoBranch: 1,
  requireBackend: 1,
  // @ts-ignore
  owner: [],
  testDate: '',
  uatDate: '',
  pubDate: '',
})
const rules = reactive({
  title: { required: true, message: 'title is required' },
  branch: { required: true, message: 'branch is required' },
  branchUrl: { required: true, message: 'branchUrl is required' },
  owner: { required: true, type: 'array', message: 'owner is required' },
  testDate: { required: true, message: 'testDate is required' },
  pubDate: { required: true, message: 'pubDate is required' },
  autoBranch: { required: true, message: 'autoBranch is required' },
  requireBackend: { required: true, message: 'requireBackend is required' },
})

const disabled = ref(false)
async function onSubmit() {
  return formRef.value?.validate().then(async () => {
    // @ts-ignore
    const res = await (editMode.value ? BasementService.updateIter : BasementService.createIter)({
      appId: props.appId!,
      projectId: props.projectId!,
      projectName: props.projectName!,

      ...formState,

      testDate: dayjs(formState.testDate, 'YYYY-MM-DD').valueOf(),
      uatDate: dayjs(formState.uatDate, 'YYYY-MM-DD').valueOf(),
      pubDate: dayjs(formState.pubDate, 'YYYY-MM-DD').valueOf(),

      ...(editMode.value
        ? {
            iid: iterId,
            ...(formState.testDate != lastTest ? { lastTest } : null),
            ...(formState.uatDate != lastUAT ? { lastUAT } : null),
            ...(formState.pubDate != lastPub ? { lastPub } : null),
          }
        : {
            branch: formState.branch?.trim(),
            branchUrl: formState.branchUrl?.trim(),
          }),
    })

    disabled.value = false

    if (res.data) {
      message.success(editMode.value ? '更新成功' : '创建成功')

      emits('created')

      closeModal()
    } else {
      message.error(res.msg)
    }
  })
}

// ---
function onUserChange(nameList: any) {
  formState.owner = nameList
}

// 打开/修改
const editMode = ref(false) // 修改模式
const visible = ref(false)
const modalTitle = computed(() => (editMode.value ? '编辑需求' : '新建需求'))
const defaultIdList = ref<string[]>([])
let iterId = '-1'
async function openModal(record?: IRecord) {
  visible.value = true
  editMode.value = !!record

  nextTick(() => {
    if (record) {
      iterId = record._id
      defaultIdList.value = record.owner.map((o) => o.userId) as string[]

      formState.title = record.title
      formState.desc = record.desc
      formState.pd = record.pd
      formState.prd = record.prd
      formState.ui = record.ui
      formState.analysis = record.analysis
      formState.owner = record.owner

      formState.branch = record.branch
      formState.branchUrl = record.branchUrl
      formState.requireBackend = record.requireBackend

      formState.testDate = record.testDate ? dayjs(record.testDate) : ''
      formState.uatDate = record.uatDate ? dayjs(record.uatDate) : ''
      formState.pubDate = record.pubDate ? dayjs(record.pubDate) : ''

      formState.remark = record.remark

      lastTest = record.testDate
      lastUAT = record.uatDate
      lastPub = record.pubDate

      testHistory = record.testDateHistory.filter(Boolean)
      uatHistory = record.uatDateHistory.filter(Boolean)
      pubHistory = record.pubDateHistory.filter(Boolean)
    }
  })
}
function closeModal() {
  formRef.value?.resetFields()

  iterId = '-1'
  defaultIdList.value = []

  lastTest = ''
  lastUAT = ''
  lastPub = ''

  testHistory = []
  uatHistory = []
  pubHistory = []

  visible.value = false
}
defineExpose({
  openModal,
})
</script>

<style lang="less">
.iteration-form {
  .ant-form-item-label {
    width: 120px;
  }
}
</style>
