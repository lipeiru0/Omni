<script setup lang="ts">
import axios from 'axios'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  cancelAccountDeletion,
  confirmEmailVerification,
  disableTwoFactor,
  enableTwoFactor,
  getCurrentUser,
  getOAuthAccounts,
  getTwoFactorStatus,
  requestAccountDeletion,
  sendEmailVerification,
  setPassword,
  setupTwoFactor,
  updateCurrentUser,
} from '@/api/auth'
import { getErrorMessage } from '@/api/errors'
import { useAuthStore } from '@/stores/auth'
import type { OAuthAccount, TwoFactorSetup } from '@/types/auth'

const authStore = useAuthStore()
const router = useRouter()
const loading = ref(false)
const mobileMenuOpen = ref(false)
const accountMenuOpen = ref(false)
const timezoneMenuOpen = ref<'header' | 'profile' | null>(null)
const verificationPanel = ref<HTMLElement>()
const verificationCode = ref('')
const showVerificationInput = ref(false)
const sendingVerification = ref(false)
const confirmingVerification = ref(false)
const updatingPassword = ref(false)
const oauthAccounts = ref<OAuthAccount[]>([])
const loadingOAuthAccounts = ref(false)
const twoFactorEnabled = ref(false)
const loadingTwoFactorStatus = ref(false)
const settingUpTwoFactor = ref(false)
const enablingTwoFactor = ref(false)
const disablingTwoFactor = ref(false)
const twoFactorSetup = ref<TwoFactorSetup | null>(null)
const twoFactorQrCode = ref('')
const twoFactorCode = ref('')
const backupCodes = ref<string[]>([])
const showDisableTwoFactor = ref(false)
const disableTwoFactorForm = reactive({ password: '', code: '' })
const showDeletionConfirmation = ref(false)
const deletionConfirmation = ref('')
const requestingDeletion = ref(false)
const cancellingDeletion = ref(false)
const resendCountdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | undefined
const passwordForm = reactive({ current: '', next: '', confirm: '' })
const profileForm = reactive({ name: '', timezone: '' })
const savingProfile = ref(false)
const savingTimezone = ref(false)

const user = computed(() => authStore.user)
const isEmailVerified = computed(() => Boolean(user.value?.emailVerifiedAt))
const displayName = computed(() => user.value?.name || '—')
const timezone = computed(() =>
  getTimezoneOffset(
    profileForm.timezone || user.value?.timezone || user.value?.effectiveTimezone || 'Asia/Shanghai',
  ),
)
const deletionPending = computed(
  () => user.value?.status === 'pending_deletion' || Boolean(user.value?.deletionScheduledAt),
)

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

const timezoneOptions = [
  { label: 'UTC（协调世界时）', value: 'UTC' },
  { label: '中国标准时间（北京）', value: 'Asia/Shanghai' },
  { label: '香港', value: 'Asia/Hong_Kong' },
  { label: '台北', value: 'Asia/Taipei' },
  { label: '东京', value: 'Asia/Tokyo' },
  { label: '首尔', value: 'Asia/Seoul' },
  { label: '新加坡', value: 'Asia/Singapore' },
  { label: '曼谷', value: 'Asia/Bangkok' },
  { label: '迪拜', value: 'Asia/Dubai' },
  { label: '悉尼', value: 'Australia/Sydney' },
  { label: '奥克兰', value: 'Pacific/Auckland' },
  { label: '伦敦', value: 'Europe/London' },
  { label: '巴黎', value: 'Europe/Paris' },
  { label: '柏林', value: 'Europe/Berlin' },
  { label: '莫斯科', value: 'Europe/Moscow' },
  { label: '纽约', value: 'America/New_York' },
  { label: '多伦多', value: 'America/Toronto' },
  { label: '芝加哥', value: 'America/Chicago' },
  { label: '丹佛', value: 'America/Denver' },
  { label: '洛杉矶', value: 'America/Los_Angeles' },
  { label: '温哥华', value: 'America/Vancouver' },
  { label: '圣保罗', value: 'America/Sao_Paulo' },
]

function getTimezoneOffset(value: string): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: value,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(new Date())
      .find((item) => item.type === 'timeZoneName')?.value
    if (!part || part === 'GMT') return 'UTC+0'
    return part.replace('GMT', 'UTC')
  } catch {
    return ''
  }
}

