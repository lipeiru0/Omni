<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'

import { getErrorMessage } from '@/api/errors'
import {
  createGifpayTopup,
  getAvailableBalance,
  getBalanceTransactions,
  getTopupHistory,
  getWalletBalance,
  type BalanceTransactionItem,
  type TopupHistoryItem,
} from '@/api/wallet'
import SiteHeader from '@/components/SiteHeader.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const mobileMenuOpen = ref(false)
const loading = ref(true)
const submitting = ref(false)
const balance = ref(0)
const currency = ref('USD')
const amount = ref(10)
const payMethod = ref<'alipay' | 'wxpay'>('alipay')
const topups = ref<TopupHistoryItem[]>([])
const transactions = ref<BalanceTransactionItem[]>([])
const presets = [10, 50, 100, 200]
const isEmailVerified = computed(() => Boolean(authStore.user?.emailVerifiedAt))
const debitTransactions = computed(() =>
  transactions.value.filter((item) => item.direction.toLowerCase() === 'debit'),
)

function money(value: number | string, unit = 'USD'): string {
  const prefix = unit === 'USD' ? '$' : `${unit} `
  return `${prefix}${(Number(value) || 0).toFixed(2)}`
}

function dateTime(value: string): string {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'
}

function statusText(status: string): string {
  const labels: Record<string, string> = {
    paid: '已到账',
    pending: '处理中',
    failed: '失败',
    cancelled: '已取消',
  }
  return labels[status.toLowerCase()] || status
}

async function loadWallet(): Promise<void> {
  loading.value = true
  try {
    const balanceData = await getWalletBalance()
    balance.value = getAvailableBalance(balanceData)
    currency.value = balanceData.currency || 'USD'
  } catch (error) {
    ElMessage.error(`无法读取余额：${getErrorMessage(error)}`)
  } finally {
    loading.value = false
  }

  const [topupResult, transactionResult] = await Promise.allSettled([
    getTopupHistory(),
    getBalanceTransactions(),
  ])
  if (topupResult.status === 'fulfilled') topups.value = topupResult.value
  if (transactionResult.status === 'fulfilled') transactions.value = transactionResult.value
}

async function recharge(): Promise<void> {
  const value = Number(amount.value)
  if (!Number.isFinite(value) || value < 0.1 || value > 10000) {
    ElMessage.warning('充值金额需在 $0.10 至 $10,000 之间')
    return
  }
  submitting.value = true
  try {
    const result = await createGifpayTopup({
      amount: value,
      pay_method: payMethod.value,
      idempotency_key: crypto.randomUUID().replace(/-/g, ''),
    })
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = result.checkout_url
    Object.entries(result.fields).forEach(([name, fieldValue]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = String(fieldValue)
      form.appendChild(input)
    })
    document.body.appendChild(form)
    form.submit()
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
    submitting.value = false
  }
}

onMounted(() => void loadWallet())
</script>

