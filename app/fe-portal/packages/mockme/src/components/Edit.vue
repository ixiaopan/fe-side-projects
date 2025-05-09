<template>
  <div style="height: 100%; display: flex;flex-direction: column;">
    <a-form :model="formState" :rules="rules" ref="formRef">
      <div style="display: flex; column-gap: 4px">
        <a-select ref="select" style="width: 80px" v-model:value="formState.method">
          <a-select-option v-for="item in Object.values(Method_TYPE)" :value="item">{{ item }}</a-select-option>
        </a-select>

        <a-input v-model:value="formState.url" />

        <a-button type="primary" @click="onSyncRemote">Send</a-button>
      </div>

      <a-form-item label="timeout" name="timeout">
        <a-input-number v-model:value="formState.timeout" min="0" max="100" />s
      </a-form-item>

      <a-form-item label="headers" name="headers">
        <a-input v-model:value="formState.headers" />
      </a-form-item>
      <a-form-item label=" GET query/POST body" name="body">
        <a-input v-model:value="formState.body" />
      </a-form-item>
    </a-form>

    <div id="mockme-json-editor" style="flex: 1"></div>

    <div>
      <a-button type="primary" @click="onSave">保存</a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onUnmounted, onMounted, reactive, ref, watchEffect } from 'vue'
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.css'
import { message } from 'ant-design-vue'

import { Method_TYPE } from '@/enums'
import MockmeService from '@/api'

const props = defineProps<{
  id: string
}>()

let editor: any

const formRef = ref()
interface FormState {
  method: string
  url: string
  desc: string
  timeout: number
  headers?: string
  body?: string
}
const formState: FormState = reactive({
  method: '',
  url: '',
  desc: '',
  timeout: 0,
  headers: '',
  body: '',
})
const rules = {
  method: [{ required: true, trigger: 'blur' }],
  url: [{ required: true, trigger: 'blur' }],
}

watchEffect(async () => {
  if (props.id) {
    const res = await MockmeService.queryAPIById(props.id)

    formState.method = res.data?.method
    formState.url = res.data?.url
    formState.desc = res.data?.desc
    formState.timeout = res.data?.timeout
    formState.headers = res.data?.headers
    formState.body = res.data?.body

    try {
      editor?.update(JSON.parse(res.data?.json || {}))
    } catch (e) {
      console.error(e)
    }
  }
})

onMounted(() => {
  const element = document.getElementById('mockme-json-editor')

  const options = {
    mode: 'code',
    statusBar: false,
    mainMenuBar: false,
  }
  editor = new JSONEditor(element, options)
})

onUnmounted(() => {
  editor?.destroy()
})

//
function onSyncRemote() {

}
function onSave() {
  // TODO JSON validatation

  formRef.value.validate().then(async () => {
    console.log('formState', formState)
    console.log('json', editor?.get())

    const res = await MockmeService.updateAPI({
      id: props.id,

      ...formState,

      json: JSON.stringify(editor?.get())
    })

    if (res.data) {
      message.success('保存成功!')
    }
  })
}
</script>

<style lang="less" scoped>
</style>
