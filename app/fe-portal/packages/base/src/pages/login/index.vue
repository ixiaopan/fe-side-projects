<template>
  <div class="base-login-page">
    <a-button type="primary" @click="toLogin">使用飞书一键登录</a-button>
  </div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

import { useUserStore } from '@/store/modules/user'
import AccountService from '@/api/account'
import router from '../../router'

const redirect_uri = location.href.split('?')[0]

const route = useRoute()
const userStore = useUserStore()

onMounted(async () => {
  // http://localhost:3000/login?redirect=/home&code=1a4vca81c39242e0a72e6911dc070d64
  const res = location.href.match(/code\=(\w+)/)
  const code = (route.query?.code || (res && res[1])) as string

  if (code) {
    const res = await AccountService.getAccessToken({
      code,
      redirect_uri,
    })

    userStore.setToken(res.data?.token)

    router.push('/')
  }
})

const toLogin = () => {
  AccountService.toAuth({
    redirect_uri,
  }).then((res) => {
    window.location.href = res.data
  })
}
</script>

<style lang="less" scoped>
.base-login-page {
  height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
