import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

// 导出所有store
export { usePanoramaStore } from './panorama.js'
export { useAppStore } from './app.js'