<template>
  <div class="style-debug-panel">
    <h3>🔧 点位样式调试面板</h3>

    <div class="debug-section">
      <h4>📊 当前样式状态</h4>
      <div class="style-info">
        <div class="style-group">
          <h5>🎥 视频点位样式</h5>
          <div class="style-details">
            <p><strong>Composable中的样式:</strong></p>
            <pre>{{ JSON.stringify(videoPointStyles, null, 2) }}</pre>
            <p><strong>全局变量中的样式:</strong></p>
            <pre>{{ JSON.stringify(globalVideoStyles, null, 2) }}</pre>
          </div>
        </div>

        <div class="style-group">
          <h5>🌐 全景图点位样式</h5>
          <div class="style-details">
            <p><strong>Composable中的样式:</strong></p>
            <pre>{{ JSON.stringify(panoramaPointStyles, null, 2) }}</pre>
            <p><strong>全局变量中的样式:</strong></p>
            <pre>{{ JSON.stringify(globalPanoramaStyles, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <div class="debug-section">
      <h4>🧪 测试操作</h4>
      <div class="test-buttons">
        <button :disabled="loading" @click="loadStyles">
          {{ loading ? '加载中...' : '重新加载样式' }}
        </button>
        <button @click="syncGlobalStyles">同步全局样式</button>
        <button @click="testStyleUpdate">测试样式更新</button>
        <button @click="handleClearCache">清除缓存</button>
      </div>
    </div>

    <div class="debug-section">
      <h4>📝 操作日志</h4>
      <div class="log-container">
        <div v-for="(log, index) in logs" :key="index" class="log-item">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { usePointStyles } from '@/composables/use-point-styles.js';
import styleManager from '@/utils/style-manager.js';

const {
  loading,
  videoPointStyles,
  panoramaPointStyles,
  loadAllPointStyles,
  updateVideoPointStyles,
  updatePanoramaPointStyles,
  syncGlobalStyles,
  clearCache,
} = usePointStyles();

const logs = ref([]);

// 计算全局样式变量
const globalVideoStyles = computed(() => {
  return window.videoPointStyles || {};
});

const globalPanoramaStyles = computed(() => {
  return window.panoramaPointStyles || {};
});

// 添加日志
const addLog = (message) => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    message,
  });
  // 只保留最近20条日志
  if (logs.value.length > 20) {
    logs.value = logs.value.slice(0, 20);
  }
};

// 加载样式
const loadStyles = async () => {
  try {
    addLog('开始加载样式配置...');
    await styleManager.refresh();
    await loadAllPointStyles(false); // 强制从服务器加载
    addLog('✅ 样式配置加载成功');
  } catch (error) {
    addLog(`❌ 样式配置加载失败: ${error.message}`);
  }
};

// 测试样式更新
const testStyleUpdate = async () => {
  try {
    addLog('开始测试样式更新...');

    // 测试更新视频点位样式
    const newVideoStyle = {
      point_color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      point_size: Math.floor(Math.random() * 10) + 8,
    };

    await updateVideoPointStyles(newVideoStyle);
    addLog(
      `✅ 视频点位样式更新成功: 颜色=${newVideoStyle.point_color}, 大小=${newVideoStyle.point_size}`
    );

    // 测试更新全景图点位样式
    const newPanoramaStyle = {
      point_color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      point_size: Math.floor(Math.random() * 10) + 8,
    };

    await updatePanoramaPointStyles(newPanoramaStyle);
    addLog(
      `✅ 全景图点位样式更新成功: 颜色=${newPanoramaStyle.point_color}, 大小=${newPanoramaStyle.point_size}`
    );
  } catch (error) {
    addLog(`❌ 样式更新测试失败: ${error.message}`);
  }
};

// 清除缓存
const handleClearCache = () => {
  clearCache();
  addLog('🗑️ 本地缓存已清除');
};

onMounted(() => {
  addLog('🚀 样式调试面板已加载');
  loadStyles();
});
</script>

<style scoped>
.style-debug-panel {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  margin: 20px;
  font-family: monospace;
}

.debug-section {
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.style-group {
  margin-bottom: 15px;
}

.style-details {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.style-details pre {
  margin: 5px 0;
  font-size: 12px;
  background: #fff;
  padding: 8px;
  border-radius: 3px;
  border: 1px solid #ddd;
  overflow-x: auto;
}

.test-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.test-buttons button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.test-buttons button:hover {
  background: #0056b3;
}

.test-buttons button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.log-item {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
}

.log-time {
  color: #6c757d;
  margin-right: 10px;
}

.log-message {
  color: #333;
}

h3,
h4,
h5 {
  margin-top: 0;
  color: #333;
}
</style>
