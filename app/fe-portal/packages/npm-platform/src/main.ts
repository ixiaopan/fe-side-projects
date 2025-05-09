import { createApp } from 'vue'

import App from './App.vue'
import { setupRouter } from '@/router'

import 'ant-design-vue/es/modal/style'
import 'ant-design-vue/es/message/style'
import '@/styles/global.less'

function bootstrap() {
  const app = createApp(App)

  setupRouter(app)

  app.mount('#npm-app')
}

bootstrap()
