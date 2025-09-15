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
  build: {
    chunkSizeWarningLimit: 1000, // 增加到1MB警告限制
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vue 核心库
          if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
            return 'vue';
          }
          
          // Element Plus 及其图标
          if (id.includes('element-plus')) {
            return 'element-plus';
          }
          
          // 地图相关库
          if (id.includes('leaflet')) {
            return 'leaflet';
          }
          
          // 全景图相关
          if (id.includes('pannellum')) {
            return 'pannellum';
          }
          
          // 网络请求相关
          if (id.includes('axios') || id.includes('qs')) {
            return 'net';
          }
          
          // KML 处理相关 composables
          if (id.includes('/composables/') && (
            id.includes('kml') || 
            id.includes('use-map') ||
            id.includes('use-folder')
          )) {
            return 'map-composables';
          }
          
          // API 服务
          if (id.includes('/api/') || id.includes('/services/')) {
            return 'api-services';
          }
          
          // 工具函数
          if (id.includes('/utils/')) {
            return 'utils';
          }
          
          // 管理页面相关
          if (id.includes('/views/Admin') || id.includes('/components/admin')) {
            return 'admin';
          }
          
          // 地图页面相关
          if (id.includes('/views/Map') || id.includes('/components/map')) {
            return 'map';
          }
          
          // 通用组件
          if (id.includes('/components/common')) {
            return 'common-components';
          }
          
          // 全景图组件
          if (id.includes('/components/panorama') || id.includes('panorama')) {
            return 'panorama';
          }
          
          // 第三方库
          if (id.includes('node_modules')) {
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
