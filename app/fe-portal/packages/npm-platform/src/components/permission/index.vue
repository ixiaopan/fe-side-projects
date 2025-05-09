<template>
  <div class="npm-permission">
    <UserSelect @change="onUserChange" :defaultIdList="maintainer?.map((c) => c.userId)" />
    <a-button type="primary" @click="onSubmit">确定</a-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { UserSelect } from '@fe-portal/shared'

import type { IMaintainer } from '@/api/npmPlatform'
import NpmPlatformService from '@/api/npmPlatform'
import emitter, { EVENT_EMITTER } from '@/emitter'

const props = defineProps<{
  id: string
  maintainer: IMaintainer[]
}>()

const userList = ref<IMaintainer[]>()
function onUserChange(nameList: IMaintainer[]) {
  userList.value = nameList
}

const onSubmit = async () => {
  if (!userList.value?.length) {
    return message.warning('请选择包的管理者')
  }

  const res = await NpmPlatformService.setPackageMaintainer({
    id: props.id,
    maintainer: userList.value,
  })

  if (res?.data?.code === 200) {
    message.success('设置成功!')
    emitter.emit(EVENT_EMITTER.UPDATE_PACKAGE_SUCCESS)
  }
}
</script>

<style lang="less">
.npm-permission {
  .ant-select {
    width: 300px;
  }
}
</style>
