<template>
  <a-form :model="formState" :label-col="{ span: 4 }" :rules="rules" ref="formRef">
    <a-form-item label="项目ID" name="projectId">
      <a-input :disabled="edtiable" v-model:value="formState.projectId" placeholder="vue" />
    </a-form-item>

    <a-form-item label="项目名称" name="projectName">
      <a-input v-model:value="formState.projectName" placeholder="vue" />
    </a-form-item>

    <a-form-item label="项目描述" name="projectDesc">
      <a-input v-model:value="formState.projectDesc" />
    </a-form-item>

    <div style="display: flex;column-gap:8px;">
      <a-button type="primary" @click="onSubmit">保存</a-button>
      <a-button v-if="edtiable" type="danger" @click="onDel">删除</a-button>
    </div>
  </a-form>
</template>

<script lang="ts" setup>
import { ref, reactive, watchEffect } from 'vue'
import { Modal, message } from 'ant-design-vue'

import MockmeService from '@/api'
import { goHome } from '@/router'

const emits = defineEmits(['created'])

const props = defineProps({
  id: String
})

const formRef = ref()
interface FormState {
  projectId: string
  projectName: string
  projectDesc?: string
}
const formState: FormState = reactive({
  projectId: '',
  projectName: '',
  projectDesc: '',
})
const rules = {
  projectId: [{ required: true, message: '请填写projectId', trigger: 'blur' }],
  projectName: [{ required: true, message: '请填写projectName', trigger: 'blur' }],
}

const edtiable = ref(false)
watchEffect(async () => {
  if (props.id) {
    edtiable.value = true

    const res = await MockmeService.queryProjectById(props.id)

    formState.projectId = res.data?.id
    formState.projectName = res.data?.name
    formState.projectDesc = res.data?.desc
  }
})

let flag = false
function onSubmit() {
  formRef.value.validate().then(async () => {
    if (flag) return

    flag = true

    const res = await (edtiable.value ? MockmeService.updateProjectById(formState) : MockmeService.createProject(formState))

    flag = false

    if (res.data) {
      message.success(edtiable.value ? '修改成功': '添加成功!')

      if (!edtiable.value) {
        formRef.value.resetFields()
        emits('created')
      }
    }
  })
}

function onDel() {
  Modal.confirm({
    title: `确认删除${formState.projectName}?`,
    content: '删除项目的同时，会删除项目下所有的API',
    async onOk() {
      try {
        const res = await MockmeService.removeProjectById(props.id)
        if (res.data) {
          message.success('删除成功!')
          goHome()
        }
        return res.data
      } catch(e) {
        message.success(e.message)
      }
    },
  });
}
</script>
