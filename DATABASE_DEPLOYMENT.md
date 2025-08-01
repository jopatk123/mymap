# 数据库部署指南

## 🚀 快速开始

### 一键部署
```bash
# 智能检测并部署MySQL数据库
./auto-install-mysql.sh
```

这个脚本会：
- ✅ 自动检测现有的Docker MySQL容器
- ✅ 如果容器存在但停止，自动启动
- ✅ 如果容器不存在，自动创建新容器
- ✅ 自动初始化数据库结构和示例数据
- ✅ 自动更新项目环境配置
- ✅ 如果Docker未安装，提供安装指导

## 📋 管理脚本

### 数据库状态管理
```bash
# 检查数据库状态
./manage-database.sh status

# 启动数据库
./manage-database.sh start

# 停止数据库
./manage-database.sh stop

# 重启数据库
./manage-database.sh restart

# 查看数据库日志
./manage-database.sh logs

# 连接数据库
./manage-database.sh connect

# 备份数据库
./manage-database.sh backup

# 重置数据库（危险操作）
./manage-database.sh reset
```

### Node.js 数据库检查
```bash
# 详细的数据库连接和数据检查
cd server && node check-database.js
```

## 🔧 配置信息

### 默认配置
- **容器名称**: mysql-panorama
- **数据库名**: panorama_map
- **用户名**: root
- **密码**: asd123123123
- **端口**: 3306

### 环境文件
配置会自动更新到 `server/.env` 文件中：
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=asd123123123
DB_NAME=panorama_map
```

## 📊 数据库结构

### 主要数据表
1. **panoramas** - 全景图数据表
   - id: 主键
   - title: 标题
   - description: 描述
   - image_url: 图片URL
   - latitude/longitude: GPS坐标
   - created_at/updated_at: 时间戳

2. **users** - 用户表（预留扩展）
   - id: 主键
   - username: 用户名
   - email: 邮箱
   - password_hash: 密码哈希

### 示例数据
系统会自动导入5个北京地标的全景图数据：
- 天安门广场
- 故宫太和殿
- 颐和园昆明湖
- 长城八达岭
- 鸟巢体育场

## 🛠️ 故障排除

### 常见问题

#### 1. Docker未安装
```bash
# 脚本会自动提示安装Docker
# Ubuntu/Debian:
sudo apt update && sudo apt install docker.io

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker
```

#### 2. 端口被占用
```bash
# 查看端口占用
sudo netstat -tlnp | grep 3306

# 停止占用进程或更改端口配置
```

#### 3. 容器启动失败
```bash
# 查看容器日志
docker logs mysql-panorama

# 删除问题容器重新创建
docker rm mysql-panorama
./auto-install-mysql.sh
```

#### 4. 数据库连接失败
```bash
# 检查容器状态
docker ps

# 重启容器
docker restart mysql-panorama

# 等待MySQL完全启动（约10-15秒）
```

#### 5. 数据丢失或损坏
```bash
# 重置数据库（会删除所有数据）
./manage-database.sh reset

# 或者重新部署
docker rm mysql-panorama
./auto-install-mysql.sh
```

## 🔍 验证部署

### 检查容器状态
```bash
docker ps
# 应该看到 mysql-panorama 容器在运行
```

### 检查数据库连接
```bash
cd server && node check-database.js
# 应该显示连接成功和数据统计
```

### 手动连接数据库
```bash
docker exec -it mysql-panorama mysql -u root -pasd123123123 panorama_map
```

### 查看数据
```sql
-- 查看所有表
SHOW TABLES;

-- 查看全景图数据
SELECT title, latitude, longitude FROM panoramas;

-- 查看数据统计
SELECT COUNT(*) as total FROM panoramas;
```

## 🚀 启动项目

数据库部署完成后，可以启动项目：

```bash
# 一键启动项目（前台模式）
./start.sh

# 或者后台模式启动
./start.sh background

# 查看项目状态
./start.sh status

# 停止项目
./start.sh stop
```

## 📝 备份和恢复

### 备份数据库
```bash
# 使用管理脚本备份
./manage-database.sh backup

# 手动备份
docker exec mysql-panorama mysqldump -u root -pasd123123123 panorama_map > backup.sql
```

### 恢复数据库
```bash
# 从备份文件恢复
docker exec -i mysql-panorama mysql -u root -pasd123123123 panorama_map < backup.sql
```

## 🔄 更新和维护

### 更新数据库结构
1. 修改 `setup-mysql.sql` 文件
2. 运行 `./manage-database.sh reset` 重置数据库
3. 或者手动执行SQL更新语句

### 容器维护
```bash
# 查看容器资源使用
docker stats mysql-panorama

# 清理容器日志
docker logs mysql-panorama --tail=0 -f > /dev/null &

# 更新MySQL镜像
docker pull mysql:8.0
docker stop mysql-panorama
docker rm mysql-panorama
./auto-install-mysql.sh
```

---

## 📞 技术支持

如果遇到问题，请：
1. 查看容器日志：`docker logs mysql-panorama`
2. 运行状态检查：`./manage-database.sh status`
3. 检查详细连接：`cd server && node check-database.js`
4. 查看本文档的故障排除部分