<template>
  <div class="wallet-shell">
    <SiteHeader show-mobile-menu @toggle-menu="mobileMenuOpen = !mobileMenuOpen" />
    <div v-if="!isEmailVerified" class="verify-banner">
      你的邮箱尚未验证——验证后才能找回密码、接收账单与安全通知。
      <RouterLink to="/workspace/account">立即验证 →</RouterLink>
    </div>
    <aside class="sidebar" :class="{ open: mobileMenuOpen }">
      <div class="sidebar-scroll">
        <p class="nav-heading">开发</p>
        <RouterLink class="side-item" to="/workspace/overview"><span>▦</span>概览</RouterLink>
        <button class="side-item" type="button"><span>⌁</span>API 密钥</button>
        <button class="side-item" type="button"><span>▧</span>素材库</button>
        <RouterLink class="side-item active" to="/workspace/wallet"><span>▣</span>钱包</RouterLink>
        <button class="side-item" type="button"><span>⌗</span>用量</button>
        <button class="side-item" type="button"><span>◴</span>限流状态</button>
        <button class="side-item" type="button"><span>⌘</span>路由设置</button>
        <button class="side-item" type="button"><span>↶</span>退款</button>
        <div class="nav-divider"></div>
        <p class="nav-heading">账号</p>
        <RouterLink class="side-item" to="/workspace/account"><span>◎</span>账户</RouterLink>
        <RouterLink class="side-item" to="/workspace/verification"
          ><span>♢</span>实名认证</RouterLink
        >
      </div>
      <div class="sidebar-balance">
        <span>可用余额</span><strong>{{ money(balance, currency) }}</strong>
      </div>
    </aside>

    <main class="wallet-main" v-loading="loading">
      <div class="page-title">
        <span>WORKSPACE / WALLET</span>
        <h1>钱包</h1>
        <p>管理余额、充值与消费记录。</p>
      </div>
      <section class="balance-card">
        <span>当前可用余额</span>
        <div>
          <strong>{{ money(balance, currency) }}</strong
          ><small>{{ currency }}</small>
        </div>
        <p>余额将在 API 调用后按模型实际价格扣除</p>
      </section>
      <section class="panel recharge-panel">
        <div class="panel-title">
          <div>
            <span>TOP UP</span>
            <h2>余额充值</h2>
          </div>
          <p>选择金额和支付方式，支付成功后余额自动到账。</p>
        </div>
        <div class="preset-grid">
          <button
            v-for="item in presets"
            :key="item"
            type="button"
            :class="{ selected: amount === item }"
            @click="amount = item"
          >
            ${{ item }}
          </button>
        </div>
        <label class="amount-input">
          <span>充值金额（USD）</span>
          <input v-model.number="amount" type="number" min="0.1" max="10000" step="0.01" />
        </label>
        <div class="pay-row">
          <div class="pay-methods">
            <button
              type="button"
              :class="{ selected: payMethod === 'alipay' }"
              @click="payMethod = 'alipay'"
            >
              支付宝
            </button>
            <button
              type="button"
              :class="{ selected: payMethod === 'wxpay' }"
              @click="payMethod = 'wxpay'"
            >
              微信支付
            </button>
          </div>
          <button class="recharge-button" type="button" :disabled="submitting" @click="recharge">
            {{ submitting ? '正在创建订单…' : '立即充值' }}
          </button>
        </div>
      </section>
      <section class="panel">
        <div class="panel-title">
          <div>
            <span>TOP-UP HISTORY</span>
            <h2>充值记录</h2>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>金额</th>
                <th>渠道</th>
                <th>状态</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody v-if="topups.length">
              <tr v-for="item in topups" :key="item.order_id">
                <td>{{ money(item.amount, item.currency) }}</td>
                <td>{{ item.channel }}</td>
                <td>
                  <span class="status" :class="item.status.toLowerCase()">{{
                    statusText(item.status)
                  }}</span>
                </td>
                <td>{{ dateTime(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!topups.length" class="empty">暂无充值记录，充值后将在此展示。</div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-title">
          <div>
            <span>USAGE TRANSACTIONS</span>
            <h2>消费记录（扣费明细）</h2>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>类型</th>
                <th>金额</th>
                <th>说明</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody v-if="debitTransactions.length">
              <tr v-for="item in debitTransactions" :key="item.id">
                <td>{{ item.txn_type }}</td>
                <td>-{{ money(Math.abs(Number(item.amount)), item.currency) }}</td>
                <td>{{ item.model_display_name || item.remark || '模型调用' }}</td>
                <td>{{ dateTime(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!debitTransactions.length" class="empty">
            暂无消费记录。调用模型产生扣费后将在此展示。
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.wallet-shell {
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
  display: flex;
  justify-content: space-between;
  padding: 14px 16px;
  margin: auto 14px 14px;
  border-radius: 10px;
  background: #f3f6fc;
  font-size: 12px;
}
.wallet-main {
  width: min(1020px, calc(100% - 330px));
  padding: 150px 0 70px;
  margin-left: max(305px, calc(50% - 375px));
}
.page-title > span,
.panel-title span {
  color: #5957e8;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
}
.page-title h1 {
  margin: 5px 0 3px;
  font-size: 26px;
}
.page-title p {
  margin: 0 0 14px;
  color: #78839a;
  font-size: 12px;
}
.balance-card {
  box-sizing: border-box;
  width: min(610px, 58%);
  min-height: 0;
  padding: 18px 24px;
  border-radius: 14px;
  background: linear-gradient(135deg, #615dff, #4442db);
  color: #fff;
  box-shadow: 0 14px 36px rgb(70 66 219 / 18%);
}
.balance-card > span {
  color: #dedfff;
  font-size: 11px;
}
.balance-card > div {
  display: flex;
  gap: 8px;
  align-items: end;
  margin-top: 5px;
}
.balance-card strong {
  font-size: 30px;
  letter-spacing: -0.04em;
}
.balance-card small {
  padding-bottom: 4px;
  color: #d8d8ff;
  font-size: 10px;
}
.balance-card p {
  margin: 5px 0 0;
  color: #dedfff;
  font-size: 10px;
}
.panel {
  padding: 23px 28px;
  margin-top: 16px;
  border: 1px solid #e1e5ef;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 34px rgb(27 38 73 / 5%);
}
.panel-title {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
}
.panel-title h2 {
  margin: 5px 0 0;
  font-size: 16px;
}
.panel-title p {
  margin: 0;
  color: #7a859d;
  font-size: 12px;
}
.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 18px;
}
.preset-grid button,
.pay-methods button {
  height: 40px;
  border: 1px solid #e0e5f0;
  border-radius: 9px;
  background: #fff;
  color: #5d6984;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
}
.preset-grid button.selected,
.pay-methods button.selected {
  border-color: #615dff;
  background: #efefff;
  color: #4e4be8;
}
.amount-input {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  color: #6b7892;
  font-size: 13px;
}
.amount-input input {
  height: 44px;
  padding: 0 14px;
  border: 1px solid #dde3ef;
  border-radius: 9px;
  outline: 0;
  font: inherit;
  font-size: 14px;
}
.amount-input input:focus {
  border-color: #6864ff;
}
.pay-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 14px;
}
.pay-methods {
  display: flex;
  gap: 10px;
}
.pay-methods button {
  min-width: 92px;
}
.recharge-button {
  height: 42px;
  padding: 0 21px;
  border: 0;
  border-radius: 9px;
  background: #5652f2;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
}
.recharge-button:disabled {
  cursor: wait;
  opacity: 0.6;
}
.table-wrap {
  position: relative;
  overflow: hidden;
  margin-top: 16px;
  border: 1px solid #e1e6f0;
  border-radius: 14px;
}
.table-wrap table {
  width: 100%;
  border-collapse: collapse;
}
.table-wrap th,
.table-wrap td {
  padding: 12px 15px;
  border-bottom: 1px solid #e8ecf3;
  text-align: left;
  font-size: 12px;
}
.table-wrap th {
  background: #f7f8fb;
  color: #8c9ab6;
}
.table-wrap td {
  color: #55647f;
}
.status {
  color: #866c1d;
}
.status.paid {
  color: #15945a;
}
.status.failed,
.status.cancelled {
  color: #cf4c4c;
}
.empty {
  padding: 38px 20px;
  color: #96a4c1;
  text-align: center;
  font-size: 12px;
}
@media (max-width: 760px) {
  .sidebar {
    z-index: 60;
    width: min(290px, 84vw);
    transform: translateX(-105%);
    transition: 0.2s;
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .wallet-main {
    width: calc(100% - 28px);
    padding-top: 142px;
    margin: 0 auto;
  }
  .balance-card {
    width: 100%;
  }
  .panel-title,
  .pay-row {
    align-items: stretch;
    flex-direction: column;
  }
  .preset-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .table-wrap {
    overflow-x: auto;
  }
  .table-wrap table {
    min-width: 650px;
  }
}
@media (max-width: 540px) {
  .verify-banner {
    top: 64px;
    height: auto;
    padding: 9px 12px;
    font-size: 11px;
  }
  .sidebar {
    top: 112px;
  }
  .balance-card,
  .panel {
    padding: 24px 20px;
  }
  .balance-card strong {
    font-size: 28px;
  }
  .pay-methods {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .recharge-button {
    width: 100%;
  }
}
</style>
