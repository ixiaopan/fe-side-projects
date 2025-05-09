<template>
  <div class="report-archive-page">
    <ReportHeader withWrite title="Archives" />

    <a-spin :spinning="loading">
      <a-empty v-if="emptyVisible" />

      <ul v-else class="report-list">
        <li class="report-item" v-for="item in list" :key="item.dateOfFriday">
          <span class="g-text-link" @click="() => goReportWeekPage(item.dateOfFriday)">{{ item.dateOfFriday }}</span>
        </li>
      </ul>
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'

import ReportService from '@/api/report'
import { goReportWeekPage } from '@/router/goto'

import ReportHeader from '@/components/ReportHeader.vue'

type IReportItem = {
  week: number
  dateOfFriday: string
}

const list = ref<IReportItem[]>([])
const loading = ref(true)
const emptyVisible = computed(() => !loading.value && !list.value.length)

async function init() {
  loading.value = true

  try {
    const res = await ReportService.queryReportArchive()
    list.value = res.data || []
  } catch (e) {}

  loading.value = false
}
init()
</script>

<style lang="less">
.report-archive-page {
  width: 50%;
  margin: 0 auto;

  .ant-spin-container::after {
    background: transparent !important;
  }

  .report-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 50vh;
    margin-left: -60px;
  }

  .report-item {
    margin-bottom: 20px;
    font: 16px/18px PingFang SC;
  }
}
</style>
