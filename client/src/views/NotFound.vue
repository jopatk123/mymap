<template>
  <div class="not-found">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <div class="error-message">页面未找到</div>
      <div class="error-description">
        抱歉，您访问的页面不存在或已被移除。
      </div>
      <div class="error-actions">
        <el-button @click="goHome" type="primary" size="large">
          <el-icon><HomeFilled /></el-icon>
          返回首页
        </el-button>
        <el-button @click="goBack" size="large">
          <el-icon><ArrowLeft /></el-icon>
          返回上页
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { HomeFilled, ArrowLeft } from '@element-plus/icons-vue'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  .not-found-content {
    text-align: center;
    color: white;
    
    .error-code {
      font-size: 120px;
      font-weight: bold;
      line-height: 1;
      margin-bottom: 20px;
      text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }
    
    .error-message {
      font-size: 32px;
      font-weight: 500;
      margin-bottom: 16px;
    }
    
    .error-description {
      font-size: 16px;
      opacity: 0.8;
      margin-bottom: 40px;
      max-width: 400px;
    }
    
    .error-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }
  }
}

@media (max-width: 768px) {
  .not-found-content {
    padding: 20px;
    
    .error-code {
      font-size: 80px;
    }
    
    .error-message {
      font-size: 24px;
    }
    
    .error-actions {
      flex-direction: column;
      align-items: center;
      
      .el-button {
        width: 200px;
      }
    }
  }
}
</style>