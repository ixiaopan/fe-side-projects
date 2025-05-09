<template>
  <div class="base-home">
    <section class="base-home-section" v-for="row in PORTAL_LIST" :key="row.title">
      <h2 class="base-home-head">{{ row.title }}</h2>

      <template v-if="row.group">
        <div class="base-home-group" v-for="group in row.list" :key="group.groupId">
          <span class="base-home-group-name">{{ group.name }}</span>
          <HomeCard :list="group.list" />
        </div>
      </template>

      <template v-else>
        <HomeCard :list="row.list" />
      </template>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { PORTAL_LIST } from '@/enums/appEnum'
import HomeCard from './card.vue'
</script>

<style lang="less" scoped>
.base-home-section {
  & + .base-home-section {
    margin-top: 20px;
  }
  .base-home-group + .base-home-group {
    margin-top: 8px;
  }
  .base-home-group-name {
    display: block;
    margin-bottom: 6px;
    color: #0006;
    font: 600 12px/12px PingFang SC;
  }
}
</style>
