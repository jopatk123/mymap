const fs = require('fs')
const path = require('path')
const Logger = require('./logger')

// 确保上传目录存在
const ensureUploadDirectories = () => {
  const uploadsDir = path.join(__dirname, '../uploads')
  const kmlBaseMapDir = path.join(uploadsDir, 'kml-basemap')
  
  // 创建uploads目录
  if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  Logger.info('Created uploads directory', { uploadsDir })
  }
  
  // 创建kml-basemap目录
  if (!fs.existsSync(kmlBaseMapDir)) {
  fs.mkdirSync(kmlBaseMapDir, { recursive: true })
  Logger.info('Created kml-basemap directory', { kmlBaseMapDir })
  }
}

module.exports = {
  ensureUploadDirectories
}
