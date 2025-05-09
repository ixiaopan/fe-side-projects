<template>
  <ul class="base-home-card-list">
    <li
      v-for="item in list"
      :key="item.title"
      :class="[
        'base-home-card',
        `base-home-card-${item.type}`,
        item.status == WORK_STATUS.WIP ? 'base-home-card-wip' : '',
      ]"
      @click="(e) => onCardClick(e, item)"
    >
      <img v-if="item.icon" :src="item.icon" alt="" class="base-home-card-icon" />

      <div class="base-home-card-content">
        <p class="base-home-card-title">
          {{ item.title }}
          <a-tag color="green" v-if="item.owner" class="base-home-card-owner">{{ item.owner }}</a-tag>
        </p>

        <p class="base-home-card-desc">{{ item.desc }}</p>

        <div class="base-home-card-links">
          <a v-if="item.git" :href="item.git" target="_blank">Gitlab</a>
          <a v-if="item.doc" :href="item.doc" target="_blank">Doc</a>
        </div>
      </div>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { WORK_STATUS, CARD_TYPE } from '@/enums/appEnum'
import { openNewTab } from '@fe-portal/shared'

import router from '@/router'

type ICard = {
  title: string
  icon: string
  status: string
  owner: string
  desc: string
  git: string
  doc: string
  url: string
  link: string
  type: CARD_TYPE
  replace?: boolean
}

defineProps<{
  list: ICard[]
}>()

function onCardClick(e, item: ICard) {
  if (e.target?.nodeName?.toLowerCase() == 'a') {
    return
  }
  if (item.link.startsWith('/child')) {
    router.push({ path: item.link })
  } else {
    openNewTab(item.link, item.replace)
  }
}
</script>

<style lang="less" scoped>
.base-home-card-list {
  display: flex;
  flex-wrap: wrap;
  column-gap: 18px;
  row-gap: 24px;
}

.base-home-card {
  position: relative;
  width: 240px;
  min-height: 60px;
  padding: 10px;
  background: #fff;
  transition: all 0.2s;
  border-radius: 2px;

  display: flex;
  align-items: center;

  cursor: pointer;

  &:hover {
    transform: scale(1.05);
  }

  &.base-home-card-wip {
    cursor: default;
    background: #e5e5e5;
    &:hover {
      transform: none;
    }
  }
}

.base-home-card-icon {
  width: 32px;
  // height: 32px;
  margin-right: 10px;
}
.base-home-card-content {
  overflow: hidden;
}
.base-home-card-title {
  margin: 0;
  color: #000000f2;
  font: 600 16px/20px PingFang SC;

  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.base-home-card-desc {
  margin: 8px 0 0;
  color: #0006;
  font: 600 12px/12px PingFang SC;

  white-space: nowrap;
  text-overflow: ellipsis;
}
.base-home-card-links {
  margin: 8px 0 0;
  > a {
    margin-right: 8px;
  }
}
</style>
