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
    path: '/super-admin/login',
    name: 'SuperAdminLogin',
    component: () => import('@/views/SuperAdmin/LoginView.vue'),
    meta: {
      title: '超级管理员登录',
      requiresAuth: false,
    },
  },
  {
    path: '/super-admin/users',
    name: 'SuperAdminUsers',
    component: () => import('@/views/SuperAdmin/UserManagement.vue'),
    meta: {
      title: '用户管理',
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

  const isSuperAdminRoute = to.path.startsWith('/super-admin');
  const authStore = useAuthStore(pinia);

  if (!isSuperAdminRoute) {
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

    // 已登录用户访问普通登录/注册页时重定向
    if (['Login', 'Register'].includes(to.name) && authStore.isAuthenticated) {
      const redirectTarget = typeof to.query.redirect === 'string' ? to.query.redirect : '/';
      return next(redirectTarget);
    }
  }

  // 超级管理员页面不受普通用户登录状态影响，由页面自己处理权限
  next();
});

export default router;
