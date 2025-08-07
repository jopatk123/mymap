import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Map/index.vue'),
    meta: {
      title: '点位展示系统'
    }
  },
  {
    path: '/admin',
    component: () => import('@/views/Admin/index.vue'),
    meta: {
      title: '管理后台'
    },
    children: [
      {
        path: '',
        name: 'Admin',
        redirect: '/admin/files'
      },
      {
        path: 'files',
        name: 'FileManage',
        component: () => import('@/views/Admin/FileManage.vue'),
        meta: {
          title: '文件管理'
        }
      },
      {
        path: 'config',
        name: 'ConfigManage',
        component: () => import('@/views/Admin/ConfigManage.vue'),
        meta: {
          title: '系统配置'
        }
      }
    ]
  },
  {
    path: '/panorama/:id',
    name: 'PanoramaViewer',
    component: () => import('@/views/PanoramaViewer.vue'),
    meta: {
      title: '全景图查看'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面未找到'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    if (!token) {
      // 跳转到登录页面或显示提示
      alert('需要登录才能访问此页面')
      return next('/') // 重定向到首页
    }
  }

  next()
})

export default router