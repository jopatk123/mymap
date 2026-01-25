<template>
  <div class="user-management">
    <div class="page-header">
      <h2>用户管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          创建用户
        </el-button>
        <el-button @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          退出管理
        </el-button>
      </div>
    </div>

    <!-- 用户列表 -->
    <el-card class="user-table-card">
      <el-table
        v-loading="loading"
        :data="users"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" min-width="150" />
        <el-table-column prop="displayName" label="显示名称" min-width="150">
          <template #default="{ row }">
            {{ row.displayName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '正常' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="hasPassword" label="密码状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.hasPassword ? 'success' : 'warning'">
              {{ row.hasPassword ? '已设置' : '未设置' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              link
              @click="showChangePasswordDialog(row)"
            >
              修改密码
            </el-button>
            <el-button
              :type="row.isActive ? 'danger' : 'success'"
              size="small"
              link
              @click="handleToggleActive(row)"
            >
              {{ row.isActive ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建用户对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="创建新用户"
      width="450px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="createForm.username"
            placeholder="请输入用户名（3-32位）"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="createForm.password"
            type="password"
            show-password
            placeholder="请输入密码（至少6位）"
          />
        </el-form-item>
        <el-form-item label="显示名称" prop="displayName">
          <el-input
            v-model="createForm.displayName"
            placeholder="可选，用于显示的名称"
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="createForm.role" placeholder="请选择角色">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="createSubmitting"
          @click="handleCreateUser"
        >
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改用户密码"
      width="450px"
      :close-on-click-modal="false"
    >
      <div class="password-dialog-info">
        <p>正在修改用户 <strong>{{ selectedUser?.username }}</strong> 的密码</p>
      </div>
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="80px"
      >
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            show-password
            placeholder="请输入新密码（至少6位）"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入新密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="passwordSubmitting"
          @click="handleChangePassword"
        >
          确认修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, SwitchButton } from '@element-plus/icons-vue';
import {
  getAllUsers,
  createUser,
  forceChangePassword,
  toggleUserActive,
  superAdminLogout,
  checkSuperAdminAuth,
} from '@/api/super-admin';

const router = useRouter();

// 用户列表
const users = ref([]);
const loading = ref(false);

// 创建用户相关
const createDialogVisible = ref(false);
const createFormRef = ref();
const createSubmitting = ref(false);
const createForm = reactive({
  username: '',
  password: '',
  displayName: '',
  role: 'user',
});

const createRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 32, message: '用户名长度需在3-32位之间', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
};

// 修改密码相关
const passwordDialogVisible = ref(false);
const passwordFormRef = ref();
const passwordSubmitting = ref(false);
const selectedUser = ref(null);
const passwordForm = reactive({
  newPassword: '',
  confirmPassword: '',
});

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
};

const passwordRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
};

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN');
};

// 检查权限
const checkAuth = async () => {
  try {
    const response = await checkSuperAdminAuth();
    const authenticated = response?.authenticated ?? response?.data?.authenticated;
    if (!authenticated) {
      router.replace('/super-admin/login');
    }
  } catch {
    router.replace('/super-admin/login');
  }
};

// 获取用户列表
const fetchUsers = async () => {
  loading.value = true;
  try {
    const response = await getAllUsers();
    if (Array.isArray(response)) {
      users.value = response;
    } else {
      users.value = response?.data || [];
    }
  } catch (error) {
    ElMessage.error(error?.message || '获取用户列表失败');
    if (error?.response?.status === 401) {
      router.replace('/super-admin/login');
    }
  } finally {
    loading.value = false;
  }
};

// 显示创建用户对话框
const showCreateDialog = () => {
  createForm.username = '';
  createForm.password = '';
  createForm.displayName = '';
  createForm.role = 'user';
  createDialogVisible.value = true;
};

// 创建用户
const handleCreateUser = async () => {
  if (!createFormRef.value) return;
  
  try {
    await createFormRef.value.validate();
  } catch {
    return;
  }

  createSubmitting.value = true;
  try {
    await createUser({
      username: createForm.username,
      password: createForm.password,
      displayName: createForm.displayName || undefined,
      role: createForm.role,
    });
    ElMessage.success('用户创建成功');
    createDialogVisible.value = false;
    await fetchUsers();
  } catch (error) {
    ElMessage.error(error?.message || '创建用户失败');
  } finally {
    createSubmitting.value = false;
  }
};

// 显示修改密码对话框
const showChangePasswordDialog = (user) => {
  selectedUser.value = user;
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
  passwordDialogVisible.value = true;
};

// 修改密码
const handleChangePassword = async () => {
  if (!passwordFormRef.value || !selectedUser.value) return;
  
  try {
    await passwordFormRef.value.validate();
  } catch {
    return;
  }

  passwordSubmitting.value = true;
  try {
    await forceChangePassword(selectedUser.value.id, passwordForm.newPassword);
    ElMessage.success(`已成功修改用户 ${selectedUser.value.username} 的密码`);
    passwordDialogVisible.value = false;
  } catch (error) {
    ElMessage.error(error?.message || '修改密码失败');
  } finally {
    passwordSubmitting.value = false;
  }
};

// 切换用户状态
const handleToggleActive = async (user) => {
  const action = user.isActive ? '禁用' : '启用';
  
  try {
    await ElMessageBox.confirm(
      `确定要${action}用户 "${user.username}" 吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
  } catch {
    return;
  }

  try {
    await toggleUserActive(user.id);
    ElMessage.success(`已${action}用户 ${user.username}`);
    await fetchUsers();
  } catch (error) {
    ElMessage.error(error?.message || '操作失败');
  }
};

// 退出管理
const handleLogout = async () => {
  try {
    await superAdminLogout();
    ElMessage.success('已退出超级管理员模式');
    router.replace('/');
  } catch {
    router.replace('/');
  }
};

onMounted(async () => {
  await checkAuth();
  await fetchUsers();
});
</script>

<style scoped>
.user-management {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.user-table-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.password-dialog-info {
  margin-bottom: 20px;
  padding: 12px;
  background: #f4f4f5;
  border-radius: 4px;
}

.password-dialog-info p {
  margin: 0;
  color: #606266;
}

.password-dialog-info strong {
  color: #409eff;
}
</style>
