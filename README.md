# 🗺️ 地图全景系统

> 一个现代化的地图全景查看系统，支持360°全景图管理和多坐标系精确转换

[![Demo](https://img.shields.io/badge/🚀-在线演示-blue)]() 
[![Quick Start](https://img.shields.io/badge/⚡-快速开始-green)](#快速开始)
[![License](https://img.shields.io/badge/📄-MIT-orange)](LICENSE)

## ✨ 核心特性

🗺️ **智能地图** - 基于Leaflet的交互式地图，集成高德地图瓦片  
📸 **全景管理** - 拖拽上传、批量处理、智能缩略图生成  
🔄 **坐标转换** - 支持WGS84、GCJ02、BD09坐标系无缝转换  
🌐 **沉浸体验** - 基于Pannellum的流畅360°全景查看  
📱 **全端适配** - 响应式设计，完美支持桌面和移动设备  

## 🚀 快速开始

```bash
# 克隆项目
git clone <repository-url>
cd mymap

# 一键启动（推荐）
./start.sh

# 或者手动启动
npm run install:all
cd server && node init-sqlite-data.js && cd ..
npm run dev
```

启动完成后访问：http://localhost:3000

### 🔧 故障排除

如果遇到端口冲突错误：
```bash
# 验证项目设置
node verify-setup.js

# 清理端口并重新启动
pkill -f "vite\|nodemon" && ./start.sh --no-deps
```

> 📋 更多部署选项请查看 [DEPLOYMENT.md](DEPLOYMENT.md)

## 🛠️ 技术架构

**前端**: Vue 3 + Vite + Pinia + Element Plus + Leaflet + Pannellum  
**后端**: Node.js + Express + SQLite + Sharp  
**特色**: 零依赖部署、一键启动、坐标系转换、图片处理

## 📸 功能预览

- 🗺️ [地图浏览] - 交互式地图界面，支持标记点查看
- 📷 [全景查看] - 360°沉浸式全景图体验  
- 🔧 [管理后台] - 全景图批量管理、文件夹组织
- 📱 [移动端] - 响应式设计，移动设备完美适配

## 📚 文档链接

📖 [快速启动指南](QUICK_START.md) - 详细部署和配置说明  
🔧 [API文档](server/README.md) - 后端接口文档  
🎨 [前端组件](client/README.md) - 组件使用说明  
🛠️ [开发指南](docs/DEVELOPMENT.md) - 开发环境搭建

