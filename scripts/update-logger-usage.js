#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// 递归获取所有JS文件
function getAllJSFiles(dir, files = []) {
    const items = fs.readdirSync(dir)

    for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
            getAllJSFiles(fullPath, files)
        } else if (item.endsWith('.js')) {
            files.push(fullPath)
        }
    }

    return files
}

// 更新文件中的console语句
function updateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    // 检查是否已经导入了Logger
    const hasLoggerImport = content.includes("require('../utils/logger')") ||
        content.includes("require('../../utils/logger')") ||
        content.includes("require('../../../utils/logger')")

    // 如果文件包含console.error但没有Logger导入，添加导入
    if (content.includes('console.error') && !hasLoggerImport) {
        // 找到最后一个require语句的位置
        const requireRegex = /const\s+\w+\s*=\s*require\([^)]+\)/g
        let lastRequireMatch
        let match

        while ((match = requireRegex.exec(content)) !== null) {
            lastRequireMatch = match
        }

        if (lastRequireMatch) {
            const insertPos = lastRequireMatch.index + lastRequireMatch[0].length

            // 计算相对路径深度
            const relativePath = path.relative(path.dirname(filePath), 'server/src/utils/logger.js')
            const loggerPath = relativePath.startsWith('.') ? relativePath : './' + relativePath

            content = content.slice(0, insertPos) +
                '\nconst Logger = require(\'' + loggerPath.replace(/\\/g, '/') + '\')' +
                content.slice(insertPos)
            modified = true
        }
    }

    // 替换console.error为Logger.error
    if (content.includes('console.error')) {
        content = content.replace(/console\.error/g, 'Logger.error')
        modified = true
    }

    // 替换console.warn为Logger.warn
    if (content.includes('console.warn')) {
        content = content.replace(/console\.warn/g, 'Logger.warn')
        modified = true
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8')
        console.log(`✅ 更新: ${filePath}`)
        return true
    }

    return false
}

// 主函数
function main() {
    console.log('🚀 开始更新Logger使用...')

    const controllersDir = 'server/src/controllers'
    const files = getAllJSFiles(controllersDir)

    let modifiedCount = 0

    for (const file of files) {
        if (updateFile(file)) {
            modifiedCount++
        }
    }

    console.log(`\n✅ 更新完成!`)
    console.log(`📊 总文件数: ${files.length}`)
    console.log(`🔧 修改文件数: ${modifiedCount}`)
    console.log('\n⚠️  请检查修改的文件，确保导入路径正确')
}

main()