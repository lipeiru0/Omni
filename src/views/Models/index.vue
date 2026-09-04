<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getPublicCategories, type PublicCategory } from '@/api/categories'
import SiteHeader from '@/components/SiteHeader.vue'

interface ModelCard {
  id: string
  modelId: string | null
  name: string
  description: string
  iconUrl: string | null
  contextWindow: number | null
  provider: string
  tiers: string[]
  prices: number[]
  modalities: string[]
  available: boolean
}

const providerNames: Record<string, string> = {
  anthropic: 'Anthropic',
  baidu: 'Baidu',
  deepseek: 'DeepSeek',
  google: 'Google',
  minimax: 'MiniMax',
  moonshotai: 'Moonshot',
  openai: 'OpenAI',
  qwen: 'Alibaba',
  'z-ai': 'Z.ai',
}

const categories = ref<PublicCategory[]>([])
const searchText = ref('')
const providerFilter = ref('all')
const sortMode = ref<'default' | 'discount' | 'name'>('default')
const loading = ref(true)
const loadError = ref('')

function providerFor(modelId: string | null): string {
  if (!modelId) return '其他'
  return providerNames[modelId.split('/')[0]?.toLowerCase() || ''] || '其他'
}

function modalitiesFor(modelId: string | null, description: string): string[] {
  const value = `${modelId || ''} ${description}`.toLowerCase()
  const modalities = ['text']
  if (/vision|视觉|图像|图片|多模态|gpt-4o|gemini|qwen3-vl|claude|kimi-k2\.6/.test(value)) {
    modalities.push('image')
  }
  if (/视频|video/.test(value)) modalities.push('video')
  if (/claude/.test(value)) modalities.push('file')
  return modalities
}

const models = computed<ModelCard[]>(() => {
  const grouped = new Map<string, ModelCard>()
  for (const category of categories.value) {
    const key = category.model_id || `category:${category.id}`
    const price = Number(category.list_price)
    const existing = grouped.get(key)
    if (existing) {
      if (category.display_tier && !existing.tiers.includes(category.display_tier)) {
        existing.tiers.push(category.display_tier)
      }
      if (Number.isFinite(price)) existing.prices.push(price)
      continue
    }

    const description = category.description?.trim() || '暂无模型介绍。'
    grouped.set(key, {
      id: category.id,
      modelId: category.model_id,
      name: category.display_name?.trim() || '未命名模型',
      description,
      iconUrl: category.icon_url || null,
      contextWindow: category.context_window,
      provider: providerFor(category.model_id),
      tiers: category.display_tier ? [category.display_tier] : [],
      prices: Number.isFinite(price) ? [price] : [],
      modalities: modalitiesFor(category.model_id, description),
      available: Boolean(category.model_id),
    })
  }
  return [...grouped.values()]
})

const providers = computed(() => [...new Set(models.value.map((model) => model.provider))].sort())

function discountFor(model: ModelCard): number | null {
  if (model.prices.length < 2) return null
  const lowest = Math.min(...model.prices)
  const highest = Math.max(...model.prices)
  if (highest <= 0 || lowest >= highest) return null
  return Math.round((lowest / highest) * 10)
}

const filteredModels = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  const result = models.value.filter((model) => {
    const matchesProvider =
      providerFilter.value === 'all' || model.provider === providerFilter.value
    const matchesKeyword =
      !keyword ||
      model.name.toLowerCase().includes(keyword) ||
      model.provider.toLowerCase().includes(keyword) ||
      model.modelId?.toLowerCase().includes(keyword)
    return matchesProvider && matchesKeyword
  })

  if (sortMode.value === 'name') {
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }
  if (sortMode.value === 'discount') {
    return result.sort((a, b) => (discountFor(a) ?? 99) - (discountFor(b) ?? 99))
  }
  return result
})

function contextLabel(contextWindow: number | null): string {
  if (!contextWindow) return '—'
  if (contextWindow >= 1_000_000) return `${Math.round(contextWindow / 1000)}K`
  if (contextWindow >= 1000) return `${Math.round(contextWindow / 1000)}K`
  return String(contextWindow)
}

function providerInitial(provider: string): string {
  return provider.slice(0, 1).toUpperCase()
}

function clearFilters(): void {
  searchText.value = ''
  providerFilter.value = 'all'
}

