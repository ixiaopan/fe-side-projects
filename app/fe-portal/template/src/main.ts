import { createApp } from 'vue'

import App from './App.vue'

import 'ant-design-vue/es/message/style'
import '@/styles/global.less'

function bootstrap() {
  const app = createApp(App)

  app.mount('#slot-app')
}

bootstrap()
