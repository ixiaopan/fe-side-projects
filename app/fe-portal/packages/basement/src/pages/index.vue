<template>
  <div class="bs-page">
    <div class="bs-page-head">
      <h3>应用列表</h3>
      <a-button type="primary" @click="openCreateSiteModal">新建应用</a-button>
    </div>

    <a-table
      :loading="loading"
      :columns="columns"
      :data-source="list"
      :customRow="customRow"
      :pagination="{ defaultPageSize: 20 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <span @click.stop="() => goAppOverviewPage(record.id)" class="g-text-link">
            {{ record.nameAlias || record.name }}
          </span>
          <a-tag color="blue" style="margin-left: 8px;">{{ record.type }}</a-tag>
        </template>

        <template v-if="column.key === 'action'">
          <span class="g-text-link" @click.stop="() => openNewTab(record.url)">Gitlab</span>
          <a-divider type="vertical" />

          <span class="g-text-link" @click.stop="() => editSite(record)">编辑</span>

          <span>
            <!-- 危险操作不能删除 -->
            <!-- <a-popconfirm
              title="确认删除"
              ok-text="是"
              cancel-text="否"
              @confirm="() => delSite(record)"
              @cancel="() => record.delConfirmVisible = false"
              :visible="record.delConfirmVisible"
            >
              <span @click.stop="() => onDelClick(record)" class="g-text-link">删除</span>
            </a-popconfirm> -->
          </span>
        </template>
      </template>
    </a-table>
    <CreateBasement ref="siteRef" @created="onCreatedUpdated" />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'

import { goAppOverviewPage, openNewTab } from '@/router/goto'
import BasementService from '@/api/basement'
import CreateBasement from '@/components/createBasement.vue'

interface IBasement {
  id: string // mongo objectId
  projectId: number // gitlab projectId
  name: string
  template: string
  desc?: string
  delConfirmVisible?: boolean
}
const loading = ref(true)
const list = ref([])
const siteRef = ref()

const customRow = (record: IBasement) => {
  return {
    onClick: () => {
      goAppOverviewPage(record.id)
    },
  }
}

// --- 新建/编辑应用
const openCreateSiteModal = () => {
  siteRef.value.openModal()
}
const editSite = (record: IBasement) => {
  siteRef.value.openModal({ id: record.id })
}
const onCreatedUpdated = (edited: boolean) => {
  message.success(edited ? '更新成功' : '创建成功')
  init()
}
// --- 删除该应用
const delSite = async (record: IBasement) => {
  const res = await BasementService.delBasement({ id: record.id })

  // 删除成功，重新刷新页面
  if (res.data) {
    init()
    message.success('删除成功')
  }
}
const onDelClick = (record: IBasement) => {
  record.delConfirmVisible = true
}
const columns = [
  {
    title: 'Name',
    key: 'name',
  },
  {
    title: '描述',
    dataIndex: 'desc',
    key: 'desc',
  },
  {
    title: 'Monorepo',
    dataIndex: 'monorepo',
    key: 'monorepo',
    customRender({ record }) {
      return record.monorepo ? '是' : '否'
    },
  },
  {
    title: '进行中迭代',
    dataIndex: 'iterNum',
    key: 'iterNum',
  },
  {
    title: '操作',
    key: 'action',
  },
]
async function init() {
  const res = await BasementService.fetchBasement()
  list.value = res.data
  loading.value = false
}
init()
</script>

<style lang="less">
.bs-page {
  .bs-page-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }
}
</style>
