// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app';

export default defineConfig(() => {
  return {
    // App boot files (/src/boot)
    boot: ['axios'],

    // Global CSS
    css: [
      'app.css'
    ],

    // 不載入 Material Icons font。
    // 專案統一使用 Quasar 的 SVG Material Icons，
    // 避免字型載入失敗時顯示 more_horiz、cancel 等原始文字。
    extras: [],

    build: {
      target: {},

      typescript: {
        strict: true,
        vueShim: true
      },

      vueRouterMode: 'history'
    },

    devServer: {
      open: false,

      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true
        },

        '/uploads': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true
        },

        '/socket.io': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
          ws: true
        }
      }
    },

    framework: {
      config: {},

      // 使用 Quasar SVG Material Icons。
      iconSet: 'svg-material-icons',

      plugins: [
        'Dialog',
        'Notify'
      ]
    },

    // 沒有使用 Quasar CSS animation 時可保持空陣列。
    animations: [],

    ssr: {
      prodPort: 3000,

      middlewares: [
        'render'
      ]
    },

    ssg: {},

    pwa: {
      workboxMode: 'GenerateSW'
    },

    cordova: {},

    capacitor: {
      hideSplashscreen: true
    },

    electron: {
      preloadScripts: [
        'electron-preload'
      ],

      inspectPort: 5858,

      bundler: 'packager',

      packager: {},

      builder: {
        appId: 'chioansim-front'
      }
    },

    bex: {
      extraScripts: []
    }
  };
});
