<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

withDefaults(defineProps<{ showMobileMenu?: boolean }>(), { showMobileMenu: false })
const emit = defineEmits<{ toggleMenu: [] }>()

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const accountMenuOpen = ref(false)

const activeSection = computed(() => {
  if (route.path.startsWith('/models')) return 'models'
  if (route.path.startsWith('/workspace')) return 'workspace'
  return ''
})

function closeAccountMenu(): void {
  accountMenuOpen.value = false
}

async function logout(): Promise<void> {
  accountMenuOpen.value = false
  await authStore.logoutFromServer()
  await router.replace('/login')
}

onMounted(() => document.addEventListener('click', closeAccountMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeAccountMenu))
</script>

<template>
  <header class="site-header">
    <RouterLink class="site-brand" to="/">
      <span class="site-brand-mark">O</span><strong>OmniMind</strong>
    </RouterLink>

    <nav class="site-nav" aria-label="顶部导航">
      <RouterLink :class="{ active: activeSection === 'models' }" to="/models">模型</RouterLink>
      <a href="#">体验</a>
      <RouterLink :class="{ active: activeSection === 'workspace' }" to="/workspace">
        工作台
      </RouterLink>
      <a href="#">文档</a><a href="#">合作</a>
    </nav>

    <div class="site-tools">
      <button type="button" aria-label="切换主题">☾</button>
      <span>◎ UTC+8</span><span>中</span><span>♧</span>
      <button
        v-if="showMobileMenu"
        class="site-mobile-menu"
        type="button"
        aria-label="打开工作台菜单"
        @click="emit('toggleMenu')"
      >
        ☰
      </button>

      <div v-if="authStore.isAuthenticated" class="site-account" @click.stop>
        <button
          class="site-avatar"
          type="button"
          aria-label="打开账号菜单"
          :aria-expanded="accountMenuOpen"
          @click="accountMenuOpen = !accountMenuOpen"
        >
          {{ authStore.user?.email?.slice(0, 1).toUpperCase() || 'O' }}
        </button>
        <div v-if="accountMenuOpen" class="site-account-dropdown" role="menu">
          <div class="site-account-email">{{ authStore.user?.email || '未知账号' }}</div>
          <RouterLink class="site-plan-menu" to="/workspace/plans" role="menuitem">
            <span>✦</span>
            <p><strong>套餐与余额</strong><small>当前可用 $1.00</small></p>
            <b>›</b>
          </RouterLink>
          <RouterLink class="site-dropdown-item" to="/workspace/account" role="menuitem">
            账号设置
          </RouterLink>
          <button class="site-dropdown-item logout" type="button" role="menuitem" @click="logout">
            退出登录
          </button>
        </div>
      </div>

      <div v-else class="site-auth-links">
        <RouterLink to="/login">登录</RouterLink>
        <RouterLink class="register" to="/register">注册</RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: fixed;
  z-index: 80;
  inset: 0 0 auto;
  display: flex;
  height: 72px;
  align-items: center;
  padding: 0 34px;
  border-bottom: 1px solid #e6e9f1;
  background: rgb(255 255 255 / 96%);
  backdrop-filter: blur(16px);
}
.site-brand {
  display: flex;
  width: 270px;
  flex: 0 0 auto;
  align-items: center;
  gap: 14px;
  color: #12182d;
  font-size: 24px;
  text-decoration: none;
}
.site-brand-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 11px;
  background: linear-gradient(145deg, #6865ff, #4f46ee);
  color: #fff;
  font-size: 24px;
  font-weight: 800;
}
.site-nav {
  display: flex;
  gap: 8px;
  align-items: center;
}
.site-nav a {
  padding: 11px 15px;
  border-radius: 11px;
  color: #4f52e9;
  font-size: 17px;
  text-decoration: none;
}
.site-nav a:hover,
.site-nav a.active {
  background: #f0efff;
  color: #403ed4;
}
.site-tools {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-left: auto;
  color: #667492;
  font-size: 15px;
}
.site-tools > button,
.site-avatar {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.site-mobile-menu {
  display: none;
  font-size: 22px;
}
.site-account {
  position: relative;
}
.site-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #edf0f7;
  color: #26314b;
  font-size: 16px;
  font-weight: 800;
}
.site-account-dropdown {
  position: absolute;
  z-index: 90;
  top: calc(100% + 14px);
  right: 0;
  width: 270px;
  overflow: hidden;
  border: 1px solid #e2e6ef;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 45px rgb(25 34 59 / 16%);
}
.site-account-email {
  overflow: hidden;
  padding: 17px;
  border-bottom: 1px solid #edf0f5;
  color: #71809c;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.site-plan-menu {
  display: grid;
  grid-template-columns: 34px 1fr auto;
  gap: 11px;
  align-items: center;
  min-height: 72px;
  padding: 10px 15px;
  background: #f5f4ff;
  color: #37348e;
  text-decoration: none;
}
.site-plan-menu > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: #5957e8;
  color: #fff;
}
.site-plan-menu p {
  display: grid;
  gap: 3px;
  margin: 0;
}
.site-plan-menu strong {
  font-size: 14px;
}
.site-plan-menu small {
  color: #7775ae;
  font-size: 12px;
}
.site-plan-menu b {
  font-size: 20px;
  font-weight: 400;
}
.site-dropdown-item {
  display: flex;
  width: 100%;
  min-height: 52px;
  align-items: center;
  padding: 0 17px;
  border: 0;
  border-top: 1px solid #edf0f5;
  background: #fff;
  color: #26314b;
  cursor: pointer;
  font-size: 14px;
  text-decoration: none;
}
.site-dropdown-item:hover {
  background: #f7f8fc;
}
.site-dropdown-item.logout {
  color: #e9442c;
}
.site-auth-links {
  display: flex;
  gap: 8px;
  align-items: center;
}
.site-auth-links a {
  padding: 8px 12px;
  color: #4e4ce4;
  text-decoration: none;
}
.site-auth-links .register {
  border-radius: 9px;
  background: #5854f2;
  color: #fff;
}
@media (max-width: 1050px) {
  .site-brand {
    width: auto;
  }
  .site-nav {
    margin-left: 34px;
  }
  .site-nav a {
    padding: 10px;
    font-size: 15px;
  }
}
@media (max-width: 820px) {
  .site-header {
    padding: 0 18px;
  }
  .site-nav {
    display: none;
  }
  .site-tools > button,
  .site-tools > span {
    display: none;
  }
  .site-tools > .site-mobile-menu {
    display: block;
  }
}
@media (max-width: 520px) {
  .site-header {
    height: 64px;
    padding: 0 14px;
  }
  .site-brand {
    gap: 9px;
    font-size: 19px;
  }
  .site-brand-mark {
    width: 36px;
    height: 36px;
    font-size: 19px;
  }
  .site-avatar {
    width: 38px;
    height: 38px;
  }
  .site-auth-links a {
    padding: 7px 9px;
    font-size: 13px;
  }
}
</style>
