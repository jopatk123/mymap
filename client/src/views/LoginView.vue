<template>
  <div class="login-page">
    <el-card class="login-card" shadow="hover">
      <h2 class="login-title">用户登录</h2>
      <p class="login-subtitle">请输入账户信息以继续使用系统</p>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleSubmit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" autocomplete="username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            autocomplete="current-password"
            show-password
            placeholder="请输入密码"
            type="password"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="submitting"
            class="login-button"
            @click="handleSubmit"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="register-hint">
        <span>还没有账户？</span>
        <el-button type="text" class="register-link" @click="goToRegister">立即注册</el-button>
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
});

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
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const handleSubmit = async () => {
  if (!formRef.value || submitting.value) return;
  const valid = await formRef.value.validate();
  if (!valid) return;

  submitting.value = true;
  try {
    await authStore.login({ username: form.username, password: form.password });
    ElMessage.success('登录成功');
    const redirect = route.query.redirect;
    if (typeof redirect === 'string' && redirect.startsWith('/')) {
      await router.replace(redirect);
    } else {
      await router.replace('/');
    }
  } catch (error) {
    if (error?.message) {
      ElMessage.error(error.message);
    }
  } finally {
    submitting.value = false;
  }
};

const goToRegister = () => {
  router.push({
    name: 'Register',
    query: route.query.redirect ? { redirect: route.query.redirect } : {},
  });
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1f4b99 0%, #4a89dc 100%);
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

.register-hint {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 14px;
}

.register-link {
  padding: 0;
  font-size: 14px;
}
</style>
