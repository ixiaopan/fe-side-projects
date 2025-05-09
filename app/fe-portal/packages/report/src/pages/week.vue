<template>
  <div class="report-week-page">
    <ReportHeader withAll withWrite :dateOfFriday="dateOfFriday" />
    <Anchor :list="list" :box="anchorRef" />

    <a-spin :spinning="loading">
      <a-empty v-if="emptyVisible" />

      <div v-else class="report-card-list" ref="anchorRef">
        <div class="report-card" v-for="item in list" :key="item.id">
          <p class="report-user">{{ item.name }}</p>
          <MdEditor v-model="item.content" previewOnly previewTheme="cyanosis" />
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import MdEditor from 'md-editor-v3'

import ReportService from '@/api/report'

import ReportHeader from '@/components/ReportHeader.vue'
import Anchor from '@/components/anchor.vue'

type IContent = {
  id: number
  content: string
  name: string
}
const list = ref<IContent[]>([])
const anchorRef = ref()

const route = useRoute()
const dateOfFriday = route.params?.date as string

const loading = ref(true)
const emptyVisible = computed(() => !loading.value && !list.value?.length)

async function init() {
  loading.value = true

  const res = await ReportService.queryWeekReport({ dateOfFriday })
  list.value = res.data
  loading.value = false
}
init()
</script>

<style lang="less">
.report-week-page {
  width: 50%;
  margin: 0 auto;

  .ant-spin-container::after {
    background: transparent !important;
  }
}

.report-card-list {
  min-height: 50vh;
}

.report-card {
  margin-bottom: 24px;

  .report-user {
    margin: 0 0 10px;
    font: 600 22px/34px PingFang SC;
  }
}
</style>
