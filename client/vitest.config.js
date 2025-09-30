import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'url';
const srcDir = fileURLToPath(new URL('./src', import.meta.url));
const setupFile = fileURLToPath(new URL('./src/setupTests.js', import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  test: {
    alias: {
      '@': srcDir,
    },
    setupFiles: [setupFile],
    globals: true,
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '../server/**', '../tmp/**'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,vue}'],
      exclude: ['src/**/*.d.ts', 'src/**/__tests__/**', 'src/setupTests.js'],
    },
  },
});
