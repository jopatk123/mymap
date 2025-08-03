#!/usr/bin/env node

// 调试启动脚本 - 检查各个组件是否正常

const fs = require('fs');
const path = require('path');


// 检查文件存在性
const checkFile = (filePath, description) => {
  const exists = fs.existsSync(filePath);
  return exists;
};

// 检查目录存在性
const checkDir = (dirPath, description) => {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  return exists;
};

checkDir('client', '前端目录');
checkDir('server', '后端目录');
checkDir('client/src', '前端源码目录');
checkDir('server/src', '后端源码目录');

checkDir('client/node_modules', '前端依赖');
checkDir('server/node_modules', '后端依赖');
checkDir('node_modules', '根目录依赖');

checkFile('client/package.json', '前端package.json');
checkFile('server/package.json', '后端package.json');
checkFile('package.json', '根package.json');
checkFile('server/.env', '后端环境配置');

checkFile('client/src/assets/styles/variables.scss', '样式变量文件');

checkFile('client/src/views/Map/index.vue', '地图页面组件');
checkFile('client/src/components/map/MapContainer.vue', '地图容器组件');
checkFile('client/src/components/map/PanoramaModal.vue', '全景图模态框');
checkFile('client/src/components/common/UploadDialog.vue', '上传对话框');
checkFile('client/src/components/common/SettingsDialog.vue', '设置对话框');

checkFile('client/src/store/app.js', '应用状态管理');
checkFile('client/src/store/panorama.js', '全景图状态管理');

checkFile('server/src/server.js', '后端服务器文件');
checkFile('server/src/config/database.js', '数据库配置');
checkFile('server/src/config/index.js', '主配置文件');

checkFile('start.sh', '主启动脚本');
checkFile('start-frontend-only.sh', '前端启动脚本');

// 检查package.json脚本
try {
  const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const clientPkg = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));
  
  const serverPkg = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
} catch (error) {
}

