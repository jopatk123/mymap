<template>
  <div class="admin-layout">
    <div class="admin-header">
      <div class="header-left">
        <h1>管理后台</h1>
      </div>
      <div class="header-right">
        <el-button link @click="goHome">
          <el-icon><HomeFilled /></el-icon>
          返回首页
        </el-button>
        <el-button link @click="toggleSidebar">
          <!-- 不依赖额外图标，简单文本切换 -->
          切换侧栏
        </el-button>
        <el-button link :loading="isLoggingOut" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          退出登入
        </el-button>
      </div>
    </div>

    <div class="admin-content">
      <div class="admin-sidebar" :class="{ 'is-hidden': !sidebarVisible }">
        <el-menu :default-active="activeMenu" router class="admin-menu">
          <el-menu-item index="/admin/files">
            <el-icon><Folder /></el-icon>
            <span>文件管理</span>
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
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { HomeFilled, Folder, SwitchButton } from '@element-plus/icons-vue';
import { useAuthStore } from '@/store/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const activeMenu = computed(() => route.path);

const goHome = () => {
  router.push('/');
};

// 侧栏显示状态，默认隐藏
const sidebarVisible = ref(false);

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value;
};

const isLoggingOut = ref(false);

const handleLogout = async () => {
  if (isLoggingOut.value) {
    return;
  }
  isLoggingOut.value = true;
  try {
    await authStore.logout();
    router.replace('/login');
  } catch (error) {
    ElMessage.error(error?.response?.data?.message ?? '退出登入失败');
  } finally {
    isLoggingOut.value = false;
  }
};
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
      transition: width 0.2s ease, padding 0.2s ease;
      overflow: hidden;

      .admin-menu {
        border-right: none;
      }
    }

    /* 隐藏侧栏时让其宽度折叠，主内容撑满 */
    .admin-sidebar.is-hidden {
      width: 0;
      padding: 0;
      border-right: none;
    }

    .admin-main {
      flex: 1;
      background: #f5f5f5;
      overflow: auto;
    }
  }
}
</style>
