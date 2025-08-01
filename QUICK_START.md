# 🚀 快速启动指南

## 一键启动

```bash
# 克隆项目后，直接运行
./start.sh
```

这个命令会自动：
- ✅ 检查 Node.js 和 npm 环境
- ✅ 安装前后端依赖
- ✅ 自动部署 MySQL 数据库（Docker容器）
- ✅ 初始化数据库结构和示例数据
- ✅ 启动前后端服务
- ✅ 在浏览器中打开 http://localhost:3000

## 🎯 项目管理命令

### 启动项目
```bash
./start.sh              # 前台模式启动（推荐开发时使用）
./start.sh background    # 后台模式启动（推荐生产环境）
```

### 管理项目
```bash
./start.sh status        # 查看项目状态
./start.sh stop          # 停止项目
./start.sh restart       # 重启项目
```

### 环境检查
```bash
./start.sh check         # 检查环境和依赖
./start.sh install       # 仅安装依赖
```

## 🗄️ 数据库管理

### 数据库状态
```bash
./manage-database.sh status    # 查看数据库状态
./manage-database.sh logs      # 查看数据库日志
```

### 数据库操作
```bash
./manage-database.sh start     # 启动数据库
./manage-database.sh stop      # 停止数据库
./manage-database.sh restart   # 重启数据库
./manage-database.sh connect   # 连接数据库
```

### 数据管理
```bash
./manage-database.sh backup    # 备份数据库
./manage-database.sh reset     # 重置数据库（危险操作）
```

## 🌐 访问地址

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:3001
- **数据库**: localhost:3306 (容器内部)

## 📋 默认配置

- **数据库名**: panorama_map
- **用户名**: root
- **密码**: asd123123123
- **容器名**: mysql-panorama

## 🔧 故障排除

### 端口被占用
```bash
# 查看端口占用
sudo netstat -tlnp | grep 3000
sudo netstat -tlnp | grep 3001

# 停止项目后重新启动
./start.sh stop
./start.sh
```

### 数据库连接失败
```bash
# 检查数据库状态
./manage-database.sh status

# 重启数据库
./manage-database.sh restart

# 重新部署数据库
./auto-install-mysql.sh
```

### 依赖安装失败
```bash
# 清理依赖重新安装
rm -rf client/node_modules server/node_modules
./start.sh install
```

## 📝 开发模式

### 查看日志
```bash
# 实时查看后端日志
tail -f server.log

# 实时查看前端日志
tail -f client.log

# 查看数据库日志
./manage-database.sh logs
```

### 调试模式
```bash
# 前台启动可以看到实时日志
./start.sh

# 或者分别启动前后端
cd server && npm run dev    # 终端1
cd client && npm run dev    # 终端2
```

## 🎉 完成！

项目启动后，打开浏览器访问 http://localhost:3000 即可看到地图全景系统界面。

系统已预装了5个北京地标的全景图数据，可以直接体验功能。