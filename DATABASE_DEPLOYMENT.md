# 数据库部署和管理指南

## 概述

本项目已经整合了所有数据库文件，使用统一的MySQL数据库方案。旧的SQLite数据库文件（`data.db`, `mymap.db`）已被删除，现在使用 `scripts/unified-database.sql` 作为统一的数据库脚本。

## 数据库结构

统一数据库包含以下表：

- **folders**: 文件夹管理表
- **panoramas**: 全景图数据表
- **video_points**: 视频点位表
- **kml_files**: KML文件表
- **kml_points**: KML点位数据表

## 快速开始

### 1. 自动部署数据库

```bash
# 首次部署或使用现有容器
./auto-install-mysql.sh

# 重建数据库（删除所有数据重新创建）
./auto-install-mysql.sh --rebuild
```

### 2. 数据库管理

```bash
# 查看数据库状态
./database-manager.sh status

# 备份数据库
./database-manager.sh backup

# 恢复数据库
./database-manager.sh restore backups/panorama_map_20240101_120000.sql

# 清理数据库（保留结构，删除数据）
./database-manager.sh clean

# 连接数据库
./database-manager.sh connect
```

## 部署脚本功能

### auto-install-mysql.sh

**主要功能：**
- 自动检测和安装Docker
- 创建MySQL容器
- 初始化数据库结构和示例数据
- 支持重建数据库功能
- 自动更新环境配置

**参数：**
- `--rebuild` 或 `-r`: 重建数据库

**配置信息：**
- 容器名称: `mysql-panorama`
- 数据库名: `panorama_map`
- 用户名: `root`
- 密码: `asd123123123`
- 端口: `3306`

### database-manager.sh

**主要功能：**
- 查看数据库状态和统计信息
- 备份和恢复数据库
- 清理数据库数据
- 连接数据库进行手动操作

## 数据库配置

数据库连接配置在 `server/.env` 文件中：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=asd123123123
DB_NAME=panorama_map
```

## 常用Docker命令

```bash
# 查看容器状态
docker ps

# 查看容器日志
docker logs mysql-panorama

# 重启容器
docker restart mysql-panorama

# 停止容器
docker stop mysql-panorama

# 删除容器（注意：会丢失数据）
docker rm mysql-panorama
```

## 故障排除

### 1. 端口占用问题

如果3306端口被占用：

```bash
# 查看端口占用
netstat -tlnp | grep :3306

# 停止占用进程
sudo kill -9 <PID>
```

### 2. 容器启动失败

```bash
# 查看容器日志
docker logs mysql-panorama

# 删除容器重新创建
docker rm mysql-panorama
./auto-install-mysql.sh
```

### 3. 数据库连接失败

1. 检查容器是否运行：`docker ps`
2. 检查密码是否正确
3. 等待容器完全启动（约30秒）

## 数据迁移

如果需要从旧的SQLite数据库迁移数据，请：

1. 先备份旧数据
2. 运行新的MySQL部署脚本
3. 手动导入需要的数据

## 开发建议

1. **定期备份**：使用 `./database-manager.sh backup` 定期备份数据
2. **测试环境**：使用 `--rebuild` 参数快速重置测试数据
3. **监控日志**：定期检查容器日志确保数据库正常运行

## 安全注意事项

1. 生产环境请修改默认密码
2. 考虑使用环境变量管理敏感信息
3. 定期更新MySQL镜像版本
4. 配置防火墙限制数据库访问

---

**注意**：本脚本适用于开发和测试环境。生产环境部署请根据实际需求调整配置。