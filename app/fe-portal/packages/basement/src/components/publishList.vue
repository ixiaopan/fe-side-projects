<template>
  <div class="bs-pub-list">
    <a-tabs v-model:activeKey="activeKey">
      <a-tab-pane key="1" tab="Releases">
        <div v-for="item in iterList" :key="item.date" :style="{ marginBottom: '32px' }">
          <h3>{{ item.date }}</h3>

          <a-table rowKey="iid" :loading="loading" :columns="columns" :data-source="item.list" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'title'">
                <span class="g-text-link" @click="() => goBasementAuditPage(projectId, record._id)">
                  {{ record.title }}
                </span>
              </template>

              <template v-if="column.key === 'branch'">
                <a v-if="record.prodMR?.id" target="_blank" :href="record.prodMR?.web_url" class="g-text-link">
                  {{ record.branch }}#{{ record.prodMR?.id }}
                </a>
              </template>

              <template v-if="column.key === 'action'">
                <span class="g-text-link" @click="noop">打Tag</span>

                <template v-if="record.prodDeploy?.pipelineRunId">
                  <a-divider type="vertical" />
                  <a
                    target="_blank"
                    :href="`https://flow.aliyun.com/pipelines/${record.prodDeploy?.pipelineId}/builds/${record.prodDeploy?.pipelineRunId}`"
                  >
                    日志#{{ record.prodDeploy?.pipelineRunId }}
                  </a>

                  <a-divider type="vertical" />
                  <span class="g-text-link" @click="noop">回滚</span>
                </template>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="2" tab="tags">
        <a-list class="bs-pub-tag-list" item-layout="vertical" size="small" :data-source="tagList">
          <template #renderItem="{ item }">
            <a-list-item :key="item.name">
              <template #actions>
                <div class="bs-tag-action">
                  <field-time-outlined />
                  {{ dayjs(item.commit?.created_at).format('MM-DD') }}
                </div>

                <div class="bs-tag-action">
                  <svg
                    fill="rgba(0, 0, 0, 0.45)"
                    aria-hidden="true"
                    height="16"
                    viewBox="0 0 16 16"
                    version="1.1"
                    width="16"
                    data-view-component="true"
                  >
                    <path
                      d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"
                    />
                  </svg>
                  <span>{{ item.commit?.short_id }}</span>
                </div>
              </template>

              <a-list-item-meta>
                <template #title>
                  <span>{{ item.name }}</span>
                  <span class="bs-tag-desc">{{ item.message }}</span>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { ref, watchEffect } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { FieldTimeOutlined } from '@ant-design/icons-vue'

import BasementService from '@/api/basement'
import { goBasementAuditPage } from '@/router/goto'

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

function noop() {
  message.warning('开发中')
}
//
const activeKey = ref('1')
const loading = ref(false)
const iterList: any = ref([])
const tagList = ref<
  {
    commit: {
      short_id: string
      created_at: string
    }
    message: string
    name: string
  }[]
>([])

async function initPubList() {
  loading.value = true

  // 后端默认只取20个, 【1 表示已发布状态】
  const res = await BasementService.fetchIterList(props.appId, 1)

  loading.value = false

  const list = res?.data || []
  // 分组的key
  const keyList = Array.from(new Set(list.map((o) => dayjs(o.prodDeploy?.endTime).format('YYYY-MM-DD'))))

  const data = keyList.reduce((m: { date: string; list: any }[], k: string) => {
    m.push({
      date: k,
      list: list.filter((o) => dayjs(o.prodDeploy?.endTime).format('YYYY-MM-DD') == k),
    })
    return m
  }, [])

  iterList.value = data || []
}
async function initTag() {
  loading.value = true
  const res = await BasementService.queryTags({ projectId: props.projectId! })
  loading.value = false
  tagList.value = res?.data
}

watchEffect(() => {
  if (activeKey.value == '1') {
    initPubList()
  } else {
    initTag()
  }
})

const columns = [
  {
    title: '标题',
    key: 'title',
    width: '20%',
  },
  {
    title: '分支#mr',
    key: 'branch',
    width: '20%',
  },
  {
    title: '负责人',
    key: 'owner',
    dataIndex: 'owner',
    width: '20%',
    customRender({ text }) {
      return (text?.map((t) => t?.name) || []).join(',')
    },
  },
  {
    title: '上线时间',
    dataIndex: 'prodDeploy',
    key: 'prodDeploy',
    width: '20%',
    customRender({ record }) {
      return dayjs(record.prodDeploy?.endTime).format('YYYY-MM-DD HH:mm:ss')
    },
  },
  {
    title: '操作',
    key: 'action',
    width: '20%',
  },
]
</script>

<style lang="less">
.bs-pub-tag-list {
  .bs-tag-desc {
    margin-left: 10px;
  }
  .ant-list-item-action {
    margin-top: -24px !important;
  }
  .bs-tag-action {
    display: flex;
    align-items: center;
    column-gap: 4px;
  }
}
</style>
