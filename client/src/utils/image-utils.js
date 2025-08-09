/**
 * 图片处理工具函数
 */

/**
 * 检查是否为全景图
 * @param {File} file 图片文件
 * @returns {Promise<boolean>}
 */
export function isPanoramaImage(file) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // 全景图通常宽高比为2:1，允许一定误差
      const aspectRatio = img.width / img.height
      const isPanorama = aspectRatio >= 1.8 && aspectRatio <= 2.2
      
      // 同时检查最小尺寸，确保是合理的全景图
      const minWidth = 1000
      const minHeight = 500
      const hasMinSize = img.width >= minWidth && img.height >= minHeight
      
      resolve(isPanorama && hasMinSize)
      
      // 清理对象URL
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      resolve(false)
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 从文件名提取标题（去除扩展名）
 * @param {string} filename 文件名
 * @returns {string}
 */
export function extractTitleFromFilename(filename) {
  return filename.replace(/\.[^/.]+$/, '')
}

/**
 * 读取图片EXIF信息中的GPS坐标
 * @param {File} file 图片文件
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export function extractGPSFromImage(file) {
  return new Promise((resolve) => {
    // 使用EXIF.js库读取GPS信息
    if (typeof EXIF === 'undefined') {
      console.warn('EXIF.js库未加载，无法提取GPS信息')
      resolve(null)
      return
    }

    try {
      EXIF.getData(file, function() {
        const lat = EXIF.getTag(this, 'GPSLatitude')
        const latRef = EXIF.getTag(this, 'GPSLatitudeRef')
        const lng = EXIF.getTag(this, 'GPSLongitude')
        const lngRef = EXIF.getTag(this, 'GPSLongitudeRef')

        if (lat && lng && latRef && lngRef) {
          // 转换GPS坐标格式
          const latitude = convertDMSToDD(lat, latRef)
          const longitude = convertDMSToDD(lng, lngRef)
          
          resolve({ lat: latitude, lng: longitude })
        } else {
          resolve(null)
        }
      })
    } catch (error) {
      console.warn('提取GPS信息时出错:', error)
      resolve(null)
    }
  })
}

/**
 * 将DMS格式坐标转换为DD格式
 * @param {Array} dms DMS格式坐标数组 [度, 分, 秒]
 * @param {string} ref 方向参考 (N/S/E/W)
 * @returns {number}
 */
function convertDMSToDD(dms, ref) {
  let dd = dms[0] + dms[1] / 60 + dms[2] / 3600
  if (ref === 'S' || ref === 'W') {
    dd = dd * -1
  }
  return parseFloat(dd.toFixed(6))
}

/**
 * 压缩图片到指定尺寸
 * @param {File} file 原始图片文件
 * @param {number} maxWidth 最大宽度
 * @param {number} maxHeight 最大高度
 * @param {number} quality 压缩质量 (0-1)
 * @returns {Promise<File>}
 */
export function compressImage(file, maxWidth = 8000, maxHeight = 4000, quality = 0.5) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      const { width, height } = img
      
      // 如果图片尺寸小于等于目标尺寸，直接返回原文件
      if (width <= maxWidth && height <= maxHeight) {
        URL.revokeObjectURL(img.src)
        resolve(file)
        return
      }

      // 计算压缩后的尺寸，保持宽高比
      let newWidth = width
      let newHeight = height

      if (width > maxWidth) {
        newWidth = maxWidth
        newHeight = (height * maxWidth) / width
      }

      if (newHeight > maxHeight) {
        newHeight = maxHeight
        newWidth = (width * maxHeight) / height
      }

      // 设置canvas尺寸
      canvas.width = newWidth
      canvas.height = newHeight

      // 使用高质量的图像缩放
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // 绘制压缩后的图片
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      // 转换为Blob
      canvas.toBlob(
        (blob) => {
          // 创建新的File对象
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })
          
          // 清理资源
          URL.revokeObjectURL(img.src)
          
          resolve(compressedFile)
        },
        file.type,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      resolve(file)
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 获取图片尺寸信息
 * @param {File} file 图片文件
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const dimensions = { width: img.width, height: img.height }
      URL.revokeObjectURL(img.src)
      resolve(dimensions)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      resolve({ width: 0, height: 0 })
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 检查图片文件类型
 * @param {File} file 文件
 * @returns {boolean}
 */
export function isImageFile(file) {
  return file && file.type.startsWith('image/')
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}