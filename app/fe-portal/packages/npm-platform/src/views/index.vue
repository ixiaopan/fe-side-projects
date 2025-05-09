<template>
  <div class="operation-box">
    <a-button type="primary" @click="openAddPackageModal">添加包</a-button>
  </div>
  <a-table :columns="columns" :data-source="list">
    <template #name="{ record }">
      <p>
        {{ record.name }}
        <a-tag v-if="!record.isMonorepo">{{ ((record.packageList || [])[0] || {}).version }}</a-tag>
      </p>

      <ul v-if="record.isMonorepo" style="margin-left: 20px">
        <li v-for="item in record.packageList" :key="item.name" style="margin-bottom: 8px">
          <span>{{ item.name }}</span>
          <a-tag style="margin-left: 10px">{{ item.version }}</a-tag>
        </li>
      </ul>
    </template>

    <template #userNames="{ record }">
      <a-tag v-for="user of record.maintainer" :key="user.name" color="blue">{{ user.name }}</a-tag>
    </template>

    <template #action="{ record }">
      <span>
        <a @click="() => openPublishModal(record)">发布</a>

        <a-divider type="vertical" />
        <router-link :to="`/detail/${record._id}`">详情</router-link>

        <a-divider type="vertical" />
        <a-popconfirm
          v-if="removeEnabled"
          title="确认删除"
          ok-text="是"
          cancel-text="否"
          @confirm="() => onRemove(record)"
          @cancel="() => (record.delConfirmVisible = false)"
          :visible="record.delConfirmVisible"
        >
          <span v-if="removeEnabled" @click.stop="() => (record.delConfirmVisible = true)" class="g-text-link">
            删除
          </span>
        </a-popconfirm>

        <a-divider type="vertical" />
        <a @click="() => updateVersion(record)">更新</a>
      </span>
    </template>
  </a-table>

  <!-- 发布弹窗 -->
  <PublishModal />

  <!-- 添加包的弹窗 -->
  <AddPackageModal />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ROLE_TYPE } from '@fe-portal/shared'

import { usePublishModal } from '@/hooks/usePublishModal'
import { useAddPackageModal } from '@/hooks/useAddPackageModal'
import NpmPlatformService, { IPackage } from '@/api/npmPlatform'
import emitter, { EVENT_EMITTER } from '@/emitter'

import PublishModal from '@/components/publishModal/index.vue'
import AddPackageModal from '@/components/addPackageModal/index.vue'

const { openPublishModal } = usePublishModal()
const { openAddPackageModal } = useAddPackageModal()
const list = ref<IPackage[]>([])

const removeEnabled = computed(() =>
  [ROLE_TYPE.ADMIN, ROLE_TYPE.MANAGER].includes(window.microApp?.getGlobalData().fetchUserInfo()?.role)
)

async function onRemove(record: IPackage) {
  const res = await NpmPlatformService.removePackage({ id: record._id })
  if (res?.data?.code == 200) {
    message.success('删除成功')
    getList()
  }
}
async function updateVersion(record: IPackage) {
  const res = await NpmPlatformService.addPackage({
    // @ts-ignore
    id: record._id,
    name: record.name,
    gitlab: record.gitlab,
    isMonorepo: record.isMonorepo,
  })
  if (res?.data?.code == 200) {
    message.success('更新成功')
    getList()
  }
}

onMounted(async () => {
  getList()
})

emitter.on(EVENT_EMITTER.UPDATE_PACKAGE_SUCCESS, async () => {
  getList()
})

async function getList() {
  const res = await NpmPlatformService.queryPackages()
  list.value = res.data
}

const columns = [
  {
    title: '名称',
    key: 'name',
    slots: { customRender: 'name' },
  },
  {
    title: 'monorepo',
    dataIndex: 'isMonorepo',
    key: 'isMonorepo',
    customRender({ record }) {
      return record.isMonorepo ? '是' : '否'
    },
  },
  {
    title: 'Maintainer',
    dataIndex: 'userNames',
    key: 'userNames',
    slots: { customRender: 'userNames' },
  },
  {
    title: 'Action',
    key: 'action',
    fixed: 'right',
    width: 300,
    slots: { customRender: 'action' },
  },
]
</script>
<style scoped lang="less">
.operation-box {
  display: flex;
  justify-content: right;
  margin-bottom: 10px;
}
</style>
