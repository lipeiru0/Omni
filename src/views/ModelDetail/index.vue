<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  getPublicCategories,
  getPublicCategory,
  type PublicCategory,
  type PublicCategoryDetail,
} from '@/api/categories'
import SiteHeader from '@/components/SiteHeader.vue'

interface ModelSpec extends PublicCategoryDetail {
  display_tier: string | null
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

const tierNames: Record<string, string> = {
  speed: '高速',
  quality: '高质量',
  value: '高性价比',
  free: '免费',
}

const route = useRoute()
const categories = ref<PublicCategory[]>([])
const specs = ref<ModelSpec[]>([])
const loading = ref(true)
const loadError = ref('')
const activeCodeTab = ref<'curl' | 'python'>('curl')

const modelId = computed(() => {
  const value = Array.isArray(route.params.modelId)
    ? route.params.modelId[0] || ''
    : String(route.params.modelId || '')
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
})

const model = computed(() => categories.value[0] || null)
const provider = computed(() => {
  const key = modelId.value.split('/')[0]?.toLowerCase() || ''
  return providerNames[key] || '其他'
})
const description = computed(() => model.value?.description?.trim() || '暂无模型介绍。')
const modalities = computed(() => {
  const value = `${modelId.value} ${description.value}`.toLowerCase()
  const result = ['text']
  if (/vision|视觉|图像|图片|多模态|gpt-4o|gemini|qwen3-vl|claude|kimi-k2\.6/.test(value)) {
    result.push('image')
  }
  if (/视频|video/.test(value)) result.push('video')
  if (/claude/.test(value)) result.push('file')
  return result
})
const routeCount = computed(() => specs.value.reduce((total, spec) => total + spec.sku_count, 0))
const curlCode = computed(
  () => `curl https://intertoken.ai/v1/chat/completions \\
  -H "Authorization: Bearer $OMNIMIND_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelId.value}",
    "messages": [{"role": "user", "content": "你好！"}]
  }'`,
)
const pythonCode = computed(
  () => `from openai import OpenAI

client = OpenAI(
    base_url="https://intertoken.ai/v1",
    api_key="YOUR_OMNIMIND_API_KEY",
)

response = client.chat.completions.create(
    model="${modelId.value}",
    messages=[{"role": "user", "content": "你好！"}],
)

print(response.choices[0].message.content)`,
)
const visibleCode = computed(() =>
  activeCodeTab.value === 'curl' ? curlCode.value : pythonCode.value,
)

function providerInitial(): string {
  return provider.value.slice(0, 1).toUpperCase()
}

function tierLabel(value: string | null): string {
  if (!value) return '标准规格'
  return tierNames[value.toLowerCase()] || value
}

function contextLabel(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1000) return `${Math.round(value / 1000)}K`
  return String(value)
}

function priceLabel(value: number | string | null): string {
  if (value === null || value === '') return '待公布'
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value)
  return `$${number.toLocaleString('en-US', { maximumFractionDigits: 4 })}`
}

function fallbackDetail(category: PublicCategory): ModelSpec {
  return {
    id: category.id,
    model_id: category.model_id,
    display_name: category.display_name,
    sku_name: tierLabel(category.display_tier),
    status: category.status,
    health_score: category.health_score,
    quality_score: category.quality_score,
    base_price: null,
    list_price: category.list_price,
    sku_count: 0,
    display_tier: category.display_tier,
  }
}

