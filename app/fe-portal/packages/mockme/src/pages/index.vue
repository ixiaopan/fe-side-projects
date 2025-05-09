<template>
  <div>
    <div class="mockme-app-head">
      <a-button type="primary" @click="visible = true">添加项目</a-button>
    </div>

    <div class="mockme-app-list">
      <div class="mockme-app-card" v-for="item in list" :key="item.id" @click="(e) => onDetail(e, item)">
        <div class="mockme-app-card-title">
          <h3>{{ item.name }}</h3>
        </div>

        <div class="mockme-app-card-row">
          <a-statistic title="接口总数" :value="item.count || 0" />
        </div>

        <div class="mockme-app-card-row">
          <span
            class="copy g-text-link"
            :data-clipboard-text="`https://fe.com/mockme/proxy/${item.id}`"
          >
            复制地址
          </span>
        </div>
      </div>
    </div>
  </div>

  <a-modal :footer="false" v-model:visible="visible" title="添加项目" :maskClosable="false">
    <Project @created="onCreate" />
  </a-modal>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import Clipboard from 'clipboard'
import { message } from 'ant-design-vue'

import MockmeService from '@/api'
import { goAppDetail } from '@/router'

import Project from '@/components/Project.vue'

type IApp = {
  id: string
  name: string
  count: number // 接口总数
  desc?: string
  devBaseUrl?: string
  betaBaseUrl?: string
}

const clipboard = new Clipboard('.copy')
clipboard.on('success', () => {
  message.success('复制成功')
})

clipboard.on('error', () => {
  message.success('复制失败')
})

// --- 创建项目
const visible = ref()
function onCreate() {
  visible.value = false
  init()
}

//
function onDetail(e, app: IApp) {
  if (e.target.classList.contains('copy')) {
    return
  }
  goAppDetail(app.id)
}

// entry point
const list = ref<IApp[]>([])
async function init() {
  const res = await MockmeService.queryProjectList()
  list.value = res.data || []
}
init()
</script>

<style lang="less">
.mockme-app-head {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;

  .mockme-app-operation {
    margin-right: 8px;
  }
}

.mockme-app-list {
  display: flex;
  flex-wrap: wrap;
  column-gap: 40px;
  row-gap: 40px;

  .mockme-app-card {
    flex: 0 0 300px;

    background: #fff;
    border-radius: 6px;
    padding: 12px;
    transition: all 0.12s ease-in;

    cursor: pointer;

    &:hover {
      transform: scale(1.02);
    }

    &-title {
      display: flex;
      align-items: center;
      h3 {
        font-size: 22px;
        margin: 0;
      }
      p {
        font-size: 12px;
        color: #aaa;
        margin: 0;
      }
    }

    &-action {
      margin-left: auto;
      color: #aaa;
      font-size: 12px;

      > span {
        cursor: pointer;
      }
    }

    .mockme-app-card-row {
      display: flex;
      align-items: flex-start;
      padding: 10px 0;

      & + .mockme-app-card-row {
        border-top: 1px solid #eee;
      }
    }
  }
}
</style>
