#!/usr/bin/env node

// 项目状态检查脚本
const fs = require('fs')
const path = require('path')

// 颜色定义
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// 检查文件是否存在
function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath)
  const status = exists ? '✅' : '❌'
  const color = exists ? 'green' : 'red'
  log(`${status} ${description}: ${filePath}`, color)
  return exists
}

// 检查目录是否存在
function checkDirectory(dirPath, description) {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()
  const status = exists ? '✅' : '❌'
  const color = exists ? 'green' : 'red'
  log(`${status} ${description}: ${dirPath}`, color)
  return exists
}

// 检查package.json依赖
function checkPackageJson(packagePath, description) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    const depCount = Object.keys(packageJson.dependencies || {}).length
    const devDepCount = Object.keys(packageJson.devDependencies || {}).length
    log(`✅ ${description}: ${depCount} 依赖, ${devDepCount} 开发依赖`, 'green')
    return true
  } catch (error) {
    log(`❌ ${description}: 读取失败`, 'red')
    return false
  }
}

// 检查文件内容
function checkFileContent(filePath, searchText, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const found = content.includes(searchText)
    const status = found ? '✅' : '❌'
    const color = found ? 'green' : 'yellow'
    log(`${status} ${description}`, color)
    return found
  } catch (error) {
    log(`❌ ${description}: 文件读取失败`, 'red')
    return false
  }
}

