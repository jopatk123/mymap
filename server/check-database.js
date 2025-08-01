#!/usr/bin/env node

const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

// 配置
const config = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'asd123123123',
  database: 'panorama_map',
  containerName: 'mysql-panorama'
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red
  };
  
  console.log(`${colorMap[level]}[${level.toUpperCase()}]${colors.reset} ${timestamp} ${message}`);
}

// 检查Docker容器状态
function checkDockerContainer() {
  try {
    const result = execSync(`docker ps --format "table {{.Names}}" | grep "^${config.containerName}$"`, { encoding: 'utf8' });
    return result.trim() === config.containerName;
  } catch (error) {
    return false;
  }
}

// 检查容器是否存在（包括停止的）
function checkContainerExists() {
  try {
    const result = execSync(`docker ps -a --format "table {{.Names}}" | grep "^${config.containerName}$"`, { encoding: 'utf8' });
    return result.trim() === config.containerName;
  } catch (error) {
    return false;
  }
}

// 获取容器状态
function getContainerStatus() {
  try {
    const status = execSync(`docker inspect --format='{{.State.Status}}' ${config.containerName}`, { encoding: 'utf8' }).trim();
    return status;
  } catch (error) {
    return null;
  }
}

// 启动容器
function startContainer() {
  try {
    execSync(`docker start ${config.containerName}`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

// 检查数据库连接和数据
async function checkDatabase() {
  try {
    log('info', '检查数据库连接...');
    
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 10000
    });

    log('success', '数据库连接成功！');

    // 检查数据库信息
    const [dbInfo] = await connection.query('SELECT DATABASE() as db_name, VERSION() as version');
    log('info', `数据库: ${dbInfo[0].db_name}, 版本: ${dbInfo[0].version}`);

    // 检查表
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    log('info', `数据表 (${tableNames.length}): ${tableNames.join(', ')}`);

    // 检查各表数据量
    for (const tableName of tableNames) {
      try {
        const [count] = await connection.query(`SELECT COUNT(*) as total FROM ${tableName}`);
        log('info', `${tableName} 表: ${count[0].total} 条记录`);
      } catch (error) {
        log('warning', `无法查询 ${tableName} 表: ${error.message}`);
      }
    }

    // 检查全景图示例数据
    if (tableNames.includes('panoramas')) {
      const [samples] = await connection.query('SELECT title, latitude, longitude FROM panoramas LIMIT 3');
      if (samples.length > 0) {
        log('info', '示例全景图数据:');
        samples.forEach(row => {
          console.log(`   📍 ${row.title} (${row.latitude}, ${row.longitude})`);
        });
      }
    }

    await connection.end();
    log('success', '数据库检查完成！');
    return true;
    
  } catch (error) {
    log('error', `数据库连接失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  console.log('=== 🔍 数据库状态检查 ===\n');
  
  // 1. 检查Docker容器
  log('info', '检查Docker容器状态...');
  
  if (!checkContainerExists()) {
    log('error', `MySQL容器 ${config.containerName} 不存在`);
    console.log('\n💡 解决方案:');
    console.log('1. 运行部署脚本: ./auto-install-mysql.sh');
    console.log('2. 或手动创建容器');
    process.exit(1);
  }
  
  const containerStatus = getContainerStatus();
  log('info', `容器状态: ${containerStatus}`);
  
  if (containerStatus !== 'running') {
    if (containerStatus === 'exited') {
      log('warning', '容器已停止，尝试启动...');
      if (startContainer()) {
        log('success', '容器启动成功');
        // 等待MySQL完全启动
        log('info', '等待MySQL服务启动...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        log('error', '容器启动失败');
        process.exit(1);
      }
    } else {
      log('error', `容器状态异常: ${containerStatus}`);
      process.exit(1);
    }
  } else {
    log('success', 'MySQL容器运行正常');
  }
  
  // 2. 检查数据库连接和数据
  const dbOk = await checkDatabase();
  
  if (dbOk) {
    console.log('\n=== ✅ 数据库就绪 ===');
    console.log('🚀 可以启动项目了！');
    
    console.log('\n📋 管理命令:');
    console.log('  查看容器: docker ps');
    console.log('  查看日志: docker logs mysql-panorama');
    console.log('  连接数据库: docker exec -it mysql-panorama mysql -u root -pasd123123123 panorama_map');
    console.log('  管理脚本: ./manage-database.sh status');
  } else {
    console.log('\n=== ❌ 数据库异常 ===');
    console.log('\n💡 解决方案:');
    console.log('1. 查看容器日志: docker logs mysql-panorama');
    console.log('2. 重启容器: docker restart mysql-panorama');
    console.log('3. 重新部署: ./auto-install-mysql.sh');
    console.log('4. 使用管理脚本: ./manage-database.sh restart');
    process.exit(1);
  }
}

// 运行主函数
main().catch(error => {
  log('error', `脚本执行失败: ${error.message}`);
  process.exit(1);
});