# MySQL到SQLite迁移总结

## 迁移概述

本项目已成功从MySQL数据库迁移到SQLite，实现了零依赖部署的目标。

## 主要变更

### 1. 数据库系统
- **原来**: MySQL 8.0 + Docker容器
- **现在**: SQLite 3 + 本地文件存储
- **数据库文件**: `server/data/panorama_map.db`

### 2. 依赖变更
```json
// 移除
"mysql2": "^3.14.3"

// 新增
"sqlite3": "^5.1.6",
"sqlite": "^4.2.1"
```

### 3. 配置简化
```env
# 原来的MySQL配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=asd123123123
DB_NAME=panorama_map

# 现在的SQLite配置
DB_PATH=./data/panorama_map.db
```

### 4. 新增文件
- `server/src/utils/sqlite-adapter.js` - SQLite适配器
- `server/src/utils/sqlite-helper.js` - SQLite辅助函数
- `server/init-sqlite-data.js` - 数据库初始化脚本
- `server/check-database.js` - 数据库状态检查工具
- `DEPLOYMENT.md` - 简化的部署指南
- `start.sh` - 一键启动脚本

### 5. 删除的文件
- `auto-install-mysql.sh` - MySQL自动安装脚本
- `manage-database.sh` - MySQL管理脚本
- `scripts/unified-database.sql` - MySQL数据库脚本
- `scripts/migrate-config-to-files.js` - 配置迁移脚本
- `scripts/verify-refactor.js` - 重构验证脚本
- `scripts/deploy.sh` - 部署脚本
- `update_schema.sql` - 数据库更新脚本
- `init-default-folder.sql` - 默认文件夹初始化脚本

## 技术实现

### SQLite适配器
创建了`SQLiteAdapter`类来提供与MySQL兼容的接口：
- 自动转换MySQL语法到SQLite
- 处理boolean字段转换（SQLite使用INTEGER 0/1）
- 统一的查询接口

### 数据类型映射
| MySQL | SQLite | 说明 |
|-------|--------|------|
| INT AUTO_INCREMENT | INTEGER PRIMARY KEY AUTOINCREMENT | 自增主键 |
| VARCHAR(n) | TEXT | 文本字段 |
| DECIMAL(m,n) | REAL | 浮点数 |
| BOOLEAN | INTEGER | 0/1表示false/true |
| TIMESTAMP | DATETIME | 时间戳 |
| JSON | TEXT | JSON存储为文本 |

### 索引优化
保持了原有的索引结构，确保查询性能：
- 地理坐标索引
- 文件夹关联索引
- 可见性过滤索引
- 创建时间排序索引

## 部署优势

### 1. 零依赖部署
- 不需要安装MySQL数据库
- 不需要Docker容器
- 数据库文件随项目一起部署

### 2. 简化运维
- 数据库备份 = 复制一个文件
- 数据迁移 = 移动数据库文件
- 环境隔离 = 不同的数据库文件

### 3. 开发友好
- 本地开发无需额外配置
- 数据库状态一目了然
- 调试更加方便

## 性能考虑

### 适用场景
✅ **适合**:
- 用户量少（< 1000并发）
- 数据量小（< 100万条记录）
- 读多写少的应用
- 单机部署

❌ **不适合**:
- 高并发写入
- 大数据量分析
- 分布式部署
- 复杂事务处理

### 当前项目评估
根据项目需求（地图全景系统，用户量少，数据量不大），SQLite完全满足需求。

## 启动方式

### 快速启动
```bash
./start.sh
```

### 手动启动
```bash
npm run install:all
cd server && node init-sqlite-data.js && cd ..
npm run dev
```

### 仅初始化数据库
```bash
./start.sh --init-only
```

### 检查数据库状态
```bash
cd server && node check-database.js
```

## 数据迁移

如果需要从现有MySQL数据迁移到SQLite：

1. 导出MySQL数据
2. 转换数据格式
3. 导入到SQLite
4. 验证数据完整性

## 总结

本次迁移成功实现了：
- ✅ 零依赖部署
- ✅ 简化运维复杂度
- ✅ 保持功能完整性
- ✅ 提升开发体验
- ✅ 降低部署门槛

项目现在可以在任何支持Node.js的环境中快速部署，无需额外的数据库安装和配置。