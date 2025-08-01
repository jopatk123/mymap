<template>
  <div class="admin-layout">
    <div class="admin-header">
      <div class="header-left">
        <h1>管理后台</h1>
      </div>
      <div class="header-right">
        <el-button @click="goHome" link>
          <el-icon><HomeFilled /></el-icon>
          返回首页
        </el-button>
      </div>
    </div>
    
    <div class="admin-content">
      <div class="admin-sidebar">
        <el-menu
          :default-active="activeMenu"
          router
          class="admin-menu"
        >
          <el-menu-item index="/admin/panorama">
            <el-icon><Picture /></el-icon>
            <span>全景图管理</span>
          </el-menu-item>
        </el-menu>
      </div>
      
      <div class="admin-main">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HomeFilled, Picture } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)

const goHome = () => {
  router.push('/')
}
</script>

<style lang="scss" scoped>
.admin-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  
  .admin-header {
    height: 60px;
    background: white;
    border-bottom: 1px solid #e6e6e6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    
    .header-left {
      h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
        color: #303133;
      }
    }
  }
  
  .admin-content {
    flex: 1;
    display: flex;
    
    .admin-sidebar {
      width: 200px;
      background: white;
      border-right: 1px solid #e6e6e6;
      
      .admin-menu {
        border-right: none;
      }
    }
    
    .admin-main {
      flex: 1;
      background: #f5f5f5;
      overflow: auto;
    }
  }
}
</style>