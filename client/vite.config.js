import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['element-plus', 'vue', 'vue-router', 'pinia', 'geotiff', 'd3-contour'],
  },
  build: {
    chunkSizeWarningLimit: 1000, // 增加到1MB警告限制
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 更安全的代码分割策略，避免循环依赖
          if (id.includes('node_modules')) {
            if (id.includes('element-plus')) {
              return 'element-plus';
            }
            if (id.includes('leaflet')) {
              return 'leaflet';
            }
            if (
              id.includes('vue') ||
              id.includes('@vue') ||
              id.includes('vue-router') ||
              id.includes('pinia')
            ) {
              return 'vue-vendor';
            }
            // 其他第三方库放入 vendor
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: (() => {
      const backend = process.env.BACKEND_URL || 'http://localhost:3002';
      return {
        '/api': {
          target: backend,
          changeOrigin: true,
        },
        '/uploads': {
          target: backend,
          changeOrigin: true,
        },
        '/geo': {
          target: backend,
          changeOrigin: true,
        },
      };
    })(),
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },
  },
});
