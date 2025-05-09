import type { UserConfig, ConfigEnv } from 'vite'
import { loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import { viteMockServe } from 'vite-plugin-mock'

import { wrapperEnv, pathResolve } from '../../scripts/mfe-entry.mjs'
import pkg from './package.json'

export default ({ command, mode }: ConfigEnv): UserConfig => {
  const root = process.cwd()
  const env = loadEnv(mode, root)
  const viteEnv = wrapperEnv(env)

  const { VITE_USE_MOCK, VITE_USE_MOCK_DB, VITE_DROP_CONSOLE } = viteEnv

  const isBeta = mode === 'beta'
  const isDev = mode == 'development'
  const isProd = mode == 'production'

  const isBuild = command == 'build'
  const base = pkg.publicPath

  console.log('VITE_USE_MOCK', VITE_USE_MOCK)
  console.log('VITE_USE_MOCK_DB', VITE_USE_MOCK_DB)
  console.log('VITE_DROP_CONSOLE', VITE_DROP_CONSOLE)

  console.log('basePath:', base)
  console.log('command:', command)
  console.log('env:', mode)

  return {
    root,
    base,
    resolve: {
      alias: {
        '@': pathResolve('src'),
        '#': pathResolve('types'),
      },
    },
    server: {
      open: true,
      host: true,
      port: pkg.devPort,

      proxy: VITE_USE_MOCK_DB
        ? {
            '/mock': {
              target: 'http://localhost:8001/',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/mock/, ''),
            },
          }
        : {},
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        },
      },
      // postcss: {
      //   plugins: [require('autoprefixer')],
      // },
    },
    plugins: [
      vue(),

      Components({
        resolvers: [
          AntDesignVueResolver({
            importStyle: 'less',
          }),
        ],
      }),

      viteMockServe({
        ignore: /^\_/,
        mockPath: 'mock',
        localEnabled: command === 'serve' && VITE_USE_MOCK,
        prodEnabled: command !== 'serve' && VITE_USE_MOCK,
        injectCode: `
          import { setupProdMockServer } from '../mock/_createServer';

          setupProdMockServer();
        `,
      }),
    ],

    define: {
      __APP_ENV__: isProd ? JSON.stringify('prod') : isBeta ? JSON.stringify('beta') : JSON.stringify('dev'),
      __APP_DEV__: JSON.stringify(!isBuild),
    },

    build: {
      outDir: pkg.outDir,
      minify: isDev ? false : 'terser',
      target: 'es2015',
      terserOptions: isDev
        ? undefined
        : {
            compress: {
              keep_infinity: true,
              drop_console: VITE_DROP_CONSOLE,
              drop_debugger: VITE_DROP_CONSOLE,
            },
          },
      chunkSizeWarningLimit: 2000,
    },
  }
}
