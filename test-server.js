// 简单的服务器测试脚本
const http = require('http')

// 测试服务器是否启动
function testServer(port = 3001) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/api/health',
      method: 'GET'
    }, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          resolve(response)
        } catch (error) {
          reject(error)
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    req.end()
  })
}

// 测试API端点
async function testAPI() {
  try {
    
    // 测试健康检查
    await testServer()
    
    // 测试全景图API
    const panoramasReq = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/panoramas',
      method: 'GET'
    }, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
        } catch (error) {
        }
      })
    })
    
    panoramasReq.on('error', (error) => {
    })
    
    panoramasReq.end()
    
  } catch (error) {
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testAPI()
}

module.exports = { testServer, testAPI }