<script setup lang="ts">
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  confirmEmailVerification,
  getCurrentUser,
  sendEmailVerification,
} from '@/api/auth'
import { getErrorMessage } from '@/api/errors'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const loading = ref(false)
const mobileMenuOpen = ref(false)
const verificationPanel = ref<HTMLElement>()
const verificationCode = ref('')
const showVerificationInput = ref(false)
const sendingVerification = ref(false)
const confirmingVerification = ref(false)
const resendCountdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | undefined
const passwordForm = reactive({ current: '', next: '', confirm: '' })

const user = computed(() => authStore.user)
const isEmailVerified = computed(() => Boolean(user.value?.emailVerifiedAt))
const displayName = computed(() => user.value?.name || '—')
const timezone = computed(() => user.value?.effectiveTimezone || user.value?.timezone || 'UTC+8')

const primaryNav = [
  ['▦', '概览'],
  ['⌁', 'API 密钥'],
  ['▧', '素材库'],
  ['▣', '钱包'],
  ['⌗', '用量'],
  ['◇', '我的套餐'],
  ['◴', '限流状态'],
  ['⌘', '路由设置'],
  ['↶', '退款'],
  ['▥', '组织'],
]

async function loadProfile(): Promise<void> {
  loading.value = true
  try {
    authStore.setUser(await getCurrentUser())
  } catch {
    ElMessage.warning('暂时无法刷新账户资料，已显示本地登录信息。')
  } finally {
    loading.value = false
  }
}

function showPendingFeature(label: string): void {
  ElMessage.info(`${label}接口将在下一步接入`)
}

function startResendCountdown(): void {
  resendCountdown.value = 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    resendCountdown.value -= 1
    if (resendCountdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = undefined
    }
  }, 1000)
}

async function sendVerificationCode(): Promise<void> {
  if (sendingVerification.value || resendCountdown.value > 0) return
  sendingVerification.value = true
  try {
    await sendEmailVerification()
    showVerificationInput.value = true
    startResendCountdown()
    ElMessage.success(`验证码已发送至 ${user.value?.email || '你的邮箱'}`)
    await nextTick()
    verificationPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      await loadProfile()
      ElMessage.info('该邮箱已经完成验证')
    } else {
      ElMessage.error(getErrorMessage(error))
    }
  } finally {
    sendingVerification.value = false
  }
}

async function openVerification(): Promise<void> {
  showVerificationInput.value = true
  await nextTick()
  verificationPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function normalizeVerificationCode(event: Event): void {
  verificationCode.value = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6)
}

async function confirmVerificationCode(): Promise<void> {
  if (!/^\d{6}$/.test(verificationCode.value)) {
    ElMessage.warning('请输入邮件中的 6 位数字验证码')
    return
  }
  confirmingVerification.value = true
  try {
    await confirmEmailVerification(verificationCode.value)
    await loadProfile()
    verificationCode.value = ''
    showVerificationInput.value = false
    ElMessage.success('邮箱验证成功')
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    confirmingVerification.value = false
  }
}

function updatePassword(): void {
  if (!passwordForm.next || passwordForm.next.length < 8) {
    ElMessage.warning('新密码至少需要 8 位')
    return
  }
  if (passwordForm.next !== passwordForm.confirm) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  showPendingFeature('修改密码')
}

async function logout(): Promise<void> {
  authStore.logout()
  await router.replace('/login')
}

