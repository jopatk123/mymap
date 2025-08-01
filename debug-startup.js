#!/usr/bin/env node

// 调试启动脚本 - 检查各个组件是否正常

const fs = require('fs');
const path = require('path');

console.log('🔍 开始调试地图项目启动问题...\n');

// 检查文件存在性
const checkFile = (filePath, description) => {
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
};

// 检查目录存在性
const checkDir = (dirPath, description) => {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  console.log(`${exists ? '✅' : '❌'} ${description}: ${dirPath}`);
  return exists;
};

console.log('📁 检查项目结构:');
checkDir('client', '前端目录');
checkDir('server', '后端目录');
checkDir('client/src', '前端源码目录');
checkDir('server/src', '后端源码目录');

console.log('\n📦 检查依赖安装:');
checkDir('client/node_modules', '前端依赖');
checkDir('server/node_modules', '后端依赖');
checkDir('node_modules', '根目录依赖');

console.log('\n🔧 检查配置文件:');
checkFile('client/package.json', '前端package.json');
checkFile('server/package.json', '后端package.json');
checkFile('package.json', '根package.json');
checkFile('server/.env', '后端环境配置');

console.log('\n🎨 检查样式文件:');
checkFile('client/src/assets/styles/variables.scss', '样式变量文件');

console.log('\n🧩 检查关键组件:');
checkFile('client/src/views/Map/index.vue', '地图页面组件');
checkFile('client/src/components/map/MapContainer.vue', '地图容器组件');
checkFile('client/src/components/map/PanoramaModal.vue', '全景图模态框');
checkFile('client/src/components/common/UploadDialog.vue', '上传对话框');
checkFile('client/src/components/common/SettingsDialog.vue', '设置对话框');

console.log('\n🏪 检查状态管理:');
checkFile('client/src/store/app.js', '应用状态管理');
checkFile('client/src/store/panorama.js', '全景图状态管理');

console.log('\n🌐 检查后端文件:');
checkFile('server/src/server.js', '后端服务器文件');
checkFile('server/src/config/database.js', '数据库配置');
checkFile('server/src/config/index.js', '主配置文件');

console.log('\n📋 检查启动脚本:');
checkFile('start.sh', '主启动脚本');
checkFile('start-frontend-only.sh', '前端启动脚本');

// 检查package.json脚本
console.log('\n🚀 检查启动脚本配置:');
try {
  const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('✅ 根目录scripts:', Object.keys(rootPkg.scripts || {}));
  
  const clientPkg = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));
  console.log('✅ 前端scripts:', Object.keys(clientPkg.scripts || {}));
  
  const serverPkg = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
  console.log('✅ 后端scripts:', Object.keys(serverPkg.scripts || {}));
} catch (error) {
  console.log('❌ 读取package.json失败:', error.message);
}

console.log('\n💡 建议的调试步骤:');
console.log('1. 先尝试仅启动前端: ./start-frontend-only.sh');
console.log('2. 检查浏览器控制台是否有错误');
console.log('3. 确认MySQL服务是否运行: sudo systemctl status mysql');
console.log('4. 检查端口占用: lsof -i :3000 && lsof -i :3001');
console.log('5. 查看完整错误日志');

console.log('\n🔍 调试完成！');