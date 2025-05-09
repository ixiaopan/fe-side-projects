<template>
  <div class="container">
    <Info
      :gitlab="packageData.gitlab"
      :maintainer="packageData.maintainer"
      :packageList="packageData.packageList"
      :isMonorepo="packageData.isMonorepo"
      :name="packageData.name"
    />
    <a-tabs v-model:activeKey="activeKey">
      <a-tab-pane key="1" tab="Changelog">
        <Changelog v-if="packageData.projectId" :projectId="packageData.projectId" />
      </a-tab-pane>

      <a-tab-pane key="2" tab="权限管理" v-if="isMaintainer">
        <Permission :id="id" :maintainer="packageData.maintainer" />
      </a-tab-pane>

      <a-tab-pane key="3" tab="发布记录">
        <PublishRecord :id="id" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'

import Info from '@/components/info/index.vue'
import Changelog from '@/components/changelog/index.vue'
import Permission from '@/components/permission/index.vue'
import PublishRecord from '@/components/publishRecord/index.vue'

import NpmPlatformService, { IPackage } from '@/api/npmPlatform'
import emitter, { EVENT_EMITTER } from '@/emitter'

const activeKey = ref('1')

const route = useRoute()
const id = route.params.id as string

const packageData = reactive<IPackage>({
  gitlab: '',
  name: '',
  isMonorepo: false,
  maintainer: [],
  projectId: null,
  publishDirname: '',
  packageList: [],
})

const userInfo = computed(() => window.microApp?.getGlobalData().fetchUserInfo())
const isMaintainer = computed(() => packageData.maintainer?.find((u) => u.userId == userInfo.value.userId))

async function getPackageDetail() {
  const res = await NpmPlatformService.queryPackageDetail({ id })
  Object.assign(packageData, res.data)
}

onMounted(() => {
  getPackageDetail()
})

emitter.on(EVENT_EMITTER.UPDATE_PACKAGE_SUCCESS, () => {
  getPackageDetail()
})
</script>

<style scoped lang="less">
.container {
  padding: 20px;
}
</style>
