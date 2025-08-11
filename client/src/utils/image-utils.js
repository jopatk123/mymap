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
 * 读取图片EXIF/XMP信息中的GPS坐标
 * 优先使用 exifr（更健壮，支持XMP），失败时再安全回退到 exif.js
 * @param {File} file 图片文件
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function extractGPSFromImage(file) {
  // 1) 优先尝试 exifr（支持EXIF+XMP，兼容性更好）
  try {
    const { default: exifr } = await import('exifr')
    try {
      const gps = await exifr.gps(file)
      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        return {
          lat: parseFloat(gps.latitude.toFixed(6)),
          lng: parseFloat(gps.longitude.toFixed(6))
        }
      }
    } catch (e) {
      console.warn('exifr 解析GPS失败，将回退到 exif.js:', e?.message || e)
    }
  } catch (e) {
    // 动态加载失败（例如未安装），继续回退 exif.js
    console.warn('未安装 exifr 或加载失败，将回退到 exif.js')
  }

  // 2) 回退到 exif.js，但避免其内部 FileReader 回调中的未捕获异常
  if (typeof EXIF === 'undefined') {
    console.warn('EXIF.js库未加载，无法提取GPS信息（且 exifr 也不可用）')
    return null
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const dataView = new DataView(arrayBuffer)
    // 直接读取二进制，避免使用 EXIF.getData(file, cb) 内部的 FileReader 逻辑
    const tags = EXIF.readFromBinaryFile(dataView)

    if (!tags) return null

    // 兼容多种可能的返回字段
    const lat = tags.GPSLatitude
    const latRef = tags.GPSLatitudeRef
    const lng = tags.GPSLongitude
    const lngRef = tags.GPSLongitudeRef

    let latitude = null
    let longitude = null

    if (Array.isArray(lat) && latRef) {
      latitude = convertDMSToDD(lat, latRef)
    } else if (typeof lat === 'number') {
      latitude = lat
    }

    if (Array.isArray(lng) && lngRef) {
      longitude = convertDMSToDD(lng, lngRef)
    } else if (typeof lng === 'number') {
      longitude = lng
    }

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      return {
        lat: parseFloat(latitude.toFixed(6)),
        lng: parseFloat(longitude.toFixed(6))
      }
    }

    return null
  } catch (error) {
    console.warn('使用 exif.js 读取GPS信息时出错:', error?.message || error)
    return null
  }
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