async function selectTimezone(value: string): Promise<void> {
  if (savingTimezone.value) return
  const previousTimezone = profileForm.timezone
  profileForm.timezone = value
  timezoneMenuOpen.value = null
  if (value === previousTimezone) return
  savingTimezone.value = true
  try {
    const updatedUser = await updateCurrentUser({ timezone: value })
    authStore.setUser(updatedUser)
    syncProfileForm()
    ElMessage.success('时区已更新')
  } catch (error) {
    profileForm.timezone = previousTimezone
    ElMessage.error(getErrorMessage(error))
  } finally {
    savingTimezone.value = false
  }
}

function toggleTimezoneMenu(position: 'header' | 'profile'): void {
  accountMenuOpen.value = false
  timezoneMenuOpen.value = timezoneMenuOpen.value === position ? null : position
}

function syncProfileForm(): void {
  profileForm.name = user.value?.name || ''
  const savedTimezone = user.value?.timezone || user.value?.effectiveTimezone || 'Asia/Shanghai'
  profileForm.timezone = savedTimezone === 'UTC+8' ? 'Asia/Shanghai' : savedTimezone
}

async function loadProfile(): Promise<void> {
  loading.value = true
  try {
    authStore.setUser(await getCurrentUser())
    syncProfileForm()
  } catch {
    ElMessage.warning('暂时无法刷新账户资料，已显示本地登录信息。')
  } finally {
    loading.value = false
  }
}

async function saveProfile(): Promise<void> {
  if (savingProfile.value) return
  const name = profileForm.name.trim()
  if (!name) {
    ElMessage.warning('姓名不能为空')
    return
  }
  if (name.length > 100) {
    ElMessage.warning('姓名不能超过 100 个字符')
    return
  }
  savingProfile.value = true
  try {
    const updatedUser = await updateCurrentUser({ name })
    authStore.setUser(updatedUser)
    syncProfileForm()
    ElMessage.success('个人资料已保存')
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    savingProfile.value = false
  }
}

async function loadOAuthAccountList(): Promise<void> {
  loadingOAuthAccounts.value = true
  try {
    oauthAccounts.value = await getOAuthAccounts()
  } catch (error) {
    ElMessage.error(`无法读取第三方账号：${getErrorMessage(error)}`)
  } finally {
    loadingOAuthAccounts.value = false
  }
}

async function loadTwoFactorStatus(): Promise<void> {
  loadingTwoFactorStatus.value = true
  try {
    twoFactorEnabled.value = (await getTwoFactorStatus()).enabled
  } catch (error) {
    ElMessage.error(`无法读取两步验证状态：${getErrorMessage(error)}`)
  } finally {
    loadingTwoFactorStatus.value = false
  }
}

function normalizeTotpCode(event: Event): void {
  twoFactorCode.value = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6)
}

async function beginTwoFactorSetup(): Promise<void> {
  if (settingUpTwoFactor.value) return
  settingUpTwoFactor.value = true
  try {
    const setup = await setupTwoFactor()
    twoFactorSetup.value = setup
    twoFactorQrCode.value = await QRCode.toDataURL(setup.provisioning_uri, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
    twoFactorCode.value = ''
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      twoFactorEnabled.value = true
      ElMessage.info('两步验证已经启用')
    } else {
      ElMessage.error(getErrorMessage(error))
    }
  } finally {
    settingUpTwoFactor.value = false
  }
}

function cancelTwoFactorSetup(): void {
  twoFactorSetup.value = null
  twoFactorQrCode.value = ''
  twoFactorCode.value = ''
}

async function confirmTwoFactorSetup(): Promise<void> {
  if (!/^\d{6}$/.test(twoFactorCode.value)) {
    ElMessage.warning('请输入验证器 App 当前显示的 6 位动态码')
    return
  }
  enablingTwoFactor.value = true
  try {
    const response = await enableTwoFactor(twoFactorCode.value)
    backupCodes.value = response.backup_codes
    twoFactorEnabled.value = true
    twoFactorCode.value = ''
    ElMessage.success('两步验证已启用，请立即保存备份码')
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    enablingTwoFactor.value = false
  }
}

async function copyBackupCodes(): Promise<void> {
  try {
    await navigator.clipboard.writeText(backupCodes.value.join('\n'))
    ElMessage.success('备份码已复制，请保存到安全位置')
  } catch {
    ElMessage.warning('复制失败，请手动保存备份码')
  }
}

