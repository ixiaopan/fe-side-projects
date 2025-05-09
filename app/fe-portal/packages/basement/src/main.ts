import { createApp } from 'vue'
import { Modal } from 'ant-design-vue'

import App from './App.vue'
import { setupRouter } from '@/router'

import 'ant-design-vue/es/message/style'
import 'ant-design-vue/es/modal/style'
import '@/styles/global.less'

function bootstrap() {
  const app = createApp(App)

  setupRouter(app)

  app.use(Modal)

  app.mount('#basement-app')
}

bootstrap()
