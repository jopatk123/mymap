#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// 需要清理的文件模式
const patterns = [
  'client/src/**/*.{js,vue,ts}',
  'server/src/**/*.{js,ts}',
  '*.js'
]

// 排除的文件
const excludePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  'scripts/clean-debug-logs.js'
]

// 需要保留的console方法（错误和警告）
const keepMethods = ['error', 'warn']

// 需要清理的console方法
const cleanMethods = ['log', 'debug', 'info', 'trace']

function shouldKeepLine(line) {
  // 保留错误和警告日志
  for (const method of keepMethods) {
    if (line.includes(`console.${method}`)) {
      return true
    }
  }
  
  // 保留生产环境条件判断的日志
  if (line.includes('NODE_ENV') || line.includes('process.env')) {
    return true
  }
  
  return false
}

function cleanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    let modified = false
    
    const cleanedLines = lines.filter(line => {
      const trimmed = line.trim()
      
      // 检查是否是需要清理的console调用
      for (const method of cleanMethods) {
        if (trimmed.includes(`console.${method}`) && !shouldKeepLine(line)) {
          console.log(`🧹 清理: ${filePath} - ${trimmed.substring(0, 50)}...`)
          modified = true
          return false
        }
      }
      
      return true
    })
    
    if (modified) {
      fs.writeFileSync(filePath, cleanedLines.join('\n'), 'utf8')
      return true
    }
    
    return false
  } catch (error) {
    console.error(`❌ 处理文件失败 ${filePath}:`, error.message)
    return false
  }
}

function main() {
  console.log('🚀 开始清理调试日志...')
  
  let totalFiles = 0
  let modifiedFiles = 0
  
  for (const pattern of patterns) {
    const files = glob.sync(pattern, { 
      ignore: excludePatterns,
      absolute: true 
    })
    
    for (const file of files) {
      totalFiles++
      if (cleanFile(file)) {
        modifiedFiles++
      }
    }
  }
  
  console.log(`\n✅ 清理完成!`)
  console.log(`📊 总文件数: ${totalFiles}`)
  console.log(`🔧 修改文件数: ${modifiedFiles}`)
  
  if (modifiedFiles > 0) {
    console.log('\n⚠️  请检查修改的文件，确保没有误删重要的日志')
  }
}

// 检查是否安装了glob
try {
  require('glob')
} catch (error) {
  console.error('❌ 请先安装glob: npm install glob')
  process.exit(1)
}

main()