async function loadDetail(): Promise<void> {
  loading.value = true
  loadError.value = ''
  categories.value = []
  specs.value = []
  try {
    const allCategories = await getPublicCategories()
    const matches = allCategories.filter((item) => item.model_id === modelId.value)
    if (!matches.length) {
      loadError.value = '没有找到这个模型，可能已下架或链接有误。'
      return
    }
    categories.value = matches
    specs.value = await Promise.all(
      matches.map(async (category) => {
        try {
          const detail = await getPublicCategory(category.id)
          return { ...detail, display_tier: category.display_tier }
        } catch {
          return fallbackDetail(category)
        }
      }),
    )
  } catch {
    loadError.value = '模型详情加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

async function copyCode(): Promise<void> {
  try {
    await navigator.clipboard.writeText(visibleCode.value)
    ElMessage.success('接入代码已复制')
  } catch {
    ElMessage.warning('复制失败，请手动选择代码')
  }
}

watch(modelId, loadDetail, { immediate: true })
</script>

<template>
  <div class="detail-shell">
    <SiteHeader />

    <main class="detail-main">
      <RouterLink class="back-link" to="/models">← 返回模型列表</RouterLink>

      <div v-if="loading" class="loading-state" aria-label="正在加载模型详情">
        <div class="loading-hero"></div>
        <div class="loading-body"></div>
      </div>

      <section v-else-if="loadError" class="error-state">
        <span>MODEL NOT FOUND</span>
        <h1>暂时无法查看模型</h1>
        <p>{{ loadError }}</p>
        <button type="button" @click="loadDetail">重新加载</button>
      </section>

      <template v-else-if="model">
        <section class="model-hero">
          <div class="hero-copy">
            <span class="provider-pill">{{ provider }}</span>
            <div class="title-row">
              <span class="model-logo">
                <img v-if="model.icon_url" :src="model.icon_url" alt="" />
                <template v-else>{{ providerInitial() }}</template>
              </span>
              <div>
                <p>MODEL DETAIL</p>
                <h1>{{ model.display_name }}</h1>
              </div>
            </div>
            <p class="hero-description">{{ description }}</p>
            <div class="hero-tags">
              <span v-for="item in modalities" :key="item">{{ item }}</span>
              <span>OpenAI SDK 兼容</span>
            </div>
          </div>
          <div class="model-identity">
            <span>MODEL ID</span>
            <code>{{ modelId }}</code>
            <RouterLink to="/register">获取 API Key →</RouterLink>
          </div>
        </section>

        <section class="quick-stats" aria-label="模型快速参数">
          <div>
            <span>上下文窗口</span><strong>{{ contextLabel(model.context_window) }}</strong>
          </div>
          <div>
            <span>模型厂商</span><strong>{{ provider }}</strong>
          </div>
          <div>
            <span>可选规格</span><strong>{{ specs.length }} 档</strong>
          </div>
          <div>
            <span>聚合路由</span><strong>{{ routeCount || '—' }}</strong>
          </div>
        </section>

        <div class="content-grid">
          <div class="primary-content">
            <section class="content-card pricing-card">
              <div class="section-heading">
                <div>
                  <span>PRICING</span>
                  <h2>规格与平台指导价</h2>
                </div>
                <p>每百万输入 tokens</p>
              </div>

              <div class="spec-list">
                <article v-for="spec in specs" :key="spec.id" class="spec-row">
                  <div class="spec-name">
                    <span>{{ tierLabel(spec.display_tier) }}</span>
                    <strong>{{ spec.sku_name || tierLabel(spec.display_tier) }}</strong>
                  </div>
                  <div class="spec-route">
                    <span>可路由节点</span><strong>{{ spec.sku_count || '—' }}</strong>
                  </div>
                  <div class="spec-price">
                    <span>指导价</span><strong>{{ priceLabel(spec.list_price) }}</strong>
                  </div>
                </article>
              </div>
              <p class="pricing-note">实际扣费以调用时选择的规格和账户折扣为准。</p>
            </section>

            <section class="content-card api-card">
              <div class="section-heading">
                <div>
                  <span>QUICK START</span>
                  <h2>API 接入</h2>
                </div>
                <p>复制即可调用</p>
              </div>
              <div class="code-toolbar">
                <div>
                  <button
                    type="button"
                    :class="{ active: activeCodeTab === 'curl' }"
                    @click="activeCodeTab = 'curl'"
                  >
                    cURL
                  </button>
                  <button
                    type="button"
                    :class="{ active: activeCodeTab === 'python' }"
                    @click="activeCodeTab = 'python'"
                  >
                    Python
                  </button>
                </div>
                <button class="copy-button" type="button" @click="copyCode">复制代码</button>
              </div>
              <pre><code>{{ visibleCode }}</code></pre>
            </section>
          </div>

          <aside class="detail-aside">
            <section class="aside-card plan-card">
              <span>推荐套餐</span>
              <h2>{{ model.display_name }} 体验套餐</h2>
              <p>购买套餐后按量使用，统一余额可调用套餐支持的全部模型。</p>
              <RouterLink to="/workspace/plans">查看套餐 →</RouterLink>
            </section>

            <section class="aside-card capability-card">
              <h2>模型能力</h2>
              <ul>
                <li v-for="item in modalities" :key="item">
                  <span>✓</span>
                  <div>
                    <strong>{{ item }}</strong
                    ><small>支持 {{ item }} 输入</small>
                  </div>
                </li>
                <li>
                  <span>✓</span>
                  <div><strong>统一接口</strong><small>兼容 OpenAI SDK</small></div>
                </li>
                <li>
                  <span>✓</span>
                  <div><strong>智能路由</strong><small>自动选择可用节点</small></div>
                </li>
              </ul>
            </section>
          </aside>
        </div>

        <section class="bottom-cta">
          <div>
            <span>READY TO BUILD</span>
            <h2>立即使用 {{ model.display_name }}</h2>
          </div>
          <div>
            <RouterLink to="/register">免费注册</RouterLink
            ><RouterLink class="secondary" to="/models">浏览其他模型</RouterLink>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.detail-shell {
  min-height: 100vh;
  background: radial-gradient(circle at 76% 12%, rgb(101 97 255 / 8%), transparent 24rem), #f7f8fc;
  color: #12182d;
}
.detail-main {
  width: min(1240px, calc(100% - 64px));
  padding: 104px 0 72px;
  margin: 0 auto;
}
.back-link {
  display: inline-flex;
  margin-bottom: 22px;
  color: #66728d;
  font-size: 14px;
  text-decoration: none;
}
.back-link:hover {
  color: #5552e8;
}
.model-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 370px;
  gap: 42px;
  align-items: center;
  padding: 42px 46px;
  border: 1px solid #e1e4ed;
  border-radius: 24px;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 16px 48px rgb(32 40 74 / 7%);
}
.provider-pill,
.hero-tags span,
.spec-name > span {
  display: inline-flex;
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  background: #efefff;
  color: #5552e8;
  font-size: 12px;
  font-weight: 700;
}
.title-row {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-top: 18px;
}
.model-logo {
  display: grid;
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  overflow: hidden;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(145deg, #f1f2ff, #e7e8f4);
  color: #535d77;
  font-size: 21px;
  font-weight: 800;
}
.model-logo img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}
.title-row p {
  margin: 0 0 3px;
  color: #7774e9;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
}
.title-row h1 {
  margin: 0;
  font-size: clamp(30px, 4vw, 48px);
  letter-spacing: -0.045em;
  line-height: 1.08;
}
.hero-description {
  max-width: 730px;
  margin: 23px 0 0;
  color: #66728a;
  font-size: 16px;
  line-height: 1.85;
}
.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;
}
.hero-tags span {
  background: #f3f5f9;
  color: #5f6a82;
  font-weight: 600;
}
.model-identity {
  display: grid;
  gap: 14px;
  padding: 27px;
  border: 1px solid #dfe1f7;
  border-radius: 18px;
  background: linear-gradient(145deg, #f7f6ff, #f0f2ff);
}
.model-identity > span {
  color: #7774e9;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.model-identity code {
  overflow-wrap: anywhere;
  color: #222b45;
  font-size: 15px;
  font-weight: 700;
}
.model-identity a {
  width: fit-content;
  padding: 11px 16px;
  border-radius: 10px;
  background: #5957e8;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 22px 0;
  overflow: hidden;
  border: 1px solid #e1e4ed;
  border-radius: 18px;
  background: #fff;
}
.quick-stats > div {
  display: grid;
  gap: 7px;
  padding: 23px 27px;
  border-right: 1px solid #e7e9f0;
}
.quick-stats > div:last-child {
  border-right: 0;
}
.quick-stats span,
.spec-row span {
  color: #7e879b;
  font-size: 12px;
}
.quick-stats strong {
  font-size: 19px;
}
.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 22px;
  align-items: start;
}
.primary-content,
.detail-aside {
  display: grid;
  gap: 22px;
}
.content-card,
.aside-card {
  padding: 30px;
  border: 1px solid #e1e4ed;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 8px 28px rgb(32 40 74 / 4%);
}
.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}
.section-heading span,
.plan-card > span,
.bottom-cta span {
  color: #5957e8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
}
.section-heading h2,
.aside-card h2 {
  margin: 5px 0 0;
  font-size: 23px;
  letter-spacing: -0.025em;
}
.section-heading p {
  margin: 0;
  color: #8992a5;
  font-size: 12px;
}
.spec-list {
  display: grid;
  gap: 10px;
}
.spec-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 120px 140px;
  gap: 18px;
  align-items: center;
  padding: 18px 20px;
  border: 1px solid #e7e9f0;
  border-radius: 14px;
  background: #fbfcfe;
}
.spec-name,
.spec-route,
.spec-price {
  display: grid;
  gap: 6px;
}
.spec-name > span {
  padding: 3px 8px;
  font-size: 10px;
}
.spec-name strong {
  font-size: 15px;
}
.spec-route strong {
  color: #3f4962;
}
.spec-price {
  justify-items: end;
}
.spec-price strong {
  color: #171d31;
  font-size: 23px;
}
.pricing-note {
  margin: 16px 0 0;
  color: #8992a5;
  font-size: 12px;
}
.code-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border: 1px solid #2e3448;
  border-bottom: 0;
  border-radius: 14px 14px 0 0;
  background: #1f2435;
}
.code-toolbar button {
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #919bb6;
  cursor: pointer;
  font-size: 12px;
}
.code-toolbar button.active {
  background: #353b53;
  color: #fff;
}
.code-toolbar .copy-button {
  color: #c4c9da;
}
pre {
  overflow: auto;
  min-height: 250px;
  padding: 24px;
  margin: 0;
  border-radius: 0 0 14px 14px;
  background: #171b29;
  color: #dce3fa;
  font-size: 13px;
  line-height: 1.75;
}
.plan-card {
  background: linear-gradient(145deg, #5d5af1, #4643d8);
  color: #fff;
}
.plan-card > span {
  color: #dcdcff;
}
.plan-card h2 {
  margin-top: 13px;
  color: #fff;
}
.plan-card p {
  margin: 14px 0 23px;
  color: #dcdcff;
  font-size: 14px;
  line-height: 1.7;
}
.plan-card a {
  display: flex;
  justify-content: center;
  padding: 12px;
  border-radius: 10px;
  background: #fff;
  color: #4c49dc;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
}
.capability-card ul {
  display: grid;
  gap: 16px;
  padding: 0;
  margin: 22px 0 0;
  list-style: none;
}
.capability-card li {
  display: flex;
  gap: 12px;
  align-items: center;
}
.capability-card li > span {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #eaf8f1;
  color: #24a36a;
  font-size: 12px;
  font-weight: 800;
}
.capability-card li div {
  display: grid;
  gap: 2px;
}
.capability-card li strong {
  font-size: 14px;
}
.capability-card li small {
  color: #8a93a6;
  font-size: 12px;
}
.bottom-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding: 34px 40px;
  margin-top: 22px;
  border: 1px solid #dedff5;
  border-radius: 20px;
  background: linear-gradient(110deg, #f1f0ff, #fff);
}
.bottom-cta h2 {
  margin: 5px 0 0;
  font-size: 25px;
}
.bottom-cta > div:last-child {
  display: flex;
  gap: 10px;
}
.bottom-cta a {
  padding: 12px 18px;
  border-radius: 10px;
  background: #5957e8;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
.bottom-cta a.secondary {
  border: 1px solid #d9dced;
  background: #fff;
  color: #4d5870;
}
.loading-state {
  display: grid;
  gap: 22px;
}
.loading-hero,
.loading-body {
  border-radius: 22px;
  background: linear-gradient(100deg, #edf0f6 30%, #f9fafc 45%, #edf0f6 60%);
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite;
}
.loading-hero {
  height: 370px;
}
.loading-body {
  height: 450px;
}
.error-state {
  display: grid;
  min-height: 520px;
  place-content: center;
  justify-items: center;
  text-align: center;
}
.error-state > span {
  color: #5957e8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
}
.error-state h1 {
  margin: 10px 0;
  font-size: 36px;
}
.error-state p {
  color: #758097;
}
.error-state button {
  padding: 11px 18px;
  border: 0;
  border-radius: 10px;
  background: #5957e8;
  color: #fff;
  cursor: pointer;
}
@keyframes shimmer {
  to {
    background-position-x: -200%;
  }
}
@media (max-width: 980px) {
  .model-hero,
  .content-grid {
    grid-template-columns: 1fr;
  }
  .detail-aside {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 760px) {
  .detail-main {
    width: calc(100% - 32px);
    padding-top: 94px;
  }
  .model-hero {
    gap: 26px;
    padding: 28px 24px;
  }
  .quick-stats {
    grid-template-columns: 1fr 1fr;
  }
  .quick-stats > div:nth-child(2) {
    border-right: 0;
  }
  .quick-stats > div:nth-child(-n + 2) {
    border-bottom: 1px solid #e7e9f0;
  }
  .content-card,
  .aside-card {
    padding: 23px;
  }
  .spec-row {
    grid-template-columns: 1fr 90px;
  }
  .spec-route {
    display: none;
  }
  .detail-aside {
    grid-template-columns: 1fr;
  }
  .bottom-cta {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 520px) {
  .detail-main {
    width: calc(100% - 24px);
    padding-top: 84px;
  }
  .title-row {
    align-items: flex-start;
  }
  .model-logo {
    width: 48px;
    height: 48px;
  }
  .title-row h1 {
    font-size: 28px;
  }
  .hero-description {
    font-size: 14px;
  }
  .model-identity {
    padding: 20px;
  }
  .quick-stats > div {
    padding: 18px;
  }
  .quick-stats strong {
    font-size: 16px;
  }
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 7px;
  }
  .spec-row {
    grid-template-columns: 1fr;
  }
  .spec-price {
    justify-items: start;
  }
  .bottom-cta {
    padding: 27px 23px;
  }
  .bottom-cta > div:last-child {
    width: 100%;
    flex-direction: column;
  }
  .bottom-cta a {
    text-align: center;
  }
}
</style>
