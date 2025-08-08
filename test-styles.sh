#!/bin/bash

echo "🚀 启动样式调试测试..."

# 检查服务器是否运行
if ! pgrep -f "node.*server" > /dev/null; then
    echo "📡 启动服务器..."
    cd server && npm start &
    SERVER_PID=$!
    sleep 3
    echo "✅ 服务器已启动 (PID: $SERVER_PID)"
else
    echo "✅ 服务器已在运行"
fi

# 检查客户端是否运行
if ! pgrep -f "vite.*client" > /dev/null; then
    echo "🌐 启动客户端..."
    cd client && npm run dev &
    CLIENT_PID=$!
    sleep 3
    echo "✅ 客户端已启动 (PID: $CLIENT_PID)"
else
    echo "✅ 客户端已在运行"
fi

echo ""
echo "🔧 测试信息:"
echo "   - 服务器地址: http://localhost:3002"
echo "   - 客户端地址: http://localhost:3000"
echo "   - 样式调试页面: http://localhost:3000/debug/styles"
echo ""
echo "📝 测试步骤:"
echo "   1. 打开浏览器访问样式调试页面"
echo "   2. 查看控制台输出的调试信息"
echo "   3. 点击'测试样式更新'按钮"
echo "   4. 观察样式是否正确更新和同步"
echo ""
echo "🔍 如果发现问题，请检查:"
echo "   - 浏览器控制台的错误信息"
echo "   - 服务器日志输出"
echo "   - 配置文件 server/config/app-config.json 的变化"
echo ""

# 运行服务器端测试
echo "🧪 运行服务器端配置测试..."
cd server && node test-point-styles.js

echo ""
echo "✅ 测试环境已准备就绪！"
echo "   请访问 http://localhost:3000/debug/styles 进行前端测试"