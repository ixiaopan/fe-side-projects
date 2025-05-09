<template>
  <a-table :columns="columns" :data-source="list">
    <template #status="{ record }">
      <a-tag v-if="record.status === 'success'" color="#87d068">成功</a-tag>
      <a-tag v-if="record.status === 'failed'" color="#f50">失败</a-tag>
    </template>
    <template #ossUrl="{ record }">
      <p v-for="url in record?.oss_url?.split(',')" :key="url">{{ url }}</p>
    </template>
  </a-table>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import dayjs from 'dayjs'

import NpmPlatformService, { IPackage } from '@/api/npmPlatform'
import emitter, { EVENT_EMITTER } from '@/emitter'

interface IProps {
  id: string
}

const props = defineProps<IProps>()

const list = ref<IPackage[]>([])

onMounted(async () => {
  getList()
})

emitter.on(EVENT_EMITTER.UPDATE_PACKAGE_SUCCESS, async () => {
  getList()
})

async function getList() {
  const res = await NpmPlatformService.queryPublishRecords({ id: props.id })
  list.value = res.data || []
}

const columns = [
  {
    title: '包名称',
    key: 'name',
    customRender({ record }) {
      // 多包兼容
      return record.subModule || record.package_name
    },
  },
  {
    title: '包版本',
    dataIndex: 'version',
    key: 'version',
  },
  {
    title: 'Tag',
    dataIndex: 'tag',
    key: 'tag',
  },
  {
    title: 'BumpType',
    dataIndex: 'bump_type',
    key: 'bumpType',
  },
  {
    title: 'oss地址',
    dataIndex: 'oss_url',
    key: 'oss_url',
    slots: { customRender: 'ossUrl' },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    slots: { customRender: 'status' },
  },
  {
    title: '发布人',
    dataIndex: 'publish_user',
    key: 'publish_user',
  },
  {
    title: '发布时间',
    key: 'publishTime',
    customRender({ record }) {
      return dayjs(record.publish_time).format('YYYY-MM-DD H:mm:ss')
    },
  },
]
</script>
<style scoped lang="less"></style>
