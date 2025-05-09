<template>
  <a-modal
    v-model:visible="visible"
    title="添加包"
    :confirm-loading="confirmLoading"
    :maskClosable="false"
    @ok="onSubmit"
  >
    <a-form :model="formState" :label-col="{ span: 4 }" :rules="rules" ref="formRef">
      <a-form-item label="包名" name="name">
        <a-input v-model:value="formState.name" placeholder="@scope/name" />
      </a-form-item>

      <a-form-item label="gitlab" name="gitlab">
        <a-input v-model:value="formState.gitlab" placeholder="https://gitlab.com/xxx.git" />
      </a-form-item>

      <a-form-item label="ProjectId" name="projectId">
        <a-input v-model:value="formState.projectId" placeholder="39" />
      </a-form-item>

      <a-form-item label="管理者：" name="maintainer">
        <UserSelect @change="onUserChange" />
      </a-form-item>

      <a-form-item label="monorepo" name="isMonorepo">
        <a-radio-group v-model:value="formState.isMonorepo" @change="handleChange">
          <a-radio :value="true">是</a-radio>
          <a-radio :value="false">否</a-radio>
        </a-radio-group>
      </a-form-item>

      <template v-if="!formState.isMonorepo">
        <a-form-item label="发布路径" name="publishDirname">
          <a-input v-model:value="formState.publishDirname" placeholder="你的应用如果没有特殊需求，就不用填写" />
        </a-form-item>

        <a-form-item label="推送到oss" name="ossFilename">
          <a-input v-model:value="formState.ossFilename" placeholder="你的包如果不需要推送到oss，就不用填写" />
        </a-form-item>
      </template>

      <template v-if="formState.isMonorepo">
        <div v-if="!formState.monorepoList" class="loading-box"><a-spin /></div>
        <template v-else v-for="mono in formState.monorepoList" :key="mono.name">
          <a-form-item label="包名">
            <a-input v-model:value="mono.name" disabled />
          </a-form-item>
          <a-form-item label="发布路径" name="publishDirname">
            <a-input v-model:value="mono.publishDirname" placeholder="你的应用如果没有特殊需求，就不用填写" />
          </a-form-item>

          <a-form-item label="推送到oss" name="ossFilename">
            <a-input v-model:value="mono.ossFilename" placeholder="你的包如果不需要推送到oss，就不用填写" />
          </a-form-item>
        </template>
      </template>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import type { UnwrapRef } from 'vue'
import { reactive, watch, ref } from 'vue'
import { message } from 'ant-design-vue'

import { UserSelect } from '@fe-portal/shared'

import type { IMaintainer, IMonorepo } from '@/api/npmPlatform'
import NpmPlatformService from '@/api/npmPlatform'
import emitter, { EVENT_EMITTER } from '@/emitter'
import { useAddPackageModal } from '@/hooks/useAddPackageModal'

interface FormState {
  name: string
  gitlab: string
  projectId: number | null
  maintainer: IMaintainer[]
  publishDirname: string
  isMonorepo: boolean
  ossFilename: string
  monorepoList?: IMonorepo[]
}

const { visible, closeAddPackageModal } = useAddPackageModal()

const formRef = ref()
const rules = {
  name: [{ required: true, message: '请填写包名', trigger: 'blur' }],
  projectId: [{ required: true, message: '请填写projectId', trigger: 'blur' }],
  gitlab: [{ required: true, message: '请填写gitlab地址', trigger: 'blur' }],
  maintainer: [{ required: true, message: '请选择包的管理者', trigger: 'blur' }],
}
const formState: UnwrapRef<FormState> = reactive({
  name: '',
  gitlab: '',
  projectId: null,
  maintainer: [],
  publishDirname: '',
  isMonorepo: false,
  ossFilename: '',
})

function onUserChange(nameList: IMaintainer[]) {
  formState.maintainer = nameList
}

watch(visible, (visible) => {
  if (visible) {
    formState.name = ''
    formState.gitlab = ''
    formState.projectId = null
    formState.maintainer = []
    formState.isMonorepo = false
    formState.publishDirname = ''
    formState.ossFilename = ''

    formRef.value?.resetField()
  }
})

const confirmLoading = ref(false)
const onSubmit = async () => {
  formRef.value.validate().then(async () => {
    confirmLoading.value = true

    const { name, gitlab, projectId, maintainer, publishDirname, isMonorepo, ossFilename, monorepoList } = formState

    const res = await NpmPlatformService.addPackage({
      name,
      gitlab,
      projectId,
      maintainer,
      publishDirname,
      isMonorepo,
      ossFilename,
      monorepoList,
    })

    confirmLoading.value = false

    if (res.data?.code === 200) {
      message.success('添加成功!')

      closeAddPackageModal()

      emitter.emit(EVENT_EMITTER.UPDATE_PACKAGE_SUCCESS)
    }
  })
}

async function handleChange(e: any) {
  if (e.target.value) {
    const res = await NpmPlatformService.queryMonorepo({ gitlab: formState.gitlab })
    if (res.data.length > 0) {
      formState.monorepoList = res.data
    }
  }
}
</script>

<style lang="less" scoped>
.tips {
  display: flex;
  justify-content: center;
  color: #008000;
}
.loading-box {
  display: flex;
  justify-content: center;
}
</style>
