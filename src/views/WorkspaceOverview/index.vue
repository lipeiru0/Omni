<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'

import { getErrorMessage } from '@/api/errors'
import { getAvailableBalance, getWalletBalance } from '@/api/wallet'
import SiteHeader from '@/components/SiteHeader.vue'
import { useAuthStore } from '@/stores/auth'

interface NavItem {
  icon: string
  label: string
  route?: string
}

const authStore = useAuthStore()
const mobileMenuOpen = ref(false)
const balance = ref<number | null>(null)
const currency = ref('USD')

const primaryNav: NavItem[] = [
  { icon: '▦', label: '概览', route: '/workspace/overview' },
  { icon: '⌁', label: 'API 密钥' },
  { icon: '▧', label: '素材库' },
  { icon: '▣', label: '钱包', route: '/workspace/wallet' },
  { icon: '⌗', label: '用量' },
  { icon: '◴', label: '限流状态' },
  { icon: '⌘', label: '路由设置' },
  { icon: '↶', label: '退款' },
  { icon: '▥', label: '组织' },
]

const isEmailVerified = computed(() => Boolean(authStore.user?.emailVerifiedAt))
const displayName = computed(
  () => authStore.user?.name?.trim() || authStore.user?.email?.split('@')[0] || '新用户',
)
const displayBalance = computed(() =>
  balance.value === null ? '—' : `$${balance.value.toFixed(2)}`,
)

const curlCommand = `curl https://intertoken.ai/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"openai/gpt-4o","messages":[{"role":"user","content":"Hello!"}]}'`

function showComingSoon(label: string): void {
  ElMessage.info(`${label}功能将在后续页面中接入。`)
}

async function copyCurl(): Promise<void> {
  try {
    await navigator.clipboard.writeText(curlCommand)
    ElMessage.success('curl 命令已复制')
  } catch {
    ElMessage.warning('复制失败，请手动选择命令')
  }
}

async function loadBalance(): Promise<void> {
  try {
    const data = await getWalletBalance()
    balance.value = getAvailableBalance(data)
    currency.value = data.currency || 'USD'
  } catch (error) {
    ElMessage.error(`无法读取余额：${getErrorMessage(error)}`)
  }
}

onMounted(() => void loadBalance())
</script>