function finishBackupCodeStep(): void {
  backupCodes.value = []
  cancelTwoFactorSetup()
}

async function submitDisableTwoFactor(): Promise<void> {
  if (!disableTwoFactorForm.password) {
    ElMessage.warning('请输入当前登录密码')
    return
  }
  if (!disableTwoFactorForm.code.trim()) {
    ElMessage.warning('请输入 6 位动态码或备份码')
    return
  }
  disablingTwoFactor.value = true
  try {
    await disableTwoFactor({
      password: disableTwoFactorForm.password,
      code: disableTwoFactorForm.code.trim(),
    })
    twoFactorEnabled.value = false
    showDisableTwoFactor.value = false
    disableTwoFactorForm.password = ''
    disableTwoFactorForm.code = ''
    ElMessage.success('两步验证已关闭')
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    disablingTwoFactor.value = false
  }
}

function providerLabel(provider: string): string {
  const labels: Record<string, string> = { github: 'GitHub', google: 'Google' }
  return labels[provider.toLowerCase()] || provider
}

function providerMark(provider: string): string {
  const marks: Record<string, string> = { github: 'GH', google: 'G' }
  return marks[provider.toLowerCase()] || provider.slice(0, 2).toUpperCase()
}

function formatBoundDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatDeletionDate(value?: string | null): string {
  if (!value) return '30 天后'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

async function submitAccountDeletion(): Promise<void> {
  if (deletionConfirmation.value !== 'DELETE') {
    ElMessage.warning('请输入大写 DELETE 以确认注销账号')
    return
  }
  requestingDeletion.value = true
  try {
    const result = await requestAccountDeletion()
    await loadProfile()
    showDeletionConfirmation.value = false
    deletionConfirmation.value = ''
    ElMessage.success(result.detail || '注销申请已提交，账号已进入 30 天冷静期')
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    requestingDeletion.value = false
  }
}

async function cancelDeletion(): Promise<void> {
  cancellingDeletion.value = true
  try {
    await cancelAccountDeletion()
    await loadProfile()
    ElMessage.success('账号注销已撤销，账号及 API Key 已恢复')
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    cancellingDeletion.value = false
  }
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

async function updatePassword(): Promise<void> {
  if (updatingPassword.value) return
  if (!passwordForm.next || passwordForm.next.length < 8) {
    ElMessage.warning('新密码至少需要 8 位')
    return
  }
  if (passwordForm.next !== passwordForm.confirm) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  updatingPassword.value = true
  try {
    await setPassword({
      new_password: passwordForm.next,
      ...(passwordForm.current ? { current_password: passwordForm.current } : {}),
    })
    passwordForm.current = ''
    passwordForm.next = ''
    passwordForm.confirm = ''
    authStore.logout()
    ElMessage.success('密码已更新，请使用新密码重新登录')
    await router.replace('/login')
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    updatingPassword.value = false
  }
}

async function logout(): Promise<void> {
  accountMenuOpen.value = false
  const revoked = await authStore.logoutFromServer()
  if (!revoked) ElMessage.warning('已退出本地登录，但服务端令牌撤销请求未完成')
  await router.replace('/login')
}

function closeAccountMenu(): void {
  accountMenuOpen.value = false
  timezoneMenuOpen.value = null
}

function handleAccountMenuKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeAccountMenu()
}

onMounted(async () => {
  document.addEventListener('click', closeAccountMenu)
  document.addEventListener('keydown', handleAccountMenuKeydown)
  syncProfileForm()
  await Promise.all([loadProfile(), loadOAuthAccountList(), loadTwoFactorStatus()])
})
onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  document.removeEventListener('click', closeAccountMenu)
  document.removeEventListener('keydown', handleAccountMenuKeydown)
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
        <div class="timezone-picker header-timezone" @click.stop>
          <button
            class="compact-timezone-trigger"
            type="button"
            aria-haspopup="listbox"
            :aria-expanded="timezoneMenuOpen === 'header'"
            :disabled="savingTimezone"
            @click="toggleTimezoneMenu('header')"
          >
            <svg class="timezone-globe" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18" />
            </svg>
            {{ timezone }}
          </button>
          <div v-if="timezoneMenuOpen === 'header'" class="timezone-dropdown" role="listbox" aria-label="选择显示时区">
            <div class="timezone-dropdown-title">显示时区</div>
            <button
              v-for="item in timezoneOptions"
              :key="item.value"
              class="timezone-option"
              :class="{ selected: profileForm.timezone === item.value }"
              type="button"
              role="option"
              :aria-selected="profileForm.timezone === item.value"
              @click="selectTimezone(item.value)"
            >
              <span><strong>{{ item.label }}</strong><small>{{ item.value }} · {{ getTimezoneOffset(item.value) }}</small></span>
              <b v-if="profileForm.timezone === item.value" aria-hidden="true">✓</b>
            </button>
          </div>
        </div>
        <button type="button">中</button><button type="button">♧</button>
        <div class="account-menu" @click.stop>
          <button
            class="avatar"
            type="button"
            aria-label="打开账号菜单"
            aria-haspopup="menu"
            :aria-expanded="accountMenuOpen"
            @click="accountMenuOpen = !accountMenuOpen"
          >
            {{ user?.email?.slice(0, 1).toUpperCase() || 'O' }}
          </button>
          <div v-if="accountMenuOpen" class="account-dropdown" role="menu">
            <div class="account-email" :title="user?.email">{{ user?.email || '未知账号' }}</div>
            <RouterLink class="account-dropdown-item" to="/workspace/account" role="menuitem" @click="closeAccountMenu">
              账号设置
            </RouterLink>
            <button class="account-dropdown-item logout-item" type="button" role="menuitem" @click="logout">
              <span aria-hidden="true">↪</span>退出登录
            </button>
          </div>
        </div>
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
        <RouterLink class="side-item" to="/workspace/verification"><span>♢</span>实名认证</RouterLink>
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
          <div>
            <dt>显示时区</dt>
            <dd>
              <div class="timezone-picker profile-timezone" @click.stop>
                <button
                  class="compact-timezone-trigger"
                  type="button"
                  aria-haspopup="listbox"
                  :aria-expanded="timezoneMenuOpen === 'profile'"
                  :disabled="savingTimezone"
                  @click="toggleTimezoneMenu('profile')"
                >
                  <svg class="timezone-globe" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18" />
                  </svg>
                  {{ timezone }}
                </button>
                <div v-if="timezoneMenuOpen === 'profile'" class="timezone-dropdown" role="listbox" aria-label="选择显示时区">
                  <button
                    v-for="item in timezoneOptions"
                    :key="item.value"
                    class="timezone-option"
                    :class="{ selected: profileForm.timezone === item.value }"
                    type="button"
                    role="option"
                    :aria-selected="profileForm.timezone === item.value"
                    @click="selectTimezone(item.value)"
                  >
                    <span><strong>{{ item.label }}</strong><small>{{ item.value }} · {{ getTimezoneOffset(item.value) }}</small></span>
                    <b v-if="profileForm.timezone === item.value" aria-hidden="true">✓</b>
                  </button>
                </div>
              </div>
            </dd>
          </div>
        </dl>
        <form class="profile-edit-form" @submit.prevent="saveProfile">
          <label>
            显示姓名
            <input v-model="profileForm.name" type="text" maxlength="100" autocomplete="name" placeholder="请输入显示姓名" />
          </label>
          <button class="primary-button" type="submit" :disabled="savingProfile">
            {{ savingProfile ? '保存中…' : '保存个人资料' }}
          </button>
        </form>
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
          <button class="primary-button" type="submit" :disabled="updatingPassword">
            {{ updatingPassword ? '更新中…' : '更新密码' }}
          </button>
        </form>
      </section>

      <section class="content-card compact-card">
        <div class="oauth-card-heading">
          <h2>已绑定第三方账号</h2>
          <button type="button" :disabled="loadingOAuthAccounts" @click="loadOAuthAccountList">
            {{ loadingOAuthAccounts ? '刷新中…' : '刷新' }}
          </button>
        </div>
        <p v-if="loadingOAuthAccounts && oauthAccounts.length === 0" class="oauth-empty">正在读取绑定信息…</p>
        <p v-else-if="oauthAccounts.length === 0" class="oauth-empty">暂未绑定任何第三方账号。</p>
        <ul v-else class="oauth-account-list">
          <li v-for="account in oauthAccounts" :key="`${account.provider}-${account.email}`">
            <span class="provider-badge" :class="account.provider.toLowerCase()">
              {{ providerMark(account.provider) }}
            </span>
            <div class="provider-info">
              <strong>{{ providerLabel(account.provider) }}</strong>
              <span>{{ account.email }}</span>
            </div>
            <time :datetime="account.created_at">{{ formatBoundDate(account.created_at) }}</time>
          </li>
        </ul>
      </section>

      <section class="content-card security-card">
        <div><h2>♢ 两步验证（2FA）</h2><span :class="{ enabled: twoFactorEnabled }">{{ loadingTwoFactorStatus ? '读取中…' : twoFactorEnabled ? '已启用' : '未启用' }}</span></div>
        <p>在密码之外，再加一层来自验证器 App（Google Authenticator、Authy、1Password 等）的一次性动态码。</p>

        <section v-if="backupCodes.length" class="backup-code-panel">
          <h3>请立即保存备份码</h3>
          <p>这些备份码仅显示这一次。每个备份码只能使用一次，请保存到密码管理器或其他安全位置。</p>
          <ul><li v-for="code in backupCodes" :key="code"><code>{{ code }}</code></li></ul>
          <div class="security-actions">
            <button class="secondary-security-button" type="button" @click="copyBackupCodes">复制全部</button>
            <button class="primary-button" type="button" @click="finishBackupCodeStep">我已安全保存</button>
          </div>
        </section>

        <section v-else-if="twoFactorSetup" class="two-factor-setup">
          <p>用验证器 App 扫描二维码，或手动输入下方密钥：</p>
          <div class="qr-box"><img v-if="twoFactorQrCode" :src="twoFactorQrCode" alt="两步验证配置二维码" /></div>
          <div class="manual-secret"><span>手动密钥</span><code>{{ twoFactorSetup.secret }}</code></div>
          <label>输入验证器 App 显示的 6 位动态码
            <input v-model="twoFactorCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" @input="normalizeTotpCode" />
          </label>
          <div class="security-actions">
            <button class="primary-button" type="button" :disabled="enablingTwoFactor" @click="confirmTwoFactorSetup">{{ enablingTwoFactor ? '验证中…' : '验证并启用' }}</button>
            <button class="text-security-button" type="button" @click="cancelTwoFactorSetup">取消</button>
          </div>
        </section>

        <template v-else-if="!twoFactorEnabled">
          <button class="primary-button" type="button" :disabled="settingUpTwoFactor || loadingTwoFactorStatus" @click="beginTwoFactorSetup">{{ settingUpTwoFactor ? '正在生成…' : '启用两步验证' }}</button>
        </template>

        <template v-else>
          <button v-if="!showDisableTwoFactor" class="danger-outline-button" type="button" @click="showDisableTwoFactor = true">关闭两步验证</button>
          <form v-else class="disable-two-factor-form" @submit.prevent="submitDisableTwoFactor">
            <h3>关闭两步验证</h3>
            <p>关闭后账号安全性会降低。请使用登录密码和当前动态码或备份码确认。</p>
            <label>当前密码<input v-model="disableTwoFactorForm.password" type="password" autocomplete="current-password" placeholder="输入当前登录密码" /></label>
            <label>动态码或备份码<input v-model.trim="disableTwoFactorForm.code" type="text" autocomplete="one-time-code" placeholder="输入 6 位动态码或备份码" /></label>
            <div class="security-actions">
              <button class="danger-outline-button" type="submit" :disabled="disablingTwoFactor">{{ disablingTwoFactor ? '关闭中…' : '确认关闭' }}</button>
              <button class="text-security-button" type="button" @click="showDisableTwoFactor = false">取消</button>
            </div>
          </form>
        </template>
      </section>

      <section class="content-card danger-card">
        <template v-if="deletionPending">
          <h2>♙ 账号处于注销冷静期</h2>
          <p>账号和全部 API Key 当前已冻结。计划永久删除时间：<strong>{{ formatDeletionDate(user?.deletionScheduledAt) }}</strong>。在此之前可以撤销注销并恢复使用。</p>
          <button type="button" :disabled="cancellingDeletion" @click="cancelDeletion">{{ cancellingDeletion ? '撤销中…' : '撤销账号注销' }}</button>
        </template>
        <template v-else>
          <h2>♙ 注销账号</h2>
          <p>注销后账号进入 30 天冷静期，全部 API Key 立即冻结；期满将永久删除个人信息。冷静期内可随时撤销。</p>
          <button v-if="!showDeletionConfirmation" type="button" @click="showDeletionConfirmation = true">注销账号</button>
          <form v-else class="deletion-confirmation" @submit.prevent="submitAccountDeletion">
            <label>此操作会立即冻结全部 API Key。请输入大写 <strong>DELETE</strong> 确认：
              <input v-model="deletionConfirmation" type="text" autocomplete="off" placeholder="DELETE" />
            </label>
            <div class="security-actions">
              <button type="submit" :disabled="requestingDeletion || deletionConfirmation !== 'DELETE'">{{ requestingDeletion ? '提交中…' : '确认申请注销' }}</button>
              <button class="text-security-button" type="button" @click="showDeletionConfirmation = false; deletionConfirmation = ''">取消</button>
            </div>
          </form>
        </template>
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
.header-tools > button, .header-tools .account-menu > .avatar, .header-tools .header-timezone > .compact-timezone-trigger, .menu-button { padding: 0; border: 0; background: none; color: inherit; cursor: pointer; }
.header-tools .avatar { width: 34px; height: 34px; border-radius: 50%; background: #edf0f6; color: #25304a; font-weight: 700; }
.account-menu { position: relative; }
.account-dropdown { position: absolute; z-index: 60; top: calc(100% + 14px); right: 0; width: 250px; overflow: hidden; border: 1px solid #e4e8f0; border-radius: 10px; background: #fff; box-shadow: 0 10px 30px rgb(32 43 70 / 16%); color: #17213a; }
.account-email { overflow: hidden; padding: 17px 16px; border-bottom: 1px solid #edf0f5; color: #667896; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.account-dropdown-item { display: flex; width: 100%; min-height: 50px; align-items: center; gap: 12px; padding: 0 16px; border: 0; border-bottom: 1px solid #edf0f5; background: #fff; color: #17213a; font-size: 14px; text-align: left; cursor: pointer; }
.account-dropdown-item:last-child { border-bottom: 0; }
.account-dropdown-item:hover { background: #f7f8fc; }
.account-dropdown .logout-item { color: #ef3f1c; }
.logout-item span { font-size: 20px; line-height: 1; }
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
.profile-list > div { display: grid; grid-template-columns: 150px 1fr; }
.profile-list > div > dt { color: #91a3c7; }
.profile-list > div > dd { margin: 0; text-align: right; }
.unverified { margin-left: 8px; color: #ed8900; }.verified { margin-left: 8px; color: #13a262; }
.profile-edit-form { display: grid; gap: 17px; padding-top: 25px; margin-top: 25px; border-top: 1px solid #edf0f5; }
.profile-edit-form label { display: grid; gap: 9px; color: #61779b; font-size: 13px; }
.profile-edit-form input { height: 50px; padding: 0 16px; border: 1px solid #dbe3ef; border-radius: 10px; outline: 0; color: #1b2945; }
.profile-edit-form input:focus { border-color: #5a56ee; box-shadow: 0 0 0 3px rgb(90 86 238 / 10%); }
.profile-edit-form input::placeholder { color: #a5b3ce; }
.timezone-picker { position: relative; }
.compact-timezone-trigger { display: inline-flex; align-items: center; gap: 7px; padding: 4px 0; border: 0; background: #fff; color: #586d91; font-size: 13px; white-space: nowrap; cursor: pointer; }
.compact-timezone-trigger:hover, .compact-timezone-trigger[aria-expanded='true'] { color: #504cf0; }
.compact-timezone-trigger:disabled { opacity: .6; cursor: wait; }
.timezone-globe { width: 17px; height: 17px; fill: none; stroke: currentcolor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
.timezone-dropdown { position: absolute; z-index: 45; right: 0; display: block; width: 384px; max-width: calc(100vw - 32px); overflow-y: auto; padding: 0 8px 8px; border: 1px solid #dfe4ed; border-radius: 8px; background: #fff; box-shadow: 0 8px 24px rgb(31 44 75 / 16%); scrollbar-color: #858585 transparent; scrollbar-width: thin; }
.timezone-dropdown-title { position: sticky; z-index: 1; top: 0; padding: 17px 10px; border-bottom: 1px solid #edf0f5; background: #fff; color: #7183a3; font-size: 14px; }
.timezone-option { display: flex; width: 100%; min-height: 72px; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 10px; border: 0; border-radius: 4px; background: #fff; color: #17213a; text-align: left; cursor: pointer; }
.timezone-option > span { display: grid; gap: 4px; }
.timezone-option strong { font-size: 16px; font-weight: 400; }
.timezone-option small { color: #8da0c3; font-size: 13px; }
.timezone-option b { color: #5753f1; font-size: 16px; }
.timezone-option:hover, .timezone-option.selected { background: #f2f4f8; }
.header-timezone .timezone-dropdown { top: calc(100% + 25px); right: -70px; max-height: min(620px, calc(100vh - 90px)); }
.profile-timezone { display: inline-block; margin-left: auto; }
.profile-timezone .timezone-dropdown { top: auto; right: 0; bottom: calc(100% + 12px); max-height: min(500px, calc(100vh - 100px)); }
.email-panel { display: flex; gap: 16px; padding: 21px; margin-top: 28px; border: 1px solid #f1cb74; border-radius: 12px; background: #fff8e8; color: #dc7d00; }
.mail-icon { font-size: 20px; }.email-panel strong { font-size: 14px; }.email-panel p { margin: 7px 0 14px; font-size: 13px; }
.email-actions { display: flex; gap: 24px; align-items: center; }.warning-button, .text-button { border: 0; color: #dc7d00; cursor: pointer; }.warning-button { min-width: 116px; padding: 10px 17px; border-radius: 9px; background: #ffe7ad; }.warning-button:disabled { opacity: .65; cursor: not-allowed; }.text-button { background: none; }
.verification-form { display: flex; gap: 10px; margin-top: 16px; }.verification-form input { width: min(280px, 100%); height: 42px; padding: 0 13px; border: 1px solid #efc76b; border-radius: 8px; outline: 0; background: #fff; color: #3b3528; letter-spacing: .12em; }.verification-form input:focus { border-color: #e29a00; box-shadow: 0 0 0 3px rgb(226 154 0 / 10%); }.verification-form button { padding: 0 17px; border: 0; border-radius: 8px; background: #e99000; color: #fff; cursor: pointer; }.verification-form button:disabled { opacity: .65; cursor: wait; }
.password-form { display: grid; gap: 19px; }.password-form label { display: grid; gap: 9px; color: #61779b; font-size: 13px; }.password-form label span { color: #93a2bd; }.password-form input { height: 54px; padding: 0 18px; border: 1px solid #dbe3ef; border-radius: 10px; outline: 0; color: #1b2945; }.password-form input:focus { border-color: #5a56ee; box-shadow: 0 0 0 3px rgb(90 86 238 / 10%); }.password-form input::placeholder { color: #a5b3ce; }
.primary-button { width: fit-content; padding: 12px 25px; border: 0; border-radius: 10px; background: #5854f2; color: #fff; font-weight: 650; cursor: pointer; }.primary-button:disabled { opacity: .65; cursor: wait; }
.compact-card p, .security-card p, .danger-card p { margin: 0; color: #687d9f; font-size: 13px; line-height: 1.8; }.oauth-card-heading { display: flex; align-items: center; justify-content: space-between; }.oauth-card-heading h2 { margin-bottom: 20px; }.oauth-card-heading button { padding: 5px 0; border: 0; background: none; color: #5957e8; font-size: 12px; cursor: pointer; }.oauth-card-heading button:disabled { color: #9aa8c1; cursor: wait; }.oauth-empty { padding: 4px 0; }.oauth-account-list { padding: 0; margin: 0; list-style: none; }.oauth-account-list li { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 16px 0; border-top: 1px solid #edf0f5; }.oauth-account-list li:first-child { border-top: 0; }.provider-badge { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 9px; background: #eff1f6; color: #273248; font-size: 10px; font-weight: 800; }.provider-badge.google { color: #4285f4; background: #eef5ff; }.provider-badge.github { color: #fff; background: #202532; }.provider-info { display: flex; min-width: 0; gap: 14px; align-items: baseline; }.provider-info strong { font-size: 14px; }.provider-info span { overflow: hidden; color: #8292af; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }.oauth-account-list time { color: #7183a3; font-size: 12px; }.security-card > div { display: flex; justify-content: space-between; }.security-card > div span { color: #98a8c4; font-size: 13px; }.security-card > div span.enabled { color: #16a169; }.security-card > p { margin: -10px 0 20px; }.two-factor-setup > p, .backup-code-panel > p, .disable-two-factor-form > p { margin: 0 0 16px; }.qr-box { display: grid; min-height: 280px; place-items: center; border: 1px solid #dfe6f0; border-radius: 12px; background: #fff; }.qr-box img { width: 260px; height: 260px; }.manual-secret { display: flex; gap: 10px; align-items: center; margin: 14px 0 20px; color: #7183a3; font-size: 12px; }.manual-secret code { padding: 5px 8px; border-radius: 6px; background: #f0f3f8; color: #4d6388; overflow-wrap: anywhere; }.two-factor-setup label, .disable-two-factor-form label { display: grid; gap: 8px; margin-top: 14px; color: #61779b; font-size: 13px; }.two-factor-setup input, .disable-two-factor-form input { height: 50px; padding: 0 16px; border: 1px solid #dbe3ef; border-radius: 10px; outline: 0; }.two-factor-setup input:focus, .disable-two-factor-form input:focus { border-color: #5957e8; box-shadow: 0 0 0 3px rgb(89 87 232 / 10%); }.security-actions { display: flex; gap: 14px; align-items: center; margin-top: 18px; }.text-security-button { padding: 10px; border: 0; background: none; color: #687d9f; cursor: pointer; }.secondary-security-button { padding: 11px 18px; border: 1px solid #d9e0ed; border-radius: 9px; background: #fff; color: #526886; cursor: pointer; }.danger-outline-button { padding: 11px 18px; border: 1px solid #ef7c68; border-radius: 9px; background: #fff7f5; color: #e54529; cursor: pointer; }.danger-outline-button:disabled { opacity: .6; cursor: wait; }.backup-code-panel { padding: 20px; border: 1px solid #f1c668; border-radius: 12px; background: #fff9e9; }.backup-code-panel h3, .disable-two-factor-form h3 { margin: 0 0 10px; font-size: 15px; }.backup-code-panel ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 24px; padding: 14px 18px; border: 1px dashed #e6bd61; border-radius: 9px; background: #fff; list-style: decimal inside; }.backup-code-panel code { color: #2e3c55; font-size: 13px; letter-spacing: .06em; }.disable-two-factor-form { padding: 20px; border: 1px solid #f0c5bd; border-radius: 12px; background: #fffafa; }
.danger-card { border-color: #ffc0b5; }.danger-card h2 { color: #ef3f1c; }.danger-card p strong { color: #d93d22; }.danger-card button { padding: 10px 18px; margin-top: 18px; border: 0; border-radius: 8px; background: #fff0ed; color: #ed3d1c; cursor: pointer; }.danger-card button:disabled { opacity: .55; cursor: not-allowed; }.deletion-confirmation { padding: 18px; margin-top: 18px; border: 1px solid #ffc9bf; border-radius: 10px; background: #fffafa; }.deletion-confirmation label { display: grid; gap: 10px; color: #687d9f; font-size: 13px; }.deletion-confirmation input { height: 46px; padding: 0 14px; border: 1px solid #f1b7ad; border-radius: 8px; outline: 0; color: #b72f17; font-weight: 700; letter-spacing: .08em; }.deletion-confirmation input:focus { border-color: #ed5d43; box-shadow: 0 0 0 3px rgb(237 93 67 / 10%); }.deletion-confirmation .security-actions button { margin-top: 0; }.deletion-confirmation .text-security-button { background: none; color: #687d9f; }
@media (max-width: 900px) { .top-nav, .header-tools { display: none; }.menu-button { display: block; }.sidebar { top: 112px; transform: translateX(-100%); transition: transform .2s; box-shadow: 18px 0 40px rgb(35 48 82 / 12%); }.sidebar.open { transform: translateX(0); }.workspace-main { width: min(100% - 32px, 700px); margin: 0 auto; }.verify-banner { height: auto; min-height: 42px; }.verify-banner button { margin-left: 5px; } }
@media (max-width: 560px) { .workspace-header { height: 62px; padding: 0 17px; }.verify-banner { top: 62px; font-size: 11px; }.workspace-main { padding-top: 135px; }.content-card { padding: 24px 20px; border-radius: 15px; }.profile-list > div { grid-template-columns: 90px 1fr; }.email-actions { gap: 10px; flex-wrap: wrap; }.verification-form { flex-direction: column; }.verification-form input { width: 100%; }.verification-form button { height: 42px; }.provider-info { display: grid; gap: 3px; }.oauth-account-list time { grid-column: 2; }.brand { width: auto; } }
</style>
