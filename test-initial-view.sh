#!/bin/bash

echo "=== 测试初始显示设置 API ==="

echo "1. 测试获取初始设置："
curl -s http://localhost:3002/api/initial-view | python3 -m json.tool || echo "API调用失败"

echo -e "\n2. 测试更新初始设置（启用上海位置）："
curl -s -X PUT -H "Content-Type: application/json" \
     -d '{"enabled":true,"center":[121.4737,31.2304],"zoom":14}' \
     http://localhost:3002/api/initial-view | python3 -m json.tool || echo "更新API调用失败"

echo -e "\n3. 测试再次获取设置验证更新："
curl -s http://localhost:3002/api/initial-view | python3 -m json.tool || echo "获取更新后设置失败"

echo -e "\n4. 测试重置设置："
curl -s -X POST http://localhost:3002/api/initial-view/reset | python3 -m json.tool || echo "重置API调用失败"

echo -e "\n=== 测试完成 ==="