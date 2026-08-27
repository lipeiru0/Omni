<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { exchangeOAuthCode, getCurrentUser } from '@/api/auth'
import { getErrorMessage } from '@/api/errors'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const status = ref('正在完成第三方登录…')

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  if (!code) {
    status.value = '回调地址缺少一次性授权 code。'
    return
  }

  try {
    const tokens = await exchangeOAuthCode({ code })
    authStore.setSession(tokens, { email: '第三方账号' }, true)
    authStore.setUser(await getCurrentUser())
    const redirect = sessionStorage.getItem('omnimind_oauth_redirect') || '/'
    sessionStorage.removeItem('omnimind_oauth_redirect')
    ElMessage.success('第三方登录成功')
    await router.replace(redirect)
  } catch (error) {
    authStore.logout()
    status.value = getErrorMessage(error)
  }
})
</script>

<template>
  <main class="callback-page">
    <section class="callback-card">
      <span class="logo">O</span>
      <span v-if="status.includes('正在')" class="spinner" aria-hidden="true"></span>
      <h1>OmniMind</h1>
      <p>{{ status }}</p>
      <RouterLink v-if="!status.includes('正在')" to="/login">返回登录</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.callback-page {
  display: grid;
  min-height: 100vh;
  padding: 24px;
  place-items: center;
  background-color: #f5f7fb;
  background-image:
    linear-gradient(rgb(84 87 120 / 5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(84 87 120 / 5%) 1px, transparent 1px);
  background-size: 48px 48px;
}
.callback-card {
  width: min(100%, 420px);
  padding: 48px;
  border: 1px solid #e5e6ee;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 70px rgb(32 35 80 / 10%);
  text-align: center;
}
.logo {
  display: grid;
  width: 48px;
  height: 48px;
  margin: 0 auto 25px;
  place-items: center;
  color: #fff;
  border-radius: 12px;
  background: #5957e8;
  font-weight: 800;
}
.spinner {
  display: block;
  width: 26px;
  height: 26px;
  margin: 0 auto 22px;
  border: 3px solid #e4e3ff;
  border-top-color: #5957e8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.callback-card h1 {
  margin: 0 0 10px;
  font-size: 25px;
}
.callback-card p {
  color: #777a8e;
  font-size: 14px;
}
.callback-card a {
  display: inline-block;
  margin-top: 16px;
  color: #5957e8;
  font-weight: 700;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
