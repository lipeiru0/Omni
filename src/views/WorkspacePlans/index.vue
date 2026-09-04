<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import SiteHeader from '@/components/SiteHeader.vue'

interface Plan {
  name: string
  price: string
  family?: string
  discount: string
  modelCount: number
  quota?: string
}

interface SupportedModel {
  name: string
  tier: '高性价比' | '高质量'
}

const selectedPlan = ref<Plan | null>(null)

const tokenPackModels: SupportedModel[] = [
  { name: 'Claude Opus 4.8', tier: '高性价比' },
  { name: 'Claude Opus 4.7', tier: '高性价比' },
  { name: 'Claude Sonnet 5', tier: '高性价比' },
  { name: 'GPT-5.6 Sol', tier: '高性价比' },
  { name: 'GPT-5.5', tier: '高性价比' },
  { name: 'GPT-5.6 Terra', tier: '高性价比' },
  { name: 'GPT-5.6 Luna', tier: '高性价比' },
  { name: 'GPT-5.4 Mini', tier: '高性价比' },
  { name: 'Claude Fable 5', tier: '高性价比' },
  { name: 'Claude Opus 4.8', tier: '高质量' },
  { name: 'Claude Opus 5', tier: '高性价比' },
]

const deepseekPackModels: SupportedModel[] = [
  { name: 'DeepSeek V4 Flash', tier: '高质量' },
  { name: 'DeepSeek V4 Pro', tier: '高质量' },
]

const plans: Plan[] = [
  {
    name: 'Lite',
    family: 'Token Pack',
    price: '$9.90',
    discount: '5.3 折',
    modelCount: 11,
    quota: '$9.00',
  },
  {
    name: 'Std',
    family: 'Token Pack',
    price: '$19.90',
    discount: '5.0 折',
    modelCount: 11,
    quota: '$19.00',
  },
  {
    name: 'Pro',
    family: 'Token Pack',
    price: '$29.90',
    discount: '4.9 折',
    modelCount: 11,
    quota: '$29.00',
  },
  {
    name: 'Deepseek Token Pack',
    price: '$9.90',
    discount: '7.0 折',
    modelCount: 2,
    quota: '$9.90',
  },
]

function showPlanDetail(plan: Plan): void {
  selectedPlan.value = plan
}

function getPlanModels(plan: Plan): SupportedModel[] {
  return plan.family ? tokenPackModels : deepseekPackModels
}

function buyPlan(plan: Plan): void {
  ElMessage.info(`${plan.name} 购买接口尚未接入。`)
}

