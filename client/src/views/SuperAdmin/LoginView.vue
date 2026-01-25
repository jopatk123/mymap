<template>
  <div class="super-admin-login">
    <el-card class="login-card" shadow="hover">
      <h2 class="login-title">超级管理员</h2>
      <p class="login-subtitle">请输入超级管理员密码以访问用户管理系统</p>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleLogin"
      >
        <el-form-item label="管理员密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入超级管理员密码"
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="submitting"
            class="login-button"
            @click="handleLogin"
          >
            进入管理
          </el-button>
        </el-form-item>
      </el-form>
      <div class="back-hint">
        <el-button type="text" @click="goBack">返回首页</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { superAdminLogin } from '@/api/super-admin';

const router = useRouter();

const formRef = ref();
const submitting = ref(false);
const form = reactive({
  password: '',
});

const rules = {
  password: [{ required: true, message: '请输入管理员密码', trigger: 'blur' }],
};

const handleLogin = async () => {
  if (!formRef.value || submitting.value) return;
  
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const response = await superAdminLogin(form.password);
    if (response?.authenticated || response?.success || response?.data?.authenticated) {
      ElMessage.success('登录成功');
      await router.push('/super-admin/users');
    } else {
      ElMessage.error('登录失败');
    }
  } catch (error) {
    ElMessage.error(error?.message || '密码错误');
  } finally {
    submitting.value = false;
  }
};

const goBack = () => {
  router.push('/');
};
</script>

<style scoped>
.super-admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  padding: 24px;
  box-sizing: border-box;
}

.login-card {
  max-width: 400px;
  width: 100%;
  padding: 24px 28px;
  box-sizing: border-box;
}

.login-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  color: #2c3e50;
}

.login-subtitle {
  margin: 8px 0 24px;
  text-align: center;
  color: #606266;
  font-size: 14px;
}

.login-button {
  width: 100%;
}

.back-hint {
  margin-top: 16px;
  text-align: center;
}
</style>
