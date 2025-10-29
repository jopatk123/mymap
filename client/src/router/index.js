import { createRouter, createWebHistory } from 'vue-router';
import pinia, { useAuthStore } from '@/store';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Map/index.vue'),
    meta: {
      title: '点位展示系统',
      requiresAuth: true,
    },
  },
  {
    path: '/admin',
    component: () => import('@/views/Admin/index.vue'),
    meta: {
      title: '管理后台',
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'Admin',
        redirect: '/admin/files',
      },
      {
        path: 'files',
        name: 'FileManage',
        component: () => import('@/views/Admin/FileManage.vue'),
        meta: {
          title: '文件管理',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/panorama/:id',
    name: 'PanoramaViewer',
    component: () => import('@/views/PanoramaViewer.vue'),
    meta: {
      title: '全景图查看',
      requiresAuth: true,
    },
  },
  {
    path: '/debug/styles',
    name: 'StyleDebug',
    component: () => import('@/views/StyleDebugView.vue'),
    meta: {
      title: '样式调试',
      requiresAuth: true,
    },
  },
  {
    path: '/test/buttons',
    name: 'ButtonTest',
    component: () => import('@/views/ButtonTestView.vue'),
    meta: {
      title: '按钮UI测试',
      requiresAuth: true,
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: {
      title: '登录',
      requiresAuth: false,
    },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: {
      title: '注册',
      requiresAuth: false,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面未找到',
      requiresAuth: false,
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title;
  }

  const authStore = useAuthStore(pinia);

  if (!authStore.initialized) {
    try {
      await authStore.loadUser();
    } catch (_) {
      // ignore, 401 handled via redirect below
    }
  }

  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  }

  if (['Login', 'Register'].includes(to.name) && authStore.isAuthenticated) {
    const redirectTarget = typeof to.query.redirect === 'string' ? to.query.redirect : '/';
    return next(redirectTarget);
  }

  next();
});

export default router;