function closePlanDetail(): void {
  selectedPlan.value = null
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closePlanDetail()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="plans-shell">
    <SiteHeader />

    <main class="plans-main">
      <section class="balance-panel">
        <div class="balance-icon">◇</div>
        <div><span>当前可用余额</span><strong>$1.00</strong></div>
        <p>余额将在 API 调用后按模型实际价格扣除</p>
        <RouterLink to="/workspace/account">查看账户明细 <span>→</span></RouterLink>
      </section>

      <section class="plans-section">
        <div class="section-heading">
          <div>
            <span>套餐</span>
            <h1>选择适合您的套餐</h1>
          </div>
          <p>按月订阅，额度可用于套餐支持的模型。</p>
        </div>

        <div class="bundle-heading">
          <strong>Token Pack</strong>
          <span>3 个版本 · $9.90 起 · 最低 4.9 折</span>
        </div>
        <div class="plan-grid">
          <article v-for="plan in plans.slice(0, 3)" :key="plan.name" class="plan-card">
            <header>
              <div>
                <h3>{{ plan.name }}</h3>
                <p v-if="plan.family">{{ plan.family }}</p>
              </div>
              <span class="discount-badge">{{ plan.discount }}</span>
            </header>
            <ul>
              <li><span>✓</span>支持模型：{{ plan.modelCount }}</li>
              <li><span>✓</span>计费周期：按月订阅</li>
            </ul>
            <div class="plan-price">
              <strong>{{ plan.price }}</strong
              ><span>/月</span>
            </div>
            <div class="plan-actions">
              <button type="button" class="detail-button" @click="showPlanDetail(plan)">
                查看详情
              </button>
              <button type="button" class="buy-button" @click="buyPlan(plan)">立即购买</button>
            </div>
          </article>
        </div>

        <div class="standalone-grid">
          <article v-for="plan in plans.slice(3)" :key="plan.name" class="plan-card">
            <header>
              <div>
                <h3>{{ plan.name }}</h3>
              </div>
              <span class="discount-badge">{{ plan.discount }}</span>
            </header>
            <ul>
              <li><span>✓</span>支持模型：{{ plan.modelCount }}</li>
              <li><span>✓</span>计费周期：按月订阅</li>
            </ul>
            <div class="plan-price">
              <strong>{{ plan.price }}</strong
              ><span>/月</span>
            </div>
            <div class="plan-actions">
              <button type="button" class="detail-button" @click="showPlanDetail(plan)">
                查看详情
              </button>
              <button type="button" class="buy-button" @click="buyPlan(plan)">立即购买</button>
            </div>
          </article>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <div
        v-if="selectedPlan"
        class="plan-modal-backdrop"
        role="presentation"
        @mousedown.self="closePlanDetail"
      >
        <section
          class="plan-modal"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`plan-dialog-${selectedPlan.name}`"
        >
          <button class="modal-close" type="button" aria-label="关闭" @click="closePlanDetail">
            ×
          </button>

          <header class="modal-heading">
            <h2 :id="`plan-dialog-${selectedPlan.name}`">
              <template v-if="selectedPlan.family">
                {{ selectedPlan.family }} <span>· {{ selectedPlan.name }}</span>
              </template>
              <template v-else>{{ selectedPlan.name }}</template>
            </h2>
            <p>按月订阅 · 到期可手动续费</p>
          </header>

          <div class="modal-price-panel">
            <strong>{{ selectedPlan.price }}</strong>
            <div>
              <span>包含额度 {{ selectedPlan.quota }}</span>
              <em>{{ selectedPlan.discount }}</em>
            </div>
          </div>

          <p v-if="selectedPlan.family" class="modal-description">Token Pack，性价比之选</p>
          <h3 class="model-list-title">
            支持模型 <span>({{ getPlanModels(selectedPlan).length }})</span>
          </h3>

          <div class="model-list">
            <div
              v-for="(model, index) in getPlanModels(selectedPlan)"
              :key="`${model.name}-${index}`"
            >
              <p>
                {{ model.name }} <span>{{ model.tier }}</span>
              </p>
              <i>—</i>
            </div>
          </div>

          <footer class="modal-actions">
            <button type="button" class="modal-cancel" @click="closePlanDetail">关闭</button>
            <button type="button" class="modal-buy" @click="buyPlan(selectedPlan)">立即购买</button>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.plans-shell {
  min-height: 100vh;
  color: #13182d;
  background: #f7f8fc;
}
.workspace-header {
  position: fixed;
  z-index: 30;
  inset: 0 0 auto;
  display: flex;
  height: 70px;
  align-items: center;
  padding: 0 30px;
  border-bottom: 1px solid #e8eaf1;
  background: rgb(255 255 255 / 94%);
  backdrop-filter: blur(16px);
}
.brand {
  display: flex;
  width: 190px;
  align-items: center;
  gap: 10px;
  font-size: 17px;
}
.brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 9px;
  background: #5854f2;
  color: #fff;
  font-weight: 800;
}
.top-nav {
  display: flex;
  gap: 8px;
  align-items: center;
}
.top-nav a {
  padding: 10px 12px;
  color: #4f52e9;
  font-size: 14px;
}
.header-tools {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-left: auto;
  color: #667596;
  font-size: 13px;
}
.header-tools > button,
.avatar,
.menu-button {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
}
.account-menu {
  position: relative;
}
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #edf0f6;
  color: #25304a;
  font-weight: 700;
}
.account-dropdown {
  position: absolute;
  z-index: 60;
  top: calc(100% + 14px);
  right: 0;
  width: 250px;
  overflow: hidden;
  border: 1px solid #e4e8f0;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 10px 30px rgb(32 43 70 / 16%);
}
.account-email {
  overflow: hidden;
  padding: 16px;
  border-bottom: 1px solid #edf0f5;
  color: #667896;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.current-plan-menu {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 13px 14px;
  margin: 8px;
  border-radius: 9px;
  background: #f1f0ff;
  color: #37348e;
}
.current-plan-menu > span {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 9px;
  background: #5957e8;
  color: #fff;
}
.current-plan-menu div {
  display: grid;
  gap: 3px;
}
.current-plan-menu strong {
  font-size: 14px;
}
.current-plan-menu small {
  color: #68669d;
  font-size: 12px;
}
.account-dropdown-item {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  padding: 0 16px;
  border: 0;
  border-top: 1px solid #edf0f5;
  background: #fff;
  color: #17213a;
  cursor: pointer;
  font-size: 13px;
}
.account-dropdown-item:hover {
  background: #f7f8fc;
}
.logout-item {
  color: #ef3f1c;
}
.menu-button {
  display: none;
  margin-left: auto;
  font-size: 22px;
}
.plans-main {
  width: min(1160px, calc(100% - 48px));
  padding: 102px 0 64px;
  margin: 0 auto;
}
.balance-panel {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 20px 24px;
  margin-bottom: 28px;
  border: 1px solid #e5e7ef;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 28px rgb(35 40 75 / 5%);
}
.balance-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 12px;
  background: #efefff;
  color: #5957e8;
  font-size: 22px;
}
.balance-panel > div:nth-child(2) {
  display: grid;
  gap: 2px;
}
.balance-panel span {
  color: #747d94;
  font-size: 13px;
}
.balance-panel strong {
  font-size: 24px;
}
.balance-panel p {
  margin: 0;
  color: #737c92;
  font-size: 14px;
}
.balance-panel > a {
  color: #5957e8;
  font-size: 14px;
  font-weight: 700;
}
.plans-section {
  padding: 36px;
  border: 1px solid #e5e7ef;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 14px 44px rgb(35 40 75 / 6%);
}
.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 28px;
}
.section-heading span {
  color: #5957e8;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.section-heading h1 {
  margin: 8px 0 0;
  font-size: 32px;
  letter-spacing: -0.035em;
}
.section-heading > p {
  max-width: 370px;
  margin: 0;
  color: #727b91;
  font-size: 14px;
  line-height: 1.7;
  text-align: right;
}
.bundle-heading {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 12px;
  margin-bottom: 18px;
  border-bottom: 1px solid #e5e7ef;
}
.bundle-heading strong {
  font-size: 18px;
}
.bundle-heading span {
  color: #727b91;
  font-size: 14px;
}
.plan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.standalone-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 28px;
}
.plan-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 310px;
  padding: 24px;
  border: 1px solid #e4e6ed;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 16px rgb(35 40 75 / 4%);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.plan-card:hover {
  box-shadow: 0 12px 28px rgb(35 40 75 / 9%);
  transform: translateY(-2px);
}
.plan-card header {
  display: flex;
  min-height: 60px;
  gap: 8px;
  justify-content: space-between;
}
.plan-card h3 {
  margin: 0 0 9px;
  font-size: 20px;
}
.plan-card header p {
  margin: 0;
  color: #717a90;
  font-size: 14px;
  line-height: 1.6;
}
.discount-badge {
  height: fit-content;
  flex: 0 0 auto;
  padding: 4px 8px;
  border: 1px solid #bde9d6;
  border-radius: 999px;
  background: #eaf8f2;
  color: #259b72;
  font-size: 12px;
  font-weight: 700;
}
.plan-price {
  display: flex;
  gap: 8px;
  align-items: end;
  margin-top: auto;
  padding-top: 22px;
}
.plan-price strong {
  font-size: 31px;
  letter-spacing: -0.04em;
}
.plan-price span {
  padding-bottom: 5px;
  color: #737c92;
  font-size: 15px;
}
.plan-actions {
  display: grid;
  gap: 8px;
  margin-top: 18px;
}
.plan-card button {
  display: flex;
  width: 100%;
  height: 42px;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 1px solid #dfe2ea;
  border-radius: 10px;
  background: #fff;
  color: #363d55;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
}
.plan-card button:hover {
  border-color: #6b67ed;
  color: #5957e8;
}
.plan-card .buy-button {
  border-color: #5957e8;
  background: #5957e8;
  color: #fff;
}
.plan-card ul {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 6px 0 0;
  list-style: none;
}
.plan-card li {
  display: flex;
  gap: 8px;
  color: #505b73;
  font-size: 14px;
  line-height: 1.5;
}
.plan-card li span {
  color: #40aa7d;
  font-weight: 800;
}
.plan-modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(15 19 31 / 76%);
  backdrop-filter: blur(2px);
}
.plan-modal {
  position: relative;
  display: flex;
  width: min(640px, 100%);
  max-height: min(780px, calc(100vh - 48px));
  flex-direction: column;
  padding: 30px;
  border: 1px solid #dfe3ec;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 26px 80px rgb(10 17 39 / 28%);
}
.modal-close {
  position: absolute;
  top: 22px;
  right: 24px;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #5f687c;
  cursor: pointer;
  font-size: 26px;
  line-height: 1;
}
.modal-close:hover {
  background: #f1f3f8;
  color: #161c30;
}
.modal-heading h2 {
  margin: 0;
  color: #11182d;
  font-size: 23px;
  letter-spacing: -0.025em;
}
.modal-heading h2 span {
  color: #63708b;
}
.modal-heading p {
  margin: 8px 0 0;
  color: #66738e;
  font-size: 15px;
}
.modal-price-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px;
  margin-top: 24px;
  border: 1px solid #e2e6ef;
  border-radius: 14px;
  background: #fafbfe;
}
.modal-price-panel > strong {
  color: #11182d;
  font-size: 32px;
  letter-spacing: -0.035em;
}
.modal-price-panel > div {
  display: grid;
  gap: 6px;
  justify-items: end;
}
.modal-price-panel span {
  color: #65718a;
  font-size: 14px;
}
.modal-price-panel em {
  padding: 4px 10px;
  border: 1px solid #a9e9c7;
  border-radius: 999px;
  background: #edfff5;
  color: #1b9c5c;
  font-size: 13px;
  font-style: normal;
  font-weight: 700;
}
.modal-description {
  margin: 18px 0 16px;
  color: #65718a;
  font-size: 14px;
}
.model-list-title {
  margin: 0 0 10px;
  color: #151d32;
  font-size: 16px;
}
.modal-price-panel + .model-list-title {
  margin-top: 20px;
}
.model-list-title span {
  font-weight: 500;
}
.model-list {
  display: grid;
  gap: 6px;
  overflow-y: auto;
  min-height: 0;
  padding-right: 6px;
  scrollbar-color: #9da5b5 #eef1f6;
  scrollbar-width: thin;
}
.model-list > div {
  display: flex;
  min-height: 42px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 14px;
  border: 1px solid #e3e7ef;
  border-radius: 10px;
  background: #fafbfe;
}
.model-list p {
  margin: 0;
  color: #222b40;
  font-size: 14px;
}
.model-list p span {
  margin-left: 7px;
  color: #71809d;
}
.model-list i {
  color: #74819a;
  font-size: 14px;
  font-style: normal;
}
.modal-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 20px;
}
.modal-actions button {
  height: 42px;
  padding: 0 20px;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
}
.modal-cancel {
  background: transparent;
  color: #5957e8;
}
.modal-cancel:hover {
  background: #f1f0ff;
}
.modal-buy {
  background: #5957e8;
  color: #fff;
}
.modal-buy:hover {
  background: #4946d7;
}
@media (max-width: 980px) {
  .plan-grid,
  .standalone-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  .top-nav {
    display: none;
  }
  .plan-card header {
    min-height: 72px;
  }
}
@media (max-width: 620px) {
  .workspace-header {
    height: 62px;
    padding: 0 17px;
  }
  .brand {
    width: auto;
  }
  .header-tools {
    display: flex;
    gap: 0;
    margin-left: auto;
  }
  .header-tools > button {
    display: none;
  }
  .menu-button {
    display: none;
  }
  .plans-main {
    width: calc(100% - 24px);
    padding-top: 94px;
  }
  .balance-panel {
    grid-template-columns: auto 1fr;
  }
  .balance-panel p,
  .balance-panel > a {
    grid-column: 1 / -1;
  }
  .plans-section {
    padding: 26px 18px;
  }
  .section-heading {
    display: block;
  }
  .section-heading > p {
    margin-top: 10px;
    text-align: left;
  }
  .plan-grid,
  .standalone-grid {
    grid-template-columns: 1fr;
  }
  .bundle-heading {
    display: grid;
    gap: 6px;
  }
  .plan-modal-backdrop {
    align-items: end;
    padding: 12px;
  }
  .plan-modal {
    width: 100%;
    max-height: calc(100vh - 24px);
    padding: 24px 18px 18px;
    border-radius: 18px;
  }
  .modal-close {
    top: 15px;
    right: 15px;
  }
  .modal-heading h2 {
    padding-right: 42px;
    font-size: 21px;
  }
  .modal-price-panel {
    padding: 16px;
  }
  .modal-price-panel > strong {
    font-size: 27px;
  }
}
</style>
