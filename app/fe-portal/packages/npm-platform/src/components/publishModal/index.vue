<template>
  <a-modal
    v-model:visible="visible"
    :title="packageData.name + ' 发布'"
    @ok="onSubmit"
    :confirm-loading="publishData.publishStatus === PUBLISH_STATUS.PENDING"
  >
    <a-form :model="formState" :label-col="{ span: 4 }" @submit="onSubmit" :rules="rules" ref="formRef">
      <a-form-item label="子包" v-if="packageData.isMonorepo">
        <a-radio-group v-model:value="subModule">
          <a-radio v-for="item in packageData.packageList" :key="item.name" :value="item.name">{{ item.name }}</a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item label="分支名：" name="branch">
        <a-select
          ref="select"
          v-model:value="formState.branch"
          :options="allBranches"
          show-search
          @change="onChangeBranch"
        />
      </a-form-item>

      <a-form-item label="环境：">
        <a-radio-group v-model:value="formState.tag">
          <a-radio :value="NPM_TAG.LATEST" :disabled="disabledLatest">正式发布（latest）</a-radio>
          <a-radio :value="NPM_TAG.BETA" :disabled="disabledBeta">测试发布（beta）</a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item label="类型：">
        <a-radio-group v-model:value="formState.bumpType">
          <a-radio :value="NPM_BUMP_TYPE.MAJOR">major</a-radio>
          <a-radio :value="NPM_BUMP_TYPE.MINOR">minor</a-radio>
          <a-radio :value="NPM_BUMP_TYPE.PATCH">patch</a-radio>
        </a-radio-group>
      </a-form-item>
    </a-form>

    <p class="tips" v-if="publishData.publishStatus === PUBLISH_STATUS.PENDING">发布中，请耐心等待...</p>
    <p class="tips success" v-if="publishData.publishStatus === PUBLISH_STATUS.SUCCESS">
      发布成功，version： {{ publishData.publishVersion }}
    </p>
    <p class="tips error" v-if="publishData.publishStatus === PUBLISH_STATUS.FAILED">发布失败</p>
  </a-modal>
</template>

<script setup lang="ts">
import type { UnwrapRef } from 'vue'
import { computed, reactive, ref, watch } from 'vue'
import { NPM_TAG, NPM_BUMP_TYPE, PUBLISH_STATUS } from '@/enums'

import NpmPlatformService from '@/api/npmPlatform'
import { usePublishModal } from '@/hooks/usePublishModal'
import emitter, { EVENT_EMITTER } from '@/emitter'

interface FormState {
  branch: string
  tag: NPM_TAG
  bumpType: NPM_BUMP_TYPE
}

const { visible, packageData } = usePublishModal()

const allBranches = ref<{ value: string; label: string }[]>([])
const disabledLatest = ref(false)
const disabledBeta = ref(false)

const userInfo = computed(() => window.microApp?.getGlobalData().fetchUserInfo())
const isMaintainer = computed(() => packageData.maintainer.find((c: any) => c.userId == userInfo.value.userId))

// --
const rules = {
  branch: [{ required: true, message: '请填写branch', trigger: 'blur' }],
}
const formRef = ref()
const formState: UnwrapRef<FormState> = reactive({
  branch: '',
  tag: NPM_TAG.BETA,
  bumpType: NPM_BUMP_TYPE.PATCH,
})

watch(visible, async () => {
  if (visible) {
    formState.branch = ''
    formState.tag = NPM_TAG.BETA
    formState.bumpType = NPM_BUMP_TYPE.PATCH

    disabledLatest.value = false
    disabledBeta.value = false

    const res = await NpmPlatformService.queryAllBranches({ projectId: packageData.projectId })
    allBranches.value = (res.data || [])
      .filter((item) => isMaintainer.value || item.name !== 'main')
      .map((item) => {
        return {
          value: item.name,
          label: item.name,
        }
      })
  }
})

const onChangeBranch = (branchName: string) => {
  if (branchName === 'main') {
    formState.tag = NPM_TAG.LATEST
    disabledLatest.value = false
    disabledBeta.value = true
  } else {
    formState.tag = NPM_TAG.BETA
    disabledLatest.value = true
    disabledBeta.value = false
  }
}

// -- 多包兼容
const subModule = ref(packageData.name || '')

// --
const publishData = reactive({
  publishStatus: '',
  publishVersion: '',
})
const onSubmit = () => {
  formRef.value.validate().then(async () => {
    const { branch, tag, bumpType } = formState

    publishData.publishStatus = PUBLISH_STATUS.PENDING

    try {
      const res = await NpmPlatformService.publishPackage({
        id: packageData._id,
        branch,
        tag,
        bumpType,
        ...(packageData.isMonorepo
          ? {
              isMonorepo: packageData.isMonorepo,
              subModule: subModule.value || '',
            }
          : null),
      })

      if (res.data.code === 200) {
        publishData.publishStatus = PUBLISH_STATUS.SUCCESS
        publishData.publishVersion = res.data.data.version

        emitter.emit(EVENT_EMITTER.UPDATE_PACKAGE_SUCCESS)
      } else {
        publishData.publishStatus = PUBLISH_STATUS.FAILED
      }
    } catch (err) {
      publishData.publishStatus = PUBLISH_STATUS.FAILED
    } finally {
    }
  })
}
</script>

<style lang="less" scoped>
.tips {
  display: flex;
  justify-content: center;
}
.success {
  color: #008000;
}
.error {
  color: #ffccc7;
}
</style>
