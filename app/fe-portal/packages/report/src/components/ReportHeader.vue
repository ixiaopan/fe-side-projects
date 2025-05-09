<template>
  <div class="report-head">
    <div class="report-head-action">
      <span class="g-text-link" v-if="withAll" @click="goReportArchivesPage">历史周报</span>
      <span class="g-text-link" v-if="withWeek" @click="onViewWeek">本周周报</span>
      <span class="g-text-link" v-if="withWrite" @click="goReportPage">写周报</span>
    </div>

    <h3 class="report-head-title">{{ title }}</h3>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import { goReportPage, goReportWeekPage, goReportArchivesPage } from '@/router/goto'

const props = defineProps({
  withAll: Boolean,
  withWeek: Boolean,
  withWrite: Boolean,
  dateOfFriday: String,
  title: String,
})

const title = computed(() => props.title || props.dateOfFriday)

function onViewWeek() {
  if (props.dateOfFriday) {
    goReportWeekPage(props.dateOfFriday)
  }
}
</script>

<style lang="less" scoped>
.report-head {
  position: relative;
  margin: 20px 0;
  height: 50px;

  .report-head-action {
    display: flex;
    justify-content: flex-end;

    position: absolute;
    right: 0;
    bottom: 10px;

    > span {
      margin-left: 20px;
      text-align: right;
      font: 14px/16px PingFang SC;
    }
  }

  .report-head-title {
    text-align: center;
    color: #000000f2;
    font: 600 40px/50px PingFang SC;
  }
}
</style>
