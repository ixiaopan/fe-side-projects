import { defineComponent } from 'vue'

export default function buildPage(name: string) {
  const { publicPath, mfeName, devPort } = __APP_MFE__[name] || {}

  const url = __APP_DEV__ ? `http://localhost:${devPort}` : window.location.origin

  const realUrl = `${url}${publicPath}`

  return defineComponent({
    name,
    setup() {
      return () => (
        <div>
          <micro-app name={mfeName} url={realUrl} iframe></micro-app>
        </div>
      )
    },
  })
}
