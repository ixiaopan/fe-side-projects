<template>
  <div class="layout">
    <header class="layout-header">
      <h1 class="layout-title" id="layout-title"></h1>

      <a-popover v-if="userInfo?.avatar">
        <template #content>
          <ul class="layout-user-action">
            <li v-if="userBtnVisible" class="g-text-link" @click="goUserPage">用户管理</li>
            <li class="g-text-link" @click="loginOut">退出登录</li>
          </ul>
        </template>

        <div class="layout-user">
          <img :src="userInfo.avatar" alt="" />
        </div>
      </a-popover>
    </header>

    <main class="layout-main">
      <router-view />
    </main>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import { PAGE_ENUM } from '@/enums/appEnum'
import { useUserStore } from '@/store/modules/user'
import { ROLE_TYPE } from '@fe-portal/shared'
import router from './router'

const userStore = useUserStore()
const userInfo = computed(() => userStore.getUserInfo)
const userBtnVisible = computed(() => [ROLE_TYPE.ADMIN, ROLE_TYPE.MANAGER].includes(userStore.getRole))

const loginOut = () => {
  userStore.reLogin()
}
const goUserPage = () => router.push({ name: PAGE_ENUM.USER })
</script>

<style lang="less" scoped>
.layout {
  @paddingLeft: 48px;

  .layout-header {
    display: flex;
    align-items: center;

    height: 60px;
    padding: 0 @paddingLeft;
    background: #fff;

    .layout-title {
      margin: 0 auto;
    }

    .layout-logo {
      height: 21px;
    }

    .layout-user {
      cursor: pointer;
      img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
      }
    }
  }

  .layout-main {
    padding: 20px @paddingLeft;
  }
}

.layout-user-action {
  display: flex;
  flex-direction: column;
  row-gap: 12px;
}
</style>
