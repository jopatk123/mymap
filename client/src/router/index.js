import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Map/index.vue'),
    meta: {
      title: '地图全景系统'
    }
  },
  {
    path: '/admin',
    component: () => import('@/views/Admin/index.vue'),
    meta: {
      title: '管理后台',
      requiresAuth: true
    },
    children: [
      {
        path: '',
        name: 'Admin',
        redirect: '/admin/panorama'
      },
      {
        path: 'panorama',
        name: 'PanoramaManage',
        component: () => import('@/views/Admin/PanoramaManage.vue'),
        meta: {
          title: '全景图管理'
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
      // 可以跳转到登录页面
      console.warn('需要登录才能访问此页面')
    }
  }
  
  next()
})

export default router