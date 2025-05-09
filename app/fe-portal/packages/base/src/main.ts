import { createApp } from 'vue'
import { Modal } from 'ant-design-vue'
import microApp from '@micro-zoe/micro-app'
import { HTTP_RESPONSE_CODE } from '@fe-portal/shared'

import App from './App.vue'
import router, { setupRouter } from '@/router'
import { setupRouterGuard } from '@/router/guard'
import { setupStore } from '@/store'
import { useUserStoreWithout } from '@/store/modules/user'
import AccountService from '@/api/account'

import 'ant-design-vue/es/modal/style'
import 'ant-design-vue/es/message/style'
import '@/styles/global.less'

// 微前端
microApp.start({
  'disable-memory-router': true, // 关闭虚拟路由系统
  'disable-patch-request': true, // 关闭对子应用请求的拦截
})
microApp.addGlobalDataListener((data: any) => {
  // token失效，需要重新登录
  if (data.code == HTTP_RESPONSE_CODE.TOKEN_INVALID) {
    const userStore = useUserStoreWithout()
    userStore.reLogin(data)
  }
})
microApp.setGlobalData({
  fetchUserList: AccountService.getUserList,
  fetchUserInfo: () => useUserStoreWithout().getUserInfo,
  fetchAuditableUserList: AccountService.getAuditableUserList,
})
window.microApp = microApp

//
function bootstrap() {
  const app = createApp(App)

  setupStore(app)

  setupRouter(app)

  setupRouterGuard(router)

  app.use(Modal)

  app.mount('#app')
}
bootstrap()