<template>
  <div class="overview-shell">
    <SiteHeader show-mobile-menu @toggle-menu="mobileMenuOpen = !mobileMenuOpen" />

    <div v-if="!isEmailVerified" class="verify-banner">
      你的邮箱尚未验证——验证后才能找回密码、接收账单与安全通知。
      <RouterLink to="/workspace/account">立即验证 →</RouterLink>
    </div>

    <aside class="sidebar" :class="{ open: mobileMenuOpen }">
      <div class="sidebar-scroll">
        <p class="nav-heading">开发</p>
        <template v-for="item in primaryNav" :key="item.label">
          <RouterLink
            v-if="item.route"
            class="side-item active"
            :to="item.route"
            @click="mobileMenuOpen = false"
          >
            <span>{{ item.icon }}</span
            >{{ item.label }}
          </RouterLink>
          <button v-else type="button" class="side-item" @click="showComingSoon(item.label)">
            <span>{{ item.icon }}</span
            >{{ item.label }}
          </button>
        </template>
        <div class="nav-divider"></div>
        <p class="nav-heading">账号</p>
        <RouterLink class="side-item" to="/workspace/account"> <span>◎</span>账户 </RouterLink>
        <RouterLink class="side-item" to="/workspace/verification">
          <span>♢</span>实名认证
        </RouterLink>
        <button type="button" class="side-item" @click="showComingSoon('通知')">
          <span>♧</span>通知
        </button>
        <div class="nav-divider"></div>
        <p class="nav-heading">供应商</p>
        <button type="button" class="side-item" @click="showComingSoon('供应商申请')">
          <span>✣</span>申请成为供应商
        </button>
        <div class="nav-divider"></div>
        <p class="nav-heading">分销商</p>
        <button type="button" class="side-item" @click="showComingSoon('分销商申请')">
          <span>⌯</span>申请成为分销商
        </button>
      </div>
      <div class="sidebar-balance">
        <span>可用余额</span><strong>{{ displayBalance }}</strong
        ><small>账户币种</small><em>{{ currency }}</em>
      </div>
    </aside>

    <main class="overview-main">
      <div class="welcome-row">
        <div>
          <span>WORKSPACE OVERVIEW</span>
          <h1>你好，{{ displayName }}</h1>
          <p>欢迎来到 OmniMind，你的首笔 API 调用已经准备就绪。</p>
        </div>
        <RouterLink to="/models">浏览模型 →</RouterLink>
      </div>

      <section class="summary-grid">
        <article class="balance-hero">
          <div class="balance-head">
            <span>当前可用余额</span>
            <b>新用户专享</b>
          </div>
          <div class="balance-value">
            <strong>{{ displayBalance }}</strong
            ><span>{{ currency }}</span>
          </div>
          <p><i>✓</i> 可用余额已从账户数据库实时读取</p>
          <div class="balance-actions">
            <RouterLink to="/workspace/wallet">充值</RouterLink>
            <button type="button" @click="showComingSoon('API 密钥')">创建 API Key</button>
          </div>
          <div class="balance-orbit" aria-hidden="true">
            <i></i><span>{{ displayBalance }}</span>
          </div>
        </article>

        <article class="snapshot-card">
          <div class="card-heading">
            <div>
              <span>QUICK SNAPSHOT</span>
              <h2>快速概览</h2>
            </div>
            <i>↗</i>
          </div>
          <dl>
            <div>
              <dt>本月 API 调用</dt>
              <dd>0</dd>
            </div>
            <div>
              <dt>API 密钥</dt>
              <dd>尚未创建</dd>
            </div>
            <div>
              <dt>当前套餐</dt>
              <dd>新用户赠送额度</dd>
            </div>
            <div>
              <dt>账户状态</dt>
              <dd class="status">● 正常</dd>
            </div>
          </dl>
        </article>
      </section>

      <section class="quick-start-card">
        <div class="section-heading">
          <div>
            <span>QUICK START</span>
            <h2>30 秒发出第一个 API 请求</h2>
          </div>
          <p>赠送的 $1.00 已经到账，按照下面三步即可开始。</p>
        </div>

        <div class="steps">
          <article>
            <span class="step-number">01</span>
            <div class="step-content">
              <h3>创建 API Key</h3>
              <p>生成一个用于调用 OmniMind 接口的访问密钥。</p>
              <button type="button" @click="showComingSoon('API 密钥')">创建默认 Key →</button>
            </div>
          </article>

          <article>
            <span class="step-number">02</span>
            <div class="step-content code-step">
              <div class="code-title">
                <div><i></i><i></i><i></i><span>terminal</span></div>
                <button type="button" @click="copyCurl">复制</button>
              </div>
              <pre><code>{{ curlCommand }}</code></pre>
            </div>
          </article>

          <article>
            <span class="step-number done">03</span>
            <div class="step-content">
              <h3>发出第一个请求</h3>
              <p>将 <code>YOUR_API_KEY</code> 替换为你的密钥，然后在终端运行。</p>
              <RouterLink to="/models">先选择一个模型 →</RouterLink>
            </div>
          </article>
        </div>
      </section>

      <section class="activity-card">
        <div class="activity-copy">
          <span class="activity-icon">⌁</span>
          <div>
            <h2>最近使用</h2>
            <p>还没有 API 调用记录。创建密钥并发出请求后，数据会显示在这里。</p>
          </div>
        </div>
        <button type="button" @click="showComingSoon('用量')">查看用量 →</button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.overview-shell {
  min-height: 100vh;
  background: #f6f7fc;
  color: #12182d;
}
.verify-banner {
  position: fixed;
  z-index: 25;
  top: 72px;
  right: 0;
  left: 0;
  height: 44px;
  padding: 11px 24px;
  border-bottom: 1px solid #f1ca67;
  background: #fff9e5;
  color: #ad6500;
  text-align: center;
  font-size: 13px;
}
.verify-banner a {
  margin-left: 14px;
  color: #8f5100;
  font-weight: 800;
}
.sidebar {
  position: fixed;
  z-index: 20;
  top: 116px;
  bottom: 0;
  left: 0;
  display: flex;
  width: 268px;
  flex-direction: column;
  border-right: 1px solid #e2e6ef;
  background: #fff;
}
.sidebar-scroll {
  overflow-y: auto;
  padding: 20px 14px;
}
.nav-heading {
  margin: 5px 14px 8px;
  color: #98a8c8;
  font-size: 12px;
  font-weight: 700;
}
.side-item {
  display: flex;
  width: 100%;
  height: 44px;
  align-items: center;
  gap: 13px;
  padding: 0 15px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: #587096;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  text-align: left;
  text-decoration: none;
}
.side-item span {
  width: 18px;
  color: #91a3c7;
  font-size: 17px;
  text-align: center;
}
.side-item:hover,
.side-item.active {
  background: #eef1ff;
  color: #4d4bea;
}
.nav-divider {
  height: 1px;
  margin: 13px 0;
  background: #e7ebf3;
}
.sidebar-balance {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 5px;
  padding: 13px 16px;
  margin: auto 14px 14px;
  border-radius: 10px;
  background: #f3f6fc;
  font-size: 11px;
}
.sidebar-balance small,
.sidebar-balance em {
  color: #18a262;
  font-style: normal;
}
.overview-main {
  width: min(1180px, calc(100% - 330px));
  padding: 150px 0 70px;
  margin-left: max(305px, calc(50% - 445px));
}
.welcome-row {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 26px;
}
.welcome-row > div > span,
.section-heading span,
.card-heading > div > span {
  color: #5957e8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
}
.welcome-row h1 {
  margin: 7px 0 5px;
  font-size: 36px;
  letter-spacing: -0.045em;
}
.welcome-row p {
  margin: 0;
  color: #758099;
  font-size: 14px;
}
.welcome-row > a {
  color: #5957e8;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.balance-hero,
.snapshot-card,
.quick-start-card,
.activity-card {
  border: 1px solid #e1e5ef;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 34px rgb(27 38 73 / 5%);
}
.balance-hero {
  position: relative;
  overflow: hidden;
  min-height: 200px;
  padding: 22px 26px;
  background: linear-gradient(135deg, #615dff, #4442db);
  color: #fff;
}
.balance-head {
  display: flex;
  gap: 14px;
  align-items: center;
}
.balance-head > span {
  color: #e7e6ff;
  font-size: 12px;
}
.balance-head b {
  padding: 4px 9px;
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 999px;
  background: rgb(255 255 255 / 12%);
  color: #fff;
  font-size: 10px;
}
.balance-value {
  display: flex;
  gap: 10px;
  align-items: end;
  margin-top: 8px;
}
.balance-value strong {
  font-size: 38px;
  letter-spacing: -0.05em;
  line-height: 1;
}
.balance-value span {
  padding-bottom: 4px;
  color: #dcdcff;
  font-size: 12px;
}
.balance-hero > p {
  margin: 9px 0 0;
  color: #dedfff;
  font-size: 11px;
}
.balance-hero > p i {
  color: #8ef0bc;
  font-style: normal;
}
.balance-actions {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.balance-actions a,
.balance-actions button {
  padding: 8px 12px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 10px;
  background: rgb(255 255 255 / 14%);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
}
.balance-actions a:hover,
.balance-actions button:hover {
  background: rgb(255 255 255 / 22%);
}
.balance-orbit {
  position: absolute;
  right: -38px;
  bottom: -58px;
  display: grid;
  width: 150px;
  height: 150px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 50%;
}
.balance-orbit::before {
  width: 92px;
  height: 92px;
  border: 1px dashed rgb(255 255 255 / 24%);
  border-radius: 50%;
  content: '';
}
.balance-orbit i {
  position: absolute;
  top: 29px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 6px rgb(255 255 255 / 14%);
}
.balance-orbit span {
  position: absolute;
  color: rgb(255 255 255 / 72%);
  font-size: 20px;
  font-weight: 800;
}
.snapshot-card {
  padding: 22px 26px;
}
.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-heading h2,
.section-heading h2,
.activity-card h2 {
  margin: 5px 0 0;
  font-size: 18px;
  letter-spacing: -0.025em;
}
.card-heading > i {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 10px;
  background: #f1f1ff;
  color: #5957e8;
  font-style: normal;
}
.snapshot-card dl {
  display: grid;
  gap: 0;
  margin: 12px 0 0;
}
.snapshot-card dl > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 31px;
  border-bottom: 1px solid #eef0f5;
}
.snapshot-card dl > div:last-child {
  border-bottom: 0;
}
.snapshot-card dt {
  color: #778198;
  font-size: 11px;
}
.snapshot-card dd {
  margin: 0;
  color: #1e273d;
  font-size: 11px;
  font-weight: 700;
}
.snapshot-card dd.status {
  color: #18a262;
}
.quick-start-card {
  padding: 32px 36px;
  margin-top: 20px;
}
.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e8ebf2;
}
.section-heading p {
  margin: 0;
  color: #748097;
  font-size: 13px;
}
.steps {
  display: grid;
  gap: 0;
}
.steps article {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 14px;
  padding: 22px 0;
  border-bottom: 1px solid #edf0f5;
}
.steps article:last-child {
  border-bottom: 0;
}
.step-number {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 50%;
  background: #5957e8;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}
.step-number.done {
  background: #eaf8f1;
  color: #189d61;
}
.step-content h3 {
  margin: 2px 0 7px;
  font-size: 16px;
}
.step-content > p {
  margin: 0;
  color: #778198;
  font-size: 13px;
  line-height: 1.7;
}
.step-content > p code {
  padding: 2px 5px;
  border-radius: 5px;
  background: #f0f1f5;
  color: #4d5362;
}
.step-content > button,
.step-content > a {
  display: inline-flex;
  width: fit-content;
  padding: 9px 13px;
  margin-top: 13px;
  border: 0;
  border-radius: 9px;
  background: #5957e8;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}
.code-step {
  overflow: hidden;
  border-radius: 13px;
  background: #171c2e;
}
.code-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #30364a;
  color: #9ca6c0;
}
.code-title > div {
  display: flex;
  gap: 6px;
  align-items: center;
}
.code-title i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4d566e;
}
.code-title span {
  margin-left: 5px;
  font-size: 10px;
}
.code-title button {
  border: 0;
  background: none;
  color: #b9c2d8;
  cursor: pointer;
  font-size: 11px;
}
.code-step pre {
  overflow-x: auto;
  padding: 17px 19px;
  margin: 0;
  color: #dce4fa;
  font-size: 12px;
  line-height: 1.75;
}
.activity-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 26px 30px;
  margin-top: 20px;
}
.activity-copy {
  display: flex;
  gap: 16px;
  align-items: center;
}
.activity-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 12px;
  background: #f0efff;
  color: #5957e8;
  font-size: 19px;
}
.activity-card p {
  margin: 6px 0 0;
  color: #7b859a;
  font-size: 13px;
}
.activity-card > button {
  flex: 0 0 auto;
  border: 0;
  background: none;
  color: #5957e8;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}
@media (max-width: 1050px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .overview-main {
    width: calc(100% - 318px);
    margin-left: 292px;
  }
}
@media (max-width: 760px) {
  .sidebar {
    z-index: 60;
    width: min(290px, 84vw);
    box-shadow: 12px 0 35px rgb(26 34 62 / 14%);
    transform: translateX(-105%);
    transition: transform 0.2s ease;
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .overview-main {
    width: calc(100% - 32px);
    padding-top: 146px;
    margin: 0 auto;
  }
  .welcome-row,
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 540px) {
  .verify-banner {
    top: 64px;
    height: auto;
    min-height: 48px;
    padding: 9px 12px;
    font-size: 11px;
  }
  .verify-banner a {
    margin-left: 6px;
  }
  .sidebar {
    top: 112px;
  }
  .overview-main {
    width: calc(100% - 24px);
    padding-top: 138px;
  }
  .welcome-row h1 {
    font-size: 30px;
  }
  .balance-hero,
  .snapshot-card,
  .quick-start-card {
    padding: 24px 20px;
  }
  .balance-value strong {
    font-size: 44px;
  }
  .balance-actions {
    align-items: stretch;
    flex-direction: column;
  }
  .balance-actions a,
  .balance-actions button {
    text-align: center;
  }
  .steps article {
    grid-template-columns: 36px 1fr;
    gap: 10px;
  }
  .step-number {
    width: 30px;
    height: 30px;
  }
  .code-step pre {
    font-size: 10px;
  }
  .activity-card {
    align-items: flex-start;
    flex-direction: column;
    padding: 23px 20px;
  }
}
</style>
