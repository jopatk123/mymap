import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          element: ['element-plus'],
          leaflet: ['leaflet'],
          pannellum: ['pannellum'],
          net: ['axios']
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: (() => {
      const backend = process.env.BACKEND_URL || 'http://localhost:3002'
      return {
        '/api': {
          target: backend,
          changeOrigin: true
        },
        '/uploads': {
          target: backend,
          changeOrigin: true
        }
      }
    })()
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`
      }
    }
  }
})