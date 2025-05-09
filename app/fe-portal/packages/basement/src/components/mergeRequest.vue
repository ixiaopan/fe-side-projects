<!-- 合并请求 -->
<template>
  <div class="bs-mr-page">
    <div class="bs-mr-table" v-for="item in list" :key="item.id">
      <div class="bs-mr-head">
        <h3 class="bs-mr-title">{{ item.id }}</h3>
        <span v-if="item.count > 0">{{ item.count }}</span>
        <span class="g-text-link" @click="() => openModal(item)">发起MR</span>
      </div>

      <a-table rowKey="source_branch" :columns="columns" :data-source="item.list" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'source_branch'">
            <div>
              {{ record.title }}
            </div>
            <a target="_blank" :href="replaceHost(record.web_url)">{{ record.source_branch }}#{{ record.iid }}</a>
          </template>

          <template v-if="column.key == 'status'">
            <a-tag color="blue">{{ record.state }}</a-tag>

            <a-tag :color="record.merge_status == 'can_be_merged' ? 'green' : 'red'">{{ record.merge_status }}</a-tag>

            <a-tag color="red" v-if="record.has_conflicts">has_conflicts</a-tag>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal class="bs-mr-create" :title="'Create MR【' + targetBranch + '】'" v-model:visible="visible" @ok="onCreate">
      <div class="bs-mr-create-row">
        <span>源分支</span>
        <a-input placeholder="story/xxx" v-model:value="sourceBranch" />
      </div>

      <div class="bs-mr-create-row">
        <span>CR 负责人</span>
        <UserSelect ref="userSelectRef" @change="onUserChange" />
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { UserSelect, replaceHost } from '@fe-portal/shared'

import BasementService from '@/api/basement'

const props = defineProps({
  projectId: {
    type: Number,
    required: true,
  },
  appId: {
    type: String,
    required: true,
  },
})

type IMergeGroup = {
  id: string
  list: any
}
const loading = ref(false)
const list = ref<IMergeGroup[]>([])

async function init() {
  loading.value = true

  const res = await BasementService.queryMRGroupByIter({ projectId: props.projectId!, state: 'opened' })
  const data = res?.data || []

  const mainIdx = data.findIndex((o: { id: string }) => o.id == 'main' || o.id == 'master')
  if (mainIdx > -1) {
    const mainItem = data[mainIdx]
    data.splice(mainIdx, 1)
    data.unshift(mainItem)
  }

  // 获取未发布的迭代
  const result = await BasementService.fetchIterList(props.appId, 0)
  result.data?.forEach((o: { branch: string }) => {
    if (!data.find((c: { id: string }) => c.id == o.branch)) {
      data.push({
        id: o.branch,
        list: [],
      })
    }
  })

  list.value = data

  loading.value = false
}
init()

//
const visible = ref(false)
const sourceBranch = ref('')
const targetBranch = ref('')

const userSelectRef = ref()
let reviewer: string[] = []
function openModal(row: IMergeGroup) {
  visible.value = true
  sourceBranch.value = ''
  targetBranch.value = row.id

  reviewer = []

  userSelectRef.value?.clear()
}

function onUserChange(d: { name: string; userId: string }[]) {
  reviewer = d.map((o: { name: string; userId: string }) => o.name)
}

let lock = false
async function onCreate() {
  const sr = sourceBranch.value.trim()
  if (!sr) {
    return message.error('分支不能为空')
  }
  if (lock) return

  lock = true

  const res = await BasementService.createMergeRequest({
    projectId: props.projectId!,
    sourceBranch: sr,
    targetBranch: targetBranch.value,
    reviewer,
  })
  if (res?.data) {
    visible.value = false
    init()
  }
  lock = false
}

const columns = [
  {
    title: '源分支',
    key: 'source_branch',
    width: '25%',
  },
  {
    title: '状态',
    key: 'status',
  },
  {
    title: '提交人',
    key: 'authorName',
    width: '10%',
    customRender({ record }) {
      return record.author?.username || ''
    },
  },

  {
    title: '评论数',
    key: 'user_notes_count',
    dataIndex: 'user_notes_count',
  },

  {
    title: 'CR负责人',
    key: 'reviewer',
    customRender({ record }) {
      return (
        (record.mr_reviewers || []).join(',') +
        ',' +
        (record?.assignees?.map((c: { username: string; name: string }) => c.username) || []).join(',')
      )
    },
  },

  {
    title: '创建时间',
    key: 'created_at',
    dataIndex: 'created_at',
    customRender({ record }) {
      return dayjs(record.created_at).format('YYYY-MM-DD')
    },
  },
]
</script>

<style lang="less">
.bs-mr-page {
  .bs-mr-table {
    margin-bottom: 32px;
  }
  .bs-mr-head {
    display: flex;
    align-items: center;
    column-gap: 12px;
    margin-bottom: 12px;

    line-height: 24px;
    font-size: 14px;
  }
  .bs-mr-title {
    margin: 0;
    font-size: 24px;
  }
}
.bs-mr-create {
  .ant-select {
    width: 100%;
  }

  .bs-mr-create-row {
    margin-bottom: 10px;
  }
}
</style>
