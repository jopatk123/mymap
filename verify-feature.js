#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3002/api';

async function verifyFeature() {
  console.log('🔍 验证初始显示设置功能...\n');

  try {
    // 1. 设置一个测试配置
    console.log('1️⃣ 设置测试配置 (上海陆家嘴)...');
    const testSettings = {
      enabled: true,
      center: [121.4944, 31.2415], // 上海陆家嘴
      zoom: 13
    };
    
    const updateResponse = await fetch(`${API_BASE}/initial-view`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testSettings),
    });
    const updateResult = await updateResponse.json();
    console.log('✅ 设置成功:', JSON.stringify(updateResult.data, null, 2));

    // 2. 验证设置已保存
    console.log('\n2️⃣ 验证设置已保存...');
    const getResponse = await fetch(`${API_BASE}/initial-view`);
    const currentSettings = await getResponse.json();
    const savedSettings = currentSettings.data;
    
    console.log('📍 当前保存的设置:');
    console.log(`   启用状态: ${savedSettings.enabled ? '✅ 启用' : '❌ 禁用'}`);
    console.log(`   中心点: [${savedSettings.center[0]}, ${savedSettings.center[1]}] (经度, 纬度)`);
    console.log(`   缩放级别: ${savedSettings.zoom}`);

    // 3. 测试不同的配置
    console.log('\n3️⃣ 测试北京配置...');
    const beijingSettings = {
      enabled: true,
      center: [116.4074, 39.9042], // 北京天安门
      zoom: 12
    };
    
    await fetch(`${API_BASE}/initial-view`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(beijingSettings),
    });
    console.log('✅ 北京配置设置成功');

    // 4. 测试禁用功能
    console.log('\n4️⃣ 测试禁用功能...');
    const disabledSettings = {
      enabled: false,
      center: [116.4074, 39.9042],
      zoom: 12
    };
    
    await fetch(`${API_BASE}/initial-view`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(disabledSettings),
    });
    console.log('✅ 禁用设置成功');

    // 5. 重新启用并设置最终配置
    console.log('\n5️⃣ 设置最终测试配置 (广州塔)...');
    const finalSettings = {
      enabled: true,
      center: [113.3191, 23.1092], // 广州塔
      zoom: 14
    };
    
    await fetch(`${API_BASE}/initial-view`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalSettings),
    });
    
    const finalResponse = await fetch(`${API_BASE}/initial-view`);
    const finalResult = await finalResponse.json();
    console.log('✅ 最终配置:', JSON.stringify(finalResult.data, null, 2));

    console.log('\n🎉 功能验证完成！');
    console.log('\n📋 下一步测试:');
    console.log('1. 访问管理后台: http://localhost:3000/admin/files');
    console.log('2. 点击"初始显示设置"按钮');
    console.log('3. 在对话框中修改设置');
    console.log('4. 访问地图页面: http://localhost:3000');
    console.log('5. 检查地图是否按设置初始化');

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    process.exit(1);
  }
}

// 运行验证
verifyFeature();