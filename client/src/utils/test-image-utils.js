/**
 * 测试图片处理工具函数
 */

import { 
  isPanoramaImage, 
  extractTitleFromFilename, 
  extractGPSFromImage, 
  compressImage,
  getImageDimensions,
  isImageFile,
  formatFileSize
} from './image-utils.js'

// 测试函数
export async function testImageUtils() {
  console.log('开始测试图片处理工具函数...')
  
  // 测试文件名提取
  console.log('测试文件名提取:')
  console.log('panorama.jpg ->', extractTitleFromFilename('panorama.jpg'))
  console.log('my-panorama-image.png ->', extractTitleFromFilename('my-panorama-image.png'))
  console.log('test.jpeg ->', extractTitleFromFilename('test.jpeg'))
  
  // 测试文件大小格式化
  console.log('\n测试文件大小格式化:')
  console.log('1024 bytes ->', formatFileSize(1024))
  console.log('1048576 bytes ->', formatFileSize(1048576))
  console.log('10485760 bytes ->', formatFileSize(10485760))
  
  console.log('\n图片处理工具函数测试完成')
}

// 如果直接运行此文件，执行测试
if (import.meta.hot) {
  testImageUtils()
}