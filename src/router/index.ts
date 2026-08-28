import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import type { AuthTokens } from '@/types/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    publicOnly?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/Home/index.vue') },
    {
      path: '/workspace',
      redirect: { name: 'workspace-account' },
      meta: { requiresAuth: true },
    },
    {
      path: '/workspace/account',
      name: 'workspace-account',
      component: () => import('@/views/WorkspaceAccount/index.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/workspace/verification',
      name: 'workspace-verification',
      component: () => import('@/views/WorkspaceVerification/index.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login/index.vue'),
      meta: { publicOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/Register/index.vue'),
      meta: { publicOnly: true },
    },
    {
      path: '/forgot-password',
      alias: '/auth/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPassword/index.vue'),
      meta: { publicOnly: true },
    },
    {
      path: '/reset-password',
      alias: '/auth/reset-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPassword/index.vue'),
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: () => import('@/views/ChangePassword/index.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/auth/oauth-callback',
      name: 'oauth-callback',
      component: () => import('@/views/OAuthCallback/index.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.publicOnly && authStore.isAuthenticated) return { name: 'home' }
})

window.addEventListener('auth:session-expired', () => {
  const authStore = useAuthStore()
  authStore.logout()
  if (router.currentRoute.value.name !== 'login') {
    void router.replace({
      name: 'login',
      query: { redirect: router.currentRoute.value.fullPath },
    })
  }
})

window.addEventListener('auth:tokens-refreshed', (event) => {
  const tokens = (event as CustomEvent<AuthTokens>).detail
  useAuthStore().syncTokens(tokens)
})

export default router