async function loadModels(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    categories.value = await getPublicCategories()
  } catch {
    loadError.value = '模型数据加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

onMounted(loadModels)
</script>

<template>
  <div class="models-shell">
    <SiteHeader />

    <main class="models-main">
      <div class="page-heading">
        <div>
          <span>MODEL GALLERY</span>
          <h1>模型广场</h1>
          <p>共 {{ models.length }} 个模型 · 多档规格，享平台指导价折扣</p>
        </div>
        <div class="heading-orbit" aria-hidden="true"><i></i><b>AI</b></div>
      </div>

      <section class="filter-panel" aria-label="模型筛选">
        <label class="search-box">
          <span>⌕</span>
          <input v-model="searchText" type="search" placeholder="搜索模型名称、供应商…" />
        </label>
        <select v-model="providerFilter" aria-label="供应商筛选">
          <option value="all">全部供应商</option>
          <option v-for="provider in providers" :key="provider" :value="provider">
            {{ provider }}
          </option>
        </select>
        <select v-model="sortMode" aria-label="排序方式">
          <option value="default">默认排序</option>
          <option value="discount">折扣最大</option>
          <option value="name">名称排序</option>
        </select>
      </section>

      <div class="result-row">
        <p>
          显示 <strong>{{ filteredModels.length }}</strong> / {{ models.length }} 个模型
        </p>
        <button v-if="searchText || providerFilter !== 'all'" type="button" @click="clearFilters">
          清除筛选
        </button>
      </div>

      <div v-if="loading" class="model-grid" aria-label="正在加载模型">
        <div v-for="index in 8" :key="index" class="model-card skeleton"></div>
      </div>
      <div v-else-if="loadError" class="state-panel">
        <strong>暂时无法加载模型</strong>
        <p>{{ loadError }}</p>
        <button type="button" @click="loadModels">重新加载</button>
      </div>
      <div v-else-if="!filteredModels.length" class="state-panel">
        <strong>没有找到匹配的模型</strong>
        <p>试试更换关键词或供应商。</p>
      </div>
      <section v-else class="model-grid" aria-live="polite">
        <article
          v-for="model in filteredModels"
          :key="model.modelId || model.id"
          class="model-card"
          :class="{ unavailable: !model.available }"
        >
          <RouterLink
            v-if="model.modelId"
            class="card-link"
            :to="{ name: 'model-detail', params: { modelId: model.modelId } }"
            :aria-label="`查看 ${model.name} 详情`"
          />
          <div class="card-topline">
            <span class="provider-badge">{{ model.provider }}</span>
            <span v-if="discountFor(model)" class="discount-badge"
              >最低 {{ discountFor(model) }} 折</span
            >
            <span v-else-if="model.tiers.length > 1" class="tier-badge"
              >{{ model.tiers.length }} 档规格</span
            >
          </div>
          <div class="model-title">
            <span class="provider-logo"
              ><img v-if="model.iconUrl" :src="model.iconUrl" alt="" /><template v-else>{{
                providerInitial(model.provider)
              }}</template></span
            >
            <h2>{{ model.name }}</h2>
          </div>
          <p class="model-description">{{ model.description }}</p>
          <div class="model-meta">
            <span>{{ contextLabel(model.contextWindow) }} ctx</span>
            <span>{{ model.modalities.join(' · ') }}</span>
            <strong v-if="model.available">查看详情 →</strong>
          </div>
          <div v-if="!model.available" class="unavailable-note">暂不可用</div>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.models-shell {
  min-height: 100vh;
  color: #12182d;
  background: #f7f8fc;
}
.site-header {
  position: sticky;
  z-index: 30;
  top: 0;
  display: flex;
  height: 72px;
  align-items: center;
  padding: 0 34px;
  border-bottom: 1px solid #e6e9f1;
  background: rgb(255 255 255 / 94%);
  backdrop-filter: blur(16px);
}
.brand {
  display: flex;
  min-width: 205px;
  align-items: center;
  gap: 11px;
  color: #12182d;
  font-size: 20px;
  text-decoration: none;
}
.brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 11px;
  background: linear-gradient(145deg, #6865ff, #4f46ee);
  color: #fff;
  font-weight: 800;
}
.top-nav {
  display: flex;
  gap: 7px;
}
.top-nav a {
  padding: 10px 13px;
  border-radius: 10px;
  color: #5150e8;
  font-size: 15px;
  text-decoration: none;
}
.top-nav a:hover,
.top-nav a.active {
  background: #f0efff;
  color: #403ed4;
}
.header-actions {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-left: auto;
  color: #667492;
  font-size: 14px;
}
.header-actions > button,
.avatar {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #edf0f7;
  color: #26314b;
  font-weight: 800;
}
.account-menu {
  position: relative;
}
.account-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 250px;
  overflow: hidden;
  border: 1px solid #e2e6ef;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 45px rgb(25 34 59 / 16%);
}
.account-dropdown div,
.account-dropdown a,
.account-dropdown button {
  display: flex;
  width: 100%;
  min-height: 50px;
  align-items: center;
  padding: 0 17px;
  border: 0;
  border-bottom: 1px solid #edf0f5;
  background: #fff;
  color: #26314b;
  font-size: 14px;
  text-decoration: none;
}
.account-dropdown div {
  overflow: hidden;
  color: #71809c;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account-dropdown button {
  color: #e9442c;
  cursor: pointer;
}
.account-dropdown .plan-menu-card {
  gap: 10px;
  min-height: 70px;
  margin: 0;
  background: #f5f4ff;
  color: #37348e;
}
.plan-menu-card > span {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 9px;
  background: #5957e8;
  color: #fff;
}
.plan-menu-card p {
  display: grid;
  gap: 3px;
  margin: 0;
}
.plan-menu-card strong {
  font-size: 13px;
}
.plan-menu-card small {
  color: #7775ae;
  font-size: 12px;
}
.auth-links {
  display: flex;
  gap: 8px;
  align-items: center;
}
.auth-links a {
  padding: 8px 12px;
  color: #4e4ce4;
  text-decoration: none;
}
.auth-links .register {
  border-radius: 9px;
  background: #5854f2;
  color: #fff;
}
.models-main {
  width: min(1380px, calc(100% - 64px));
  padding: 126px 0 76px;
  margin: 0 auto;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 34px;
}
.page-heading > div > span {
  color: #5957e8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.page-heading h1 {
  margin: 8px 0 7px;
  font-size: 36px;
  letter-spacing: -0.045em;
}
.page-heading p {
  margin: 0;
  color: #707a92;
  font-size: 15px;
}
.heading-orbit {
  position: relative;
  display: grid;
  width: 88px;
  height: 88px;
  place-items: center;
  border: 1px solid #dbddff;
  border-radius: 50%;
  color: #5957e8;
}
.heading-orbit::before {
  position: absolute;
  width: 58px;
  height: 58px;
  border: 1px dashed #aaa8fa;
  border-radius: 50%;
  content: '';
}
.heading-orbit i {
  position: absolute;
  top: 9px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #5957e8;
  box-shadow: 0 0 0 5px #ecebff;
}
.heading-orbit b {
  font-size: 18px;
}
.filter-panel {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 190px 160px;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e4e7ef;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 28px rgb(30 39 70 / 5%);
}
.search-box {
  position: relative;
  display: block;
}
.search-box span {
  position: absolute;
  top: 50%;
  left: 15px;
  color: #8993a8;
  font-size: 22px;
  transform: translateY(-50%);
}
.search-box input,
.filter-panel select {
  width: 100%;
  height: 46px;
  border: 1px solid #dfe3ec;
  border-radius: 11px;
  outline: 0;
  background: #fbfcfe;
  color: #202a43;
  font: inherit;
  font-size: 14px;
}
.search-box input {
  padding: 0 16px 0 43px;
}
.filter-panel select {
  padding: 0 13px;
}
.search-box input:focus,
.filter-panel select:focus {
  border-color: #6a66ef;
  box-shadow: 0 0 0 3px rgb(89 87 232 / 11%);
}
.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
}
.result-row p {
  margin: 0;
  color: #727c93;
  font-size: 14px;
}
.result-row strong {
  color: #343d57;
}
.result-row button {
  border: 0;
  background: transparent;
  color: #5957e8;
  cursor: pointer;
  font-size: 13px;
}
.model-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}
.model-card {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 245px;
  flex-direction: column;
  padding: 21px;
  border: 1px solid #e0e4ed;
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 5px 18px rgb(30 39 70 / 4%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.card-link {
  position: absolute;
  z-index: 2;
  inset: 0;
  border-radius: inherit;
}
.card-link:focus-visible {
  outline: 3px solid rgb(89 87 232 / 30%);
  outline-offset: 3px;
}
.model-card:not(.unavailable):hover {
  border-color: #a9a6f7;
  box-shadow: 0 13px 32px rgb(38 43 91 / 10%);
  transform: translateY(-2px);
}
.card-topline {
  display: flex;
  min-height: 25px;
  align-items: start;
  justify-content: space-between;
  gap: 8px;
}
.provider-badge,
.discount-badge,
.tier-badge {
  display: inline-flex;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.provider-badge {
  background: #efefff;
  color: #514fdb;
}
.discount-badge {
  border: 1px solid #f1d69a;
  background: #fff8e7;
  color: #a96d08;
}
.tier-badge {
  background: #edf9f3;
  color: #27835e;
}
.model-title {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 13px;
}
.provider-logo {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  overflow: hidden;
  place-items: center;
  border-radius: 9px;
  background: #f1f3f8;
  color: #535e76;
  font-size: 13px;
  font-weight: 800;
}
.provider-logo img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
.model-title h2 {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  font-size: 16px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.model-description {
  display: -webkit-box;
  overflow: hidden;
  margin: 12px 0 0;
  color: #6f788e;
  font-size: 13px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.model-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 12px;
  padding-top: 17px;
  margin-top: auto;
  color: #8992a6;
  font-size: 12px;
}
.model-meta strong {
  margin-left: auto;
  color: #5957e8;
  font-size: 12px;
  font-weight: 700;
  opacity: 0;
  transform: translateX(-4px);
  transition: 0.2s ease;
}
.model-card:hover .model-meta strong,
.model-card:focus-within .model-meta strong {
  opacity: 1;
  transform: translateX(0);
}
.unavailable {
  opacity: 0.62;
}
.unavailable-note {
  margin-top: 10px;
  color: #be5a43;
  font-size: 12px;
}
.skeleton {
  border-color: transparent;
  background: linear-gradient(100deg, #f1f3f7 30%, #fafbfc 45%, #f1f3f7 60%);
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite;
}
.state-panel {
  display: grid;
  min-height: 280px;
  place-content: center;
  justify-items: center;
  border: 1px dashed #d8dce7;
  border-radius: 18px;
  background: #fff;
  text-align: center;
}
.state-panel strong {
  font-size: 18px;
}
.state-panel p {
  color: #758098;
}
.state-panel button {
  padding: 10px 17px;
  border: 0;
  border-radius: 9px;
  background: #5957e8;
  color: #fff;
  cursor: pointer;
}
@keyframes shimmer {
  to {
    background-position-x: -200%;
  }
}
@media (max-width: 1160px) {
  .model-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .top-nav {
    display: none;
  }
  .brand {
    min-width: auto;
  }
}
@media (max-width: 820px) {
  .models-main {
    width: calc(100% - 32px);
    padding-top: 110px;
  }
  .model-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .filter-panel {
    grid-template-columns: 1fr 1fr;
  }
  .search-box {
    grid-column: 1 / -1;
  }
  .heading-orbit {
    display: none;
  }
}
@media (max-width: 560px) {
  .site-header {
    height: 64px;
    padding: 0 16px;
  }
  .brand strong {
    font-size: 18px;
  }
  .brand-mark {
    width: 36px;
    height: 36px;
  }
  .header-actions > button,
  .header-actions > span {
    display: none;
  }
  .models-main {
    width: calc(100% - 24px);
    padding: 94px 0 48px;
  }
  .page-heading {
    margin-bottom: 25px;
  }
  .page-heading h1 {
    font-size: 30px;
  }
  .page-heading p {
    font-size: 13px;
  }
  .filter-panel {
    grid-template-columns: 1fr;
    padding: 12px;
  }
  .search-box {
    grid-column: auto;
  }
  .model-grid {
    grid-template-columns: 1fr;
  }
  .model-card {
    min-height: 220px;
  }
  .auth-links a {
    padding: 7px 9px;
    font-size: 13px;
  }
}
</style>
