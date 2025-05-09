<template>
  <a-modal width="600px" v-model:visible="visible" :title="modalTitle" @ok="onConfirm">
    <a-alert message="Warning" type="warning" show-icon>
      <template #description>
        <ol>
          <li>1、没有一个分支在部署中，才能下线</li>

          <li>
            2、下线仅仅是修改数据库状态，对应环境依然有代码；所以，下线成功后，需要选择其他的分支，进行对应环境的部署，才能覆盖
          </li>
        </ol>
      </template>
    </a-alert>

    <div :style="{ 'margin-top': '20px' }">
      <span>下线环境：</span>
      <a-radio-group v-model:value="env">
        <a-radio v-if="record.devBranch?.integrated" :value="ENV_TYPE.DEV">{{ ENV_TEXT[ENV_TYPE.DEV] }}</a-radio>
        <a-radio v-if="record.betaBranch?.integrated" :value="ENV_TYPE.TEST">{{ ENV_TEXT[ENV_TYPE.TEST] }}</a-radio>
      </a-radio-group>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'

import BasementService from '@/api/basement'
import { ENV_TYPE, ENV_TEXT } from '@/enums/appEnum'

const props = defineProps({
  appId: {
    type: String,
    required: true,
  },
})

defineExpose({
  openModal,
})

type IIter = {
  _id: string
  branch: string
}

const record = ref<IIter>()
const visible = ref(false)
const env = ref()
const modalTitle = computed(() => record.value?.branch + '下线')

function openModal(iter: IIter) {
  visible.value = true
  record.value = iter
}
function closeModal() {
  visible.value = false
}

async function onConfirm() {
  if (!env.value) {
    message.warning('请选择环境')
    return
  }

  const res = await BasementService.offlineEnv({
    env: env.value,
    appId: props.appId,
    iid: record.value._id,
  })

  if (res.code == 200) {
    closeModal()
    message.success('下线成功，请选择其他迭代再次部署，实现代码覆盖')
  }
}
</script>
