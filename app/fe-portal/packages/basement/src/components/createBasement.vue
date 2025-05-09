<template>
  <a-drawer :title="modalTitle" placement="right" width="700" v-model:visible="visible" @close="resetForm">
    <a-form ref="formRef" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }" :model="formState" :rules="rules">
      <a-form-item label="Gitlab Project Name" name="name">
        <a-input :disabled="editMode" v-model:value="formState.name" placeholder="vue" />
      </a-form-item>
      <a-form-item v-if="!editMode" label="自动创建GitRepo" name="autoGit">
        <a-radio-group v-model:value="formState.autoGit" :disabled="editMode" name="autoGit">
          <a-radio :value="1">是</a-radio>
          <a-radio :value="0">否</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item v-if="editMode || !formState.autoGit" label="Gitlab Project Id" name="projectId">
        <a-input v-model:value="formState.projectId" placeholder="12" :disabled="editMode" />
      </a-form-item>
      <a-form-item v-if="editMode || !formState.autoGit" label="Gitlab Project URL" name="url">
        <a-input v-model:value="formState.url" placeholder="https://gitlab.com/xxx.git" />
      </a-form-item>

      <a-divider />
      <a-form-item label="应用别名" name="nameAlias">
        <a-input v-model:value="formState.nameAlias" placeholder="优先使用别名作为UI显示，兜底Gitlab Project Name" />
      </a-form-item>
      <a-form-item label="应用描述" name="desc">
        <a-input v-model:value="formState.desc" />
      </a-form-item>

      <a-form-item label="应用类型" name="type">
        <a-select placeholder="选择类型" :options="BIZ_TYPE_LIST" v-model:value="formState.type" />
      </a-form-item>

      <a-form-item label="应用模版" name="template">
        <a-select
          show-search
          placeholder="Select a template"
          option-filter-prop="children"
          :options="TEMPLATE_LIST"
          v-model:value="formState.template"
          :disabled="true || editMode"
        />
      </a-form-item>
      <a-form-item label="monorepo" name="monorepo">
        <a-checkbox v-model:checked="formState.monorepo" />
      </a-form-item>

      <template v-if="pipelineEnabled">
        <a-divider />

        <a-form-item label="Dev Pipeline" name="devPipelineId">
          <a-input v-model:value="formState.devPipelineId" />
        </a-form-item>
        <a-form-item label="Beta Pipeline" name="betaPipelineId">
          <a-input v-model:value="formState.betaPipelineId" />
        </a-form-item>
        <a-form-item label="Prod Pipeline" name="prodPipelineId">
          <a-input v-model:value="formState.prodPipelineId" />
        </a-form-item>

        <a-form-item label="分支模式" name="branchMode">
          <a-checkbox v-model:checked="formState.branchMode" />
        </a-form-item>
        <a-form-item label="发布审批" name="needProdAudit">
          <a-checkbox v-model:checked="formState.needProdAudit" />
        </a-form-item>
      </template>

      <a-button type="primary" :disabled="disabled" @click="onCreate">{{ editMode ? '更新' : '创建' }}</a-button>
    </a-form>
  </a-drawer>
</template>

<script lang="ts" setup>
import { ref, toRaw, computed, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { ROLE_TYPE } from '@fe-portal/shared'

import BasementService from '@/api/basement'
import { BIZ_TYPE, TEMPLATE_LIST, BIZ_TYPE_LIST } from '@/enums/appEnum'

defineExpose({
  openModal,
})
const emits = defineEmits(['created'])

// 权限配置流水线
const pipelineEnabled = [ROLE_TYPE.ADMIN, ROLE_TYPE.MANAGER].includes((window.microApp?.getGlobalData().fetchUserInfo() || {}).role)

// 弹窗相关
const loading = ref(false)
const editMode = ref(false) // 修改模式
let editProjectId = '' // 编辑的项目ID
const modalTitle = computed(() => (editMode.value ? '修改应用' : '新建应用'))

// 表单相关
interface FormState {
  name: string
  nameAlias?: string
  desc: string
  projectId: number | string
  url: string
  autoGit: number
  type: string
  template: string
  branchMode: boolean
  needProdAudit: boolean
  monorepo: boolean
  devPipelineId?: string | number
  betaPipelineId?: string | number
  prodPipelineId?: string | number
}
const formRef = ref()
const formState = reactive<FormState>({
  name: '',
  nameAlias: '',
  desc: '',
  template: '',
  url: '',
  type: BIZ_TYPE.WEB,
  projectId: '',
  branchMode: false,
  needProdAudit: false,
  autoGit: 1,
  monorepo: false,
})
const rules = reactive({
  name: { required: true, message: 'name is required' },
  projectId: { required: true, message: 'gitlab id is required' },
  url: { required: true, message: 'gitlab url is required' },
  // TODO: 模板在看一下
  // template: {required: true, message: 'template id is required'}
})

const disabled = ref(false)
function onCreate() {
  return formRef.value.validate().then(async () => {
    disabled.value = true

    try {
      const {
        name,
        nameAlias,
        desc,
        template,
        autoGit,
        projectId,
        url,
        type,
        devPipelineId,
        betaPipelineId,
        prodPipelineId,
        branchMode,
        needProdAudit,
        monorepo,
      } = formState

      console.log('formState', toRaw(formState))

      // @ts-ignore
      const res = await (editMode.value ? BasementService.updateBasement : BasementService.createBasement)({
        name,
        nameAlias,
        desc,
        template,
        type,
        devPipelineId,
        betaPipelineId,
        prodPipelineId,
        branchMode,
        needProdAudit,
        monorepo,
        ...(autoGit ? null : { url, projectId }),
        ...(editMode.value ? { id: editProjectId } : { autoGit }),
      })

      disabled.value = false

      if (!res.data) {
        message.error(res.msg)
      } else {
        closeModal()
        emits('created', editMode.value)
      }
    } catch (e: any) {
      message.error(e.message)
    }
  })
}

// 编辑模式
const visible = ref(false)
async function openModal(data?: { id: string }) {
  visible.value = true

  editMode.value = !!data?.id

  if (data?.id) {
    loading.value = true

    try {
      const res = await BasementService.fetchBasementDetail(data)

      formState.name = res?.data?.name
      formState.nameAlias = res?.data?.nameAlias
      formState.desc = res?.data?.desc
      formState.url = res.data?.url
      formState.projectId = res.data?.projectId
      formState.template = res.data?.template
      formState.autoGit = 0 // 编辑模式，就是false

      formState.devPipelineId = res.data?.devPipelineId
      formState.betaPipelineId = res.data?.betaPipelineId
      formState.prodPipelineId = res.data?.prodPipelineId

      formState.branchMode = res.data?.branchMode
      formState.needProdAudit = res.data?.needProdAudit
      formState.monorepo = res.data?.monorepo

      editProjectId = data?.id
    } catch (e) {}

    loading.value = false
  }
}
function resetForm() {
  formRef.value?.resetFields()
}
function closeModal() {
  visible.value = false
  resetForm()
}
</script>