// 主检查函数
function checkProject() {
  log('\n🔍 地图全景项目状态检查', 'cyan')
  log('=' * 50, 'cyan')
  
  let totalChecks = 0
  let passedChecks = 0
  
  // 检查根目录文件
  log('\n📁 根目录文件检查:', 'blue')
  const rootFiles = [
    ['package.json', '根目录配置文件'],
    ['README.md', '项目说明文档'],
    ['PROJECT_SUMMARY.md', '项目总结文档'],
    ['start.sh', '快速启动脚本'],
    ['test-server.js', '服务器测试脚本']
  ]
  
  rootFiles.forEach(([file, desc]) => {
    totalChecks++
    if (checkFile(file, desc)) passedChecks++
  })
  
  // 检查前端项目
  log('\n🎨 前端项目检查:', 'blue')
  const frontendChecks = [
    () => checkDirectory('client', '前端项目目录'),
    () => checkFile('client/package.json', '前端配置文件'),
    () => checkFile('client/vite.config.js', 'Vite配置文件'),
    () => checkFile('client/index.html', '前端入口文件'),
    () => checkDirectory('client/src', '前端源码目录'),
    () => checkDirectory('client/src/components', '组件目录'),
    () => checkDirectory('client/src/views', '页面目录'),
    () => checkDirectory('client/src/store', '状态管理目录'),
    () => checkDirectory('client/src/api', 'API目录'),
    () => checkDirectory('client/src/utils', '工具函数目录'),
    () => checkDirectory('client/src/composables', '组合式API目录')
  ]
  
  frontendChecks.forEach(check => {
    totalChecks++
    if (check()) passedChecks++
  })
  
  // 检查后端项目
  log('\n🚀 后端项目检查:', 'blue')
  const backendChecks = [
    () => checkDirectory('server', '后端项目目录'),
    () => checkFile('server/package.json', '后端配置文件'),
    () => checkFile('server/.env', '环境配置文件'),
    () => checkDirectory('server/src', '后端源码目录'),
    () => checkDirectory('server/src/controllers', '控制器目录'),
    () => checkDirectory('server/src/services', '服务层目录'),
    () => checkDirectory('server/src/models', '数据模型目录'),
    () => checkDirectory('server/src/routes', '路由目录'),
    () => checkDirectory('server/src/middleware', '中间件目录'),
    () => checkDirectory('server/src/utils', '工具函数目录'),
    () => checkDirectory('server/src/config', '配置目录'),
    () => checkDirectory('server/uploads', '上传目录')
  ]
  
  backendChecks.forEach(check => {
    totalChecks++
    if (check()) passedChecks++
  })
  
  // 检查核心文件
  log('\n🔧 核心文件检查:', 'blue')
  const coreFiles = [
    ['client/src/main.js', '前端入口文件'],
    ['client/src/App.vue', '前端根组件'],
    ['client/src/router/index.js', '前端路由配置'],
    ['client/src/views/Map/index.vue', '地图主页面'],
    ['client/src/components/map/MapContainer.vue', '地图容器组件'],
    ['client/src/components/map/PanoramaModal.vue', '全景图弹窗组件'],
    ['server/src/server.js', '后端服务器入口'],
    ['server/src/app.js', '后端应用配置'],
    ['server/src/controllers/panorama.controller.js', '全景图控制器'],
    ['server/src/services/panorama.service.js', '全景图服务'],
    ['server/src/models/panorama.model.js', '全景图模型'],
    ['server/src/utils/coordinate-transform.js', '坐标转换工具']
  ]
  
  coreFiles.forEach(([file, desc]) => {
    totalChecks++
    if (checkFile(file, desc)) passedChecks++
  })
  
  // 检查脚本文件
  log('\n📜 脚本文件检查:', 'blue')
  const scriptChecks = [
    () => checkDirectory('scripts', '脚本目录'),
    () => checkFile('scripts/deploy.sh', '部署脚本'),
    () => checkFile('scripts/init-db.sql', '数据库初始化脚本')
  ]
  
  scriptChecks.forEach(check => {
    totalChecks++
    if (check()) passedChecks++
  })
  
  // 检查package.json文件
  log('\n📦 依赖配置检查:', 'blue')
  if (fs.existsSync('package.json')) {
    totalChecks++
    if (checkPackageJson('package.json', '根目录依赖')) passedChecks++
  }
  
  if (fs.existsSync('client/package.json')) {
    totalChecks++
    if (checkPackageJson('client/package.json', '前端依赖')) passedChecks++
  }
  
  if (fs.existsSync('server/package.json')) {
    totalChecks++
    if (checkPackageJson('server/package.json', '后端依赖')) passedChecks++
  }
  
  // 检查关键配置
  log('\n⚙️  配置文件内容检查:', 'blue')
  const configChecks = [
    () => {
      totalChecks++
      const result = checkFileContent('client/src/main.js', 'createApp', '前端Vue3配置')
      if (result) passedChecks++
      return result
    },
    () => {
      totalChecks++
      const result = checkFileContent('server/src/app.js', 'express', '后端Express配置')
      if (result) passedChecks++
      return result
    },
    () => {
      totalChecks++
      const result = checkFileContent('client/src/utils/coordinate.js', 'wgs84ToGcj02', '坐标转换功能')
      if (result) passedChecks++
      return result
    }
  ]
  
  configChecks.forEach(check => check())
  
  // 显示总结
  log('\n📊 检查结果总结:', 'magenta')
  log('=' * 30, 'magenta')
  
  const percentage = Math.round((passedChecks / totalChecks) * 100)
  const status = percentage >= 90 ? '优秀' : percentage >= 70 ? '良好' : percentage >= 50 ? '一般' : '需要改进'
  const statusColor = percentage >= 90 ? 'green' : percentage >= 70 ? 'yellow' : 'red'
  
  log(`总检查项: ${totalChecks}`, 'cyan')
  log(`通过项目: ${passedChecks}`, 'green')
  log(`失败项目: ${totalChecks - passedChecks}`, 'red')
  log(`完成度: ${percentage}%`, 'cyan')
  log(`项目状态: ${status}`, statusColor)
  
  // 给出建议
  log('\n💡 建议:', 'yellow')
  if (percentage >= 90) {
    log('✨ 项目结构完整，可以开始开发或部署！', 'green')
  } else if (percentage >= 70) {
    log('⚠️  项目基本完整，建议检查缺失的文件', 'yellow')
  } else {
    log('🔧 项目结构不完整，建议重新初始化项目', 'red')
  }
  
  // 快速启动提示
  if (percentage >= 70) {
    log('\n🚀 快速启动命令:', 'cyan')
    log('  ./start.sh              # 完整启动（包含数据库初始化）', 'blue')
    log('  ./start.sh --no-db      # 跳过数据库初始化', 'blue')
    log('  ./start.sh --check-only # 仅检查环境', 'blue')
  }
  
  return percentage >= 70
}

// 如果直接运行此脚本
if (require.main === module) {
  const success = checkProject()
  process.exit(success ? 0 : 1)
}

module.exports = { checkProject }