onMounted(loadProfile)
onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <div class="workspace-shell">
    <header class="workspace-header">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">O</span><strong>OmniMind</strong>
      </RouterLink>
      <nav class="top-nav" aria-label="顶部导航">
        <a href="#">套餐</a><a href="#">模型</a><a href="#">体验</a>
        <RouterLink class="active" to="/workspace">工作台</RouterLink>
        <a href="#">文档</a><a href="#">合作</a>
      </nav>
      <div class="header-tools">
        <button type="button" aria-label="切换主题">☾</button>
        <span>◎ UTC+8</span><button type="button">中</button><button type="button">♧</button>
        <button class="avatar" type="button" @click="logout">{{ user?.email?.slice(0, 1).toUpperCase() || 'O' }}</button>
      </div>
      <button class="menu-button" type="button" @click="mobileMenuOpen = !mobileMenuOpen">☰</button>
    </header>

    <div v-if="!isEmailVerified" class="verify-banner">
      你的邮箱尚未验证——验证后才能找回密码、接收账单与安全通知。
      <button type="button" @click="openVerification">立即验证 →</button>
    </div>

    <aside class="sidebar" :class="{ open: mobileMenuOpen }">
      <div class="sidebar-scroll">
        <p class="nav-heading">开发</p>
        <button v-for="item in primaryNav" :key="item[1]" type="button" class="side-item">
          <span>{{ item[0] }}</span>{{ item[1] }}
        </button>
        <div class="nav-divider"></div>
        <p class="nav-heading">账号</p>
        <RouterLink class="side-item active" to="/workspace/account"><span>◎</span>账户</RouterLink>
        <button type="button" class="side-item"><span>♢</span>实名认证</button>
        <button type="button" class="side-item"><span>♧</span>通知</button>
        <div class="nav-divider"></div>
        <p class="nav-heading">供应商</p>
        <button type="button" class="side-item"><span>✣</span>申请成为供应商</button>
        <div class="nav-divider"></div>
        <p class="nav-heading">分销商</p>
        <button type="button" class="side-item"><span>⌯</span>申请成为分销商</button>
      </div>
      <div class="balance-card"><span>可用余额</span><strong>$1.00</strong><small>含赠送额度</small><em>$1.00</em></div>
    </aside>

    <main class="workspace-main" :class="{ loading }">
      <div class="breadcrumb">工作台 <span>›</span></div>
      <h1>个人资料</h1>

      <section class="content-card profile-card">
        <h2>账户信息</h2>
        <dl class="profile-list">
          <div><dt>邮箱</dt><dd>{{ user?.email || '—' }} <span v-if="isEmailVerified" class="verified">✓ 已验证</span><span v-else class="unverified">ⓘ 未验证</span></dd></div>
          <div><dt>姓名</dt><dd>{{ displayName }}</dd></div>
          <div><dt>状态</dt><dd>{{ user?.status || 'active' }}</dd></div>
          <div><dt>显示时区</dt><dd>◎ {{ timezone }}</dd></div>
        </dl>
        <div v-if="!isEmailVerified" ref="verificationPanel" class="email-panel">
          <span class="mail-icon">✉</span>
          <div><strong>邮箱未验证</strong><p>验证邮箱后可解锁全部账户功能。</p>
            <div class="email-actions">
              <button
                type="button"
                class="warning-button"
                :disabled="sendingVerification || resendCountdown > 0"
                @click="sendVerificationCode"
              >
                <template v-if="sendingVerification">发送中…</template>
                <template v-else-if="resendCountdown > 0">{{ resendCountdown }} 秒后重发</template>
                <template v-else>发送验证码</template>
              </button>
              <button type="button" class="text-button" @click="openVerification">输入验证码</button>
            </div>
            <form v-if="showVerificationInput" class="verification-form" @submit.prevent="confirmVerificationCode">
              <input
                v-model="verificationCode"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                placeholder="输入邮件中的 6 位验证码"
                aria-label="邮箱验证码"
                @input="normalizeVerificationCode"
              />
              <button type="submit" :disabled="confirmingVerification">
                {{ confirmingVerification ? '验证中…' : '确认验证' }}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section class="content-card">
        <h2>修改密码</h2>
        <form class="password-form" @submit.prevent="updatePassword">
          <label>当前密码 <span>（仅 OAuth 账号可留空）</span><input v-model="passwordForm.current" type="password" placeholder="输入当前密码" autocomplete="current-password" /></label>
          <label>新密码<input v-model="passwordForm.next" type="password" placeholder="至少 8 位" autocomplete="new-password" /></label>
          <label>确认新密码<input v-model="passwordForm.confirm" type="password" placeholder="再次输入新密码" autocomplete="new-password" /></label>
          <button class="primary-button" type="submit">更新密码</button>
        </form>
      </section>

      <section class="content-card compact-card">
        <h2>已绑定第三方账号</h2><p>暂未绑定任何第三方账号。</p>
      </section>

      <section class="content-card security-card">
        <div><h2>♢ 两步验证（2FA）</h2><span>未启用</span></div>
        <p>在密码之外，再加一层来自验证器 App（Google Authenticator、Authy、1Password 等）的一次性动态码。</p>
        <button class="primary-button" type="button" @click="showPendingFeature('两步验证')">启用两步验证</button>
      </section>

      <section class="content-card danger-card">
        <h2>♙ 注销账号</h2>
        <p>注销后账号进入 30 天冷静期，全部 API Key 立即冻结；期满将永久删除个人信息。冷静期内可随时撤销。</p>
        <button type="button" @click="showPendingFeature('注销账号')">注销账号</button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.workspace-shell { min-height: 100vh; color: #111a36; background: #f3f6fc; }
.workspace-header { position: fixed; z-index: 30; inset: 0 0 auto; display: flex; height: 70px; align-items: center; padding: 0 30px; border-bottom: 1px solid #e5eaf4; background: #fff; }
.brand { display: flex; width: 190px; align-items: center; gap: 10px; font-size: 17px; }
.brand-mark { display: grid; width: 36px; height: 36px; place-items: center; color: #fff; border-radius: 9px; background: #5854f2; font-weight: 800; }
.top-nav { display: flex; gap: 8px; align-items: center; }
.top-nav a { padding: 10px 12px; color: #4f52e9; font-size: 14px; }
.top-nav .active { border-radius: 9px; background: #f0f2ff; }
.header-tools { display: flex; gap: 18px; align-items: center; margin-left: auto; color: #667596; font-size: 13px; }
.header-tools button, .menu-button { padding: 0; border: 0; background: none; color: inherit; cursor: pointer; }
.header-tools .avatar { width: 34px; height: 34px; border-radius: 50%; background: #edf0f6; color: #25304a; font-weight: 700; }
.menu-button { display: none; margin-left: auto; font-size: 22px; }
.verify-banner { position: fixed; z-index: 25; top: 70px; right: 0; left: 0; height: 42px; padding: 10px 24px; border-bottom: 1px solid #f1ca67; background: #fff9e5; color: #ad6500; text-align: center; font-size: 13px; }
.verify-banner button { margin-left: 15px; border: 0; background: none; color: #8f5100; font-weight: 700; text-decoration: underline; cursor: pointer; }
.sidebar { position: fixed; z-index: 20; top: 112px; bottom: 0; left: 0; display: flex; width: 268px; flex-direction: column; border-right: 1px solid #e1e7f1; background: #fff; }
.sidebar-scroll { overflow-y: auto; padding: 20px 14px; }
.nav-heading { margin: 5px 14px 8px; color: #98a8c8; font-size: 12px; font-weight: 700; }
.side-item { display: flex; width: 100%; height: 44px; align-items: center; gap: 13px; padding: 0 15px; border: 0; border-radius: 10px; background: none; color: #587096; font-size: 14px; text-align: left; cursor: pointer; }
.side-item span { width: 18px; color: #91a3c7; font-size: 17px; text-align: center; }
.side-item:hover, .side-item.active { background: #eef1ff; color: #4d4bea; }
.nav-divider { height: 1px; margin: 13px 0; background: #e7ebf3; }
.balance-card { display: grid; grid-template-columns: 1fr auto; gap: 5px; padding: 13px 16px; margin: auto 14px 14px; border-radius: 10px; background: #f3f6fc; font-size: 11px; }
.balance-card small, .balance-card em { color: #18a262; font-style: normal; }
.workspace-main { width: min(880px, calc(100% - 330px)); padding: 150px 0 70px; margin-left: max(310px, calc(50% - 280px)); transition: opacity .2s; }
.workspace-main.loading { opacity: .72; }
.breadcrumb { color: #5454ef; font-size: 13px; }.breadcrumb span { margin-left: 6px; color: #9badcc; }
h1 { margin: 24px 0 28px; font-size: 32px; letter-spacing: -.04em; }
.content-card { padding: 34px 32px; margin-bottom: 28px; border: 1px solid #dfe6f0; border-radius: 20px; background: #fff; box-shadow: 0 2px 4px rgb(31 44 75 / 3%); }
.content-card h2 { margin: 0 0 25px; font-size: 18px; }
.profile-list { display: grid; gap: 19px; margin: 0; }
.profile-list div { display: grid; grid-template-columns: 150px 1fr; }
.profile-list dt { color: #91a3c7; }.profile-list dd { margin: 0; text-align: right; }
.unverified { margin-left: 8px; color: #ed8900; }.verified { margin-left: 8px; color: #13a262; }
.email-panel { display: flex; gap: 16px; padding: 21px; margin-top: 28px; border: 1px solid #f1cb74; border-radius: 12px; background: #fff8e8; color: #dc7d00; }
.mail-icon { font-size: 20px; }.email-panel strong { font-size: 14px; }.email-panel p { margin: 7px 0 14px; font-size: 13px; }
.email-actions { display: flex; gap: 24px; align-items: center; }.warning-button, .text-button { border: 0; color: #dc7d00; cursor: pointer; }.warning-button { min-width: 116px; padding: 10px 17px; border-radius: 9px; background: #ffe7ad; }.warning-button:disabled { opacity: .65; cursor: not-allowed; }.text-button { background: none; }
.verification-form { display: flex; gap: 10px; margin-top: 16px; }.verification-form input { width: min(280px, 100%); height: 42px; padding: 0 13px; border: 1px solid #efc76b; border-radius: 8px; outline: 0; background: #fff; color: #3b3528; letter-spacing: .12em; }.verification-form input:focus { border-color: #e29a00; box-shadow: 0 0 0 3px rgb(226 154 0 / 10%); }.verification-form button { padding: 0 17px; border: 0; border-radius: 8px; background: #e99000; color: #fff; cursor: pointer; }.verification-form button:disabled { opacity: .65; cursor: wait; }
.password-form { display: grid; gap: 19px; }.password-form label { display: grid; gap: 9px; color: #61779b; font-size: 13px; }.password-form label span { color: #93a2bd; }.password-form input { height: 54px; padding: 0 18px; border: 1px solid #dbe3ef; border-radius: 10px; outline: 0; color: #1b2945; }.password-form input:focus { border-color: #5a56ee; box-shadow: 0 0 0 3px rgb(90 86 238 / 10%); }.password-form input::placeholder { color: #a5b3ce; }
.primary-button { width: fit-content; padding: 12px 25px; border: 0; border-radius: 10px; background: #5854f2; color: #fff; font-weight: 650; cursor: pointer; }
.compact-card p, .security-card p, .danger-card p { margin: 0; color: #687d9f; font-size: 13px; line-height: 1.8; }.security-card > div { display: flex; justify-content: space-between; }.security-card > div span { color: #98a8c4; font-size: 13px; }.security-card p { margin: -10px 0 20px; }
.danger-card { border-color: #ffc0b5; }.danger-card h2 { color: #ef3f1c; }.danger-card button { padding: 10px 18px; margin-top: 18px; border: 0; border-radius: 8px; background: #fff0ed; color: #ed3d1c; cursor: pointer; }
@media (max-width: 900px) { .top-nav, .header-tools { display: none; }.menu-button { display: block; }.sidebar { top: 112px; transform: translateX(-100%); transition: transform .2s; box-shadow: 18px 0 40px rgb(35 48 82 / 12%); }.sidebar.open { transform: translateX(0); }.workspace-main { width: min(100% - 32px, 700px); margin: 0 auto; }.verify-banner { height: auto; min-height: 42px; }.verify-banner button { margin-left: 5px; } }
@media (max-width: 560px) { .workspace-header { height: 62px; padding: 0 17px; }.verify-banner { top: 62px; font-size: 11px; }.workspace-main { padding-top: 135px; }.content-card { padding: 24px 20px; border-radius: 15px; }.profile-list div { grid-template-columns: 90px 1fr; }.email-actions { gap: 10px; flex-wrap: wrap; }.verification-form { flex-direction: column; }.verification-form input { width: 100%; }.verification-form button { height: 42px; }.brand { width: auto; } }
</style>
