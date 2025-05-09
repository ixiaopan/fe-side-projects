<template>
  <a-modal class="bs-iter-daily" :title="record?.title" v-model:visible="visible" width="80vw">
    <div class="bs-iter-daily-list">
      <a-empty v-if="!reportList?.length" />

      <a-timeline>
        <a-timeline-item class="bs-iter-daily-card" v-for="card in reportList" :key="card.date">
          <div class="bs-iter-daily-card-head">
            <span>{{ dayjs(card.date).format('YYYY-MM-DD') }}</span>

            <div class="bs-iter-daily-card-tool">
              <span class="g-text-link" @click="() => copyMe(card.content)">复制</span>

              <template v-if="!card.synced">
                <a-divider type="vertical" />
                <a-popconfirm
                  title="确认同步到前端群"
                  ok-text="是"
                  cancel-text="否"
                  @confirm="() => syncRobot(card)"
                  @cancel="() => (card.popConfirmVisible = false)"
                  :visible="card.popConfirmVisible"
                >
                  <span @click.stop="() => onSyncConfirm(card)" class="g-text-link">同步</span>
                </a-popconfirm>
              </template>
            </div>
          </div>

          <div v-html="card.content?.replace(/\n/g, '<br />')"></div>
        </a-timeline-item>
      </a-timeline>
    </div>

    <div class="bs-iter-daily-textarea">
      <span>{{ now.format('YYYY-MM-DD') }}</span>
      <a-textarea placeholder="项目进度" v-model:value="content" :rows="10" />
      <a-checkbox v-model:checked="checked">自动同步到前端群</a-checkbox>
      <a-button type="primary" @click="onWrite">提交</a-button>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'

import BasementService from '@/api/basement'

const visible = ref(false)

const record = ref()
const reportList = ref()

const now = dayjs()
const content = ref<string>('')
const checked = ref(true)

// 复制
function copyMe(c: string) {
  // https://segmentfault.com/q/1010000019566122
  if (navigator.clipboard) {
    navigator.clipboard.writeText(c)
    message.success('复制成功')
  }
}

// 同步
function onSyncConfirm(card: any) {
  card.popConfirmVisible = true
}
async function syncRobot(c: { _id: string; date: number; content: string }) {
  const res = await BasementService.syncIterDaily({
    iid: record.value._id,
    _id: c._id,
    content: c.content,
    date: c.date,
  })

  refreshList()

  message.success(res.data ? '同步成功' : '同步失败')
}

// 提交
async function onWrite() {
  try {
    await BasementService.addIterDaily({
      iid: record.value._id,
      date: now.valueOf(),
      content: content.value,
      synced: Number(checked.value),
    })

    content.value = ''

    refreshList()
  } catch (e) {}
}

// entry
async function refreshList() {
  const res = await BasementService.fetchIterDailyList({ iid: record.value?._id })
  reportList.value = res.data
}

function openModal(r: any) {
  content.value = ''
  checked.value = true

  visible.value = true

  record.value = r
  refreshList()
}

defineExpose({
  openModal,
})
</script>

<style lang="less">
.bs-iter-daily {
  .ant-modal-body {
    display: flex;
    justify-content: space-between;
  }
  .bs-iter-daily-list {
    height: 60vh;
    flex: 0 0 49%;
    background: #fafafa;
    overflow-y: auto;
    padding: 10px;
    &::-webkit-scrollbar {
      width: 5px;
      display: block !important;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(30, 29, 53, 0.11);
      border-radius: 60px;
    }
  }
  .bs-iter-daily-textarea {
    flex: 0 0 49%;
    .ant-btn {
      margin-top: 10px;
    }
  }
  .bs-iter-daily-card-head {
    display: flex;
    align-items: center;
  }
  .bs-iter-daily-card-tool {
    font-size: 12px;
    margin-left: 10px;
  }
}
</style>
