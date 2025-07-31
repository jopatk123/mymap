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
          console.log('✅ 服务器健康检查通过:', response.message)
          resolve(response)
        } catch (error) {
          console.log('❌ 响应解析失败:', error.message)
          reject(error)
        }
      })
    })
    
    req.on('error', (error) => {
      console.log('❌ 服务器连接失败:', error.message)
      reject(error)
    })
    
    req.setTimeout(5000, () => {
      console.log('❌ 请求超时')
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    req.end()
  })
}

// 测试API端点
async function testAPI() {
  try {
    console.log('🚀 开始测试服务器...')
    
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
          console.log('✅ 全景图API测试通过，返回数据条数:', response.data?.data?.length || 0)
        } catch (error) {
          console.log('❌ 全景图API响应解析失败:', error.message)
        }
      })
    })
    
    panoramasReq.on('error', (error) => {
      console.log('❌ 全景图API请求失败:', error.message)
    })
    
    panoramasReq.end()
    
  } catch (error) {
    console.log('❌ 测试失败:', error.message)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testAPI()
}

module.exports = { testServer, testAPI }