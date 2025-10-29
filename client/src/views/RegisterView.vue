<template>
  <div class="register-page">
    <el-card class="register-card" shadow="hover">
      <h2 class="register-title">创建账户</h2>
      <p class="register-subtitle">输入用户名与密码以注册新账户</p>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleRegister"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" autocomplete="username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            show-password
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            autocomplete="new-password"
            show-password
            placeholder="请再次输入密码"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="submitting"
            class="register-button"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-hint">
        <span>已经有账户？</span>
        <el-button type="text" class="login-link" @click="goToLogin">返回登录</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/store';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const formRef = ref();
const submitting = ref(false);
const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
});

const validateConfirmPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请再次输入密码'));
    return;
  }
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'));
    return;
  }
  callback();
};

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    {
      min: 3,
      max: 32,
      message: '用户名长度需在3-32个字符之间',
      trigger: 'blur',
    },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      min: 6,
      message: '密码长度至少为6位',
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    { validator: validateConfirmPassword, trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'change' },
  ],
};

const handleRegister = async () => {
  if (!formRef.value || submitting.value) return;
  const valid = await formRef.value.validate();
  if (!valid) return;

  submitting.value = true;
  try {
    await authStore.register({ username: form.username, password: form.password });
    ElMessage.success('注册成功，请登录');
    const redirectQuery = route.query.redirect ? { redirect: route.query.redirect } : {};
    await router.replace({ name: 'Login', query: redirectQuery });
  } catch (error) {
    if (error?.message) {
      ElMessage.error(error.message);
    }
  } finally {
    submitting.value = false;
  }
};

const goToLogin = () => {
  const redirectQuery = route.query.redirect ? { redirect: route.query.redirect } : {};
  router.push({ name: 'Login', query: redirectQuery });
};
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1f4b99 0%, #4a89dc 100%);
  padding: 24px;
  box-sizing: border-box;
}

.register-card {
  max-width: 400px;
  width: 100%;
  padding: 24px 28px;
  box-sizing: border-box;
}

.register-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
}

.register-subtitle {
  margin: 8px 0 24px;
  text-align: center;
  color: #606266;
  font-size: 14px;
}

.register-button {
  width: 100%;
}

.login-hint {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 14px;
}

.login-link {
  padding: 0;
  font-size: 14px;
}
</style>
