<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const providers = [
  ['AI', 'Anthropic'],
  ['◉', 'DeepSeek'],
  ['✦', 'OpenAI'],
  ['◆', 'Google'],
  ['M', 'Moonshot'],
  ['千', 'Alibaba'],
]
const features = [
  {
    icon: '⌘',
    title: '统一 API',
    text: '一个 Base URL、一个 Key，兼容主流 SDK，模型切换无需重写业务代码。',
  },
  {
    icon: '↗',
    title: '智能路由',
    text: '按延迟、质量与成本动态选择节点，让每一次请求都稳定高效。',
  },
  { icon: '◇', title: '透明计量', text: 'Token 消耗、调用趋势与费用实时可查，预算使用一目了然。' },
  {
    icon: '◎',
    title: '企业级治理',
    text: '按项目管理密钥与权限，为团队设置额度、告警和访问策略。',
  },
]
const models = [
  { vendor: 'OpenAI', mark: 'O', name: 'GPT-5', type: '旗舰推理', color: '#111827' },
  { vendor: 'Anthropic', mark: 'AI', name: 'Claude Opus', type: '复杂任务', color: '#d97757' },
  { vendor: 'Google', mark: '✦', name: 'Gemini Pro', type: '多模态', color: '#4285f4' },
  { vendor: 'DeepSeek', mark: 'D', name: 'DeepSeek R1', type: '深度推理', color: '#4d6bfe' },
]
</script>

<template>
  <div class="landing">
    <header class="topbar">
      <RouterLink class="brand" to="/"
        ><span class="brand-mark">O</span><span>OmniMind</span></RouterLink
      >
      <nav class="nav" aria-label="主导航">
        <a href="#models">模型</a><a href="#features">能力</a><a href="#quickstart">接入</a
        ><a href="#pricing">价格</a><a href="#docs">文档</a>
      </nav>
      <div class="header-actions">
        <button class="icon-button" type="button" aria-label="切换主题">☾</button>
        <template v-if="!authStore.isAuthenticated"
          ><RouterLink class="login-link" to="/login">登录</RouterLink
          ><RouterLink class="register-link" to="/register">免费注册</RouterLink></template
        >
        <template v-else
          ><span class="user-name">{{ authStore.user?.displayName || authStore.user?.email }}</span
          ><button class="login-link plain-button" type="button" @click="authStore.logout">
            退出
          </button></template
        >
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="hero-glow"></div>
        <div class="hero-content">
          <div class="eyebrow"><span></span> 新一代多模型统一接入平台</div>
          <h1>一个 API<br /><em>连接所有 AI 能力</em></h1>
          <p>
            汇聚全球领先大模型，统一接口、灵活切换、按量计费，让 AI 能力接入从几周缩短到几分钟。
          </p>
          <div class="hero-actions">
            <RouterLink
              class="primary-button"
              :to="authStore.isAuthenticated ? '/change-password' : '/register'"
              >{{ authStore.isAuthenticated ? '进入工作台' : '免费开始' }}
              <span>→</span></RouterLink
            ><a class="secondary-button" href="#models">浏览模型</a>
          </div>
          <div class="hero-note">
            <span>✓</span> 无需信用卡 <span>✓</span> 免费试用额度 <span>✓</span> 分钟级接入
          </div>
        </div>
      </section>

      <section class="provider-strip">
        <p>已接入全球主流模型供应商</p>
        <div class="provider-list">
          <div v-for="provider in providers" :key="provider[1]" class="provider-pill">
            <strong>{{ provider[0] }}</strong
            ><span>{{ provider[1] }}</span>
          </div>
        </div>
      </section>

      <section id="quickstart" class="quickstart section-shell">
        <div class="section-copy">
          <span class="section-kicker">DEVELOPER FIRST</span>
          <h2>只改一行，立即接入</h2>
          <p>兼容 OpenAI SDK 与标准接口。保留熟悉的调用方式，只需更换 Base URL 和模型名称。</p>
          <ul>
            <li><i>01</i> 创建项目并生成 API Key</li>
            <li><i>02</i> 替换请求地址与模型名称</li>
            <li><i>03</i> 开始调用，实时查看用量</li>
          </ul>
        </div>
        <div class="code-card">
          <div class="code-toolbar">
            <span></span><span></span><span></span><b>quick_start.py</b><small>Python</small>
          </div>
          <pre><code><span class="purple">from</span> openai <span class="purple">import</span> OpenAI

client = OpenAI(
  base_url=<span class="green">"https://intertoken.ai/v1"</span>,
  api_key=<span class="green">"sk-your-key"</span>,
)

response = client.chat.completions.create(
  model=<span class="green">"openai/gpt-5"</span>,
  messages=[{<span class="green">"role"</span>: <span class="green">"user"</span>,
             <span class="green">"content"</span>: <span class="green">"你好！"</span>}],
)</code></pre>
          <div class="code-status"><span>●</span> API ready <small>响应时间 428ms</small></div>
        </div>
      </section>

      <section id="features" class="feature-section">
        <div class="section-heading">
          <span class="section-kicker">WHY OMNIMIND</span>
          <h2>一个平台，释放全部模型潜力</h2>
          <p>从开发接入到团队治理，覆盖 AI 应用上线后的每一个关键环节。</p>
        </div>
        <div class="feature-grid section-shell">
          <article v-for="feature in features" :key="feature.title" class="feature-card">
            <span class="feature-icon">{{ feature.icon }}</span>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.text }}</p>
            <a href="#quickstart">了解更多 <span>↗</span></a>
          </article>
        </div>
      </section>

      <section id="models" class="models-section section-shell">
        <div class="models-title">
          <div>
            <span class="section-kicker">POPULAR MODELS</span>
            <h2>热门模型</h2>
          </div>
          <a href="#models">查看全部模型 <span>→</span></a>
        </div>
        <div class="model-grid">
          <article v-for="model in models" :key="model.name" class="model-card">
            <div class="model-top">
              <span class="model-logo" :style="{ color: model.color }">{{ model.mark }}</span
              ><small>{{ model.type }}</small>
            </div>
            <span class="vendor">{{ model.vendor }}</span>
            <h3>{{ model.name }}</h3>
            <div class="model-meta"><span>文本</span><span>流式输出</span><span>API</span></div>
            <a href="#quickstart">查看模型 <span>→</span></a>
          </article>
        </div>
      </section>

      <section id="pricing" class="cta-section">
        <div class="cta-orb orb-one"></div>
        <div class="cta-orb orb-two"></div>
        <span class="section-kicker light">START BUILDING</span>
        <h2>30 秒开始第一次调用</h2>
        <p>免费注册，即刻获得试用额度。无需信用卡，也没有隐藏费用。</p>
        <div class="cta-actions">
          <RouterLink class="white-button" to="/register">免费注册 <span>→</span></RouterLink
          ><a class="ghost-button" href="#docs">查看接入文档</a>
        </div>
      </section>
    </main>

    <footer id="docs" class="footer section-shell">
      <div class="footer-brand">
        <div class="brand"><span class="brand-mark">O</span><span>OmniMind</span></div>
        <p>全模智域 · 让每一种智能触手可及</p>
      </div>
      <div class="footer-links">
        <div><b>产品</b><a href="#models">模型广场</a><a href="#pricing">价格方案</a></div>
        <div><b>资源</b><a href="#quickstart">开发文档</a><a href="#features">服务状态</a></div>
        <div>
          <b>账户</b><RouterLink to="/login">登录</RouterLink
          ><RouterLink to="/register">免费注册</RouterLink>
        </div>
      </div>
      <div class="copyright">
        © 2026 OmniMind. All rights reserved.<span>服务条款 · 隐私政策</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  overflow: hidden;
  color: #17182d;
  background: #fff;
}
.topbar {
  position: sticky;
  z-index: 20;
  top: 0;
  display: flex;
  height: 72px;
  align-items: center;
  gap: 44px;
  padding: 0 max(24px, calc((100vw - 1200px) / 2));
  border-bottom: 1px solid #ececf4;
  background: rgb(255 255 255/92%);
  backdrop-filter: blur(16px);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: #fff;
  border-radius: 10px;
  background: linear-gradient(145deg, #635bff, #4844e8);
  box-shadow: 0 8px 22px rgb(89 87 232/25%);
}
.nav {
  display: flex;
  gap: 32px;
  margin-right: auto;
  color: #54566d;
  font-size: 14px;
}
.nav a,
.login-link {
  transition: color 0.2s;
}
.nav a:hover,
.login-link:hover {
  color: #5957e8;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
}
.icon-button,
.plain-button {
  border: 0;
  background: none;
  cursor: pointer;
}
.icon-button {
  color: #5d6075;
  font-size: 21px;
}
.register-link {
  padding: 10px 18px;
  color: #fff;
  border-radius: 11px;
  background: #5957e8;
  font-weight: 650;
  box-shadow: 0 7px 18px rgb(89 87 232/23%);
}
.user-name {
  max-width: 150px;
  overflow: hidden;
  color: #65677a;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hero {
  position: relative;
  display: grid;
  min-height: 610px;
  place-items: center;
  padding: 90px 24px 80px;
  text-align: center;
  background-image:
    linear-gradient(#ededf4 1px, transparent 1px),
    linear-gradient(90deg, #ededf4 1px, transparent 1px);
  background-size: 48px 48px;
}
.hero::after {
  position: absolute;
  inset: 0;
  content: '';
  background: radial-gradient(
    circle at 50% 43%,
    rgb(235 233 255/92%) 0,
    rgb(255 255 255/74%) 34%,
    #fff 72%
  );
}
.hero-glow {
  position: absolute;
  z-index: 1;
  top: 80px;
  left: calc(50% - 260px);
  width: 520px;
  height: 310px;
  border-radius: 50%;
  background: rgb(113 95 255/12%);
  filter: blur(60px);
}
.hero-content {
  position: relative;
  z-index: 2;
  max-width: 880px;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  color: #5957e8;
  border: 1px solid #dedcff;
  border-radius: 999px;
  background: rgb(255 255 255/70%);
  font-size: 13px;
  font-weight: 650;
}
.eyebrow span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #625af5;
  box-shadow: 0 0 0 4px #e7e5ff;
}
h1 {
  margin: 26px 0 20px;
  font-size: clamp(48px, 6.4vw, 82px);
  line-height: 1.06;
  letter-spacing: -0.055em;
}
h1 em {
  color: #5551ed;
  font-style: normal;
}
.hero-content > p {
  max-width: 730px;
  margin: auto;
  color: #6d7084;
  font-size: clamp(16px, 2vw, 19px);
  line-height: 1.85;
}
.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 34px;
}
.primary-button,
.secondary-button,
.white-button,
.ghost-button {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 0 24px;
  border-radius: 11px;
  font-size: 15px;
  font-weight: 700;
}
.primary-button {
  color: #fff;
  background: #5957e8;
  box-shadow: 0 13px 30px rgb(89 87 232/25%);
}
.secondary-button {
  border: 1px solid #dedfe7;
  background: #fff;
}
.hero-note {
  display: flex;
  gap: 17px;
  justify-content: center;
  margin-top: 22px;
  color: #9294a3;
  font-size: 12px;
}
.hero-note span {
  color: #6763ef;
}
.provider-strip {
  padding: 34px 24px 40px;
  border-block: 1px solid #eff0f5;
  background: #f8f9fd;
  text-align: center;
}
.provider-strip > p {
  margin: 0 0 22px;
  color: #9698a8;
  font-size: 12px;
}
.provider-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}
.provider-pill {
  display: flex;
  min-width: 136px;
  align-items: center;
  gap: 9px;
  padding: 11px 17px;
  border: 1px solid #e6e7ee;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 5px 15px rgb(39 43 75/4%);
  font-size: 13px;
}
.provider-pill strong {
  color: #5752ed;
}
.section-shell {
  width: min(1180px, calc(100% - 48px));
  margin-inline: auto;
}
.quickstart {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 90px;
  align-items: center;
  padding-block: 120px;
}
.section-kicker {
  color: #5b57ed;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.17em;
}
.section-copy h2,
.section-heading h2,
.models-title h2,
.cta-section h2 {
  margin: 13px 0 18px;
  font-size: clamp(34px, 4vw, 48px);
  line-height: 1.15;
  letter-spacing: -0.045em;
}
.section-copy > p,
.section-heading > p {
  color: #717486;
  line-height: 1.8;
}
.section-copy ul {
  display: grid;
  gap: 18px;
  padding: 0;
  margin: 32px 0 0;
  list-style: none;
}
.section-copy li {
  display: flex;
  align-items: center;
  gap: 14px;
  font-weight: 600;
}
.section-copy i {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: #5a56e9;
  border-radius: 9px;
  background: #f0efff;
  font-size: 11px;
  font-style: normal;
}
.code-card {
  overflow: hidden;
  border: 1px solid #292b42;
  border-radius: 18px;
  background: #151726;
  box-shadow: 0 32px 70px rgb(30 31 58/22%);
}
.code-toolbar {
  display: flex;
  height: 52px;
  align-items: center;
  gap: 7px;
  padding: 0 18px;
  color: #85889d;
  border-bottom: 1px solid #292b3b;
  font-size: 11px;
}
.code-toolbar > span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fb6b66;
}
.code-toolbar > span:nth-child(2) {
  background: #f5bd4f;
}
.code-toolbar > span:nth-child(3) {
  background: #60c453;
}
.code-toolbar b {
  margin-left: 12px;
  color: #c2c4cf;
  font-weight: 500;
}
.code-toolbar small {
  margin-left: auto;
}
pre {
  min-height: 332px;
  padding: 26px 30px;
  margin: 0;
  color: #d8d9e2;
  font:
    13px/1.8 'SFMono-Regular',
    Consolas,
    monospace;
  white-space: pre-wrap;
}
.purple {
  color: #b69cff;
}
.green {
  color: #79d6aa;
}
.code-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 20px;
  color: #9296aa;
  border-top: 1px solid #292b3b;
  font-size: 11px;
}
.code-status > span {
  color: #58d49b;
}
.code-status small {
  margin-left: auto;
}
.feature-section {
  padding: 110px 0;
  background: #f7f8fc;
}
.section-heading {
  max-width: 670px;
  margin: 0 auto 54px;
  text-align: center;
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.feature-card {
  padding: 28px;
  border: 1px solid #e8e9ef;
  border-radius: 18px;
  background: #fff;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 45px rgb(41 44 79/9%);
}
.feature-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  color: #5957e8;
  border-radius: 12px;
  background: #efefff;
  font-size: 20px;
}
.feature-card h3 {
  margin: 24px 0 11px;
  font-size: 18px;
}
.feature-card p {
  min-height: 76px;
  margin: 0;
  color: #737688;
  font-size: 13px;
  line-height: 1.75;
}
.feature-card a {
  display: inline-flex;
  gap: 7px;
  margin-top: 22px;
  color: #5b57e9;
  font-size: 12px;
  font-weight: 700;
}
.models-section {
  padding-block: 115px 125px;
}
.models-title {
  display: flex;
  align-items: end;
  justify-content: space-between;
  margin-bottom: 38px;
}
.models-title h2 {
  margin-bottom: 0;
}
.models-title > a {
  color: #5a56e9;
  font-size: 13px;
  font-weight: 700;
}
.model-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.model-card {
  padding: 22px;
  border: 1px solid #e7e8ef;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 9px 30px rgb(33 36 68/5%);
}
.model-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.model-logo {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid #e8e9ef;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 800;
}
.model-top small {
  padding: 5px 8px;
  color: #6965df;
  border-radius: 6px;
  background: #f0efff;
  font-size: 10px;
}
.vendor {
  display: block;
  margin-top: 22px;
  color: #9799a7;
  font-size: 11px;
}
.model-card h3 {
  margin: 6px 0 18px;
  font-size: 18px;
}
.model-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.model-meta span {
  padding: 5px 7px;
  color: #858797;
  border-radius: 5px;
  background: #f5f6f9;
  font-size: 9px;
}
.model-card > a {
  display: flex;
  justify-content: space-between;
  padding-top: 17px;
  margin-top: 20px;
  color: #5957e8;
  border-top: 1px solid #eeeef3;
  font-size: 12px;
  font-weight: 700;
}
.cta-section {
  position: relative;
  overflow: hidden;
  padding: 95px 24px;
  color: #fff;
  background: linear-gradient(125deg, #4d49db, #6860f3);
  text-align: center;
}
.cta-section > *:not(.cta-orb) {
  position: relative;
  z-index: 2;
}
.section-kicker.light {
  color: #d5d3ff;
}
.cta-section h2 {
  margin-bottom: 14px;
}
.cta-section p {
  color: #dddfff;
}
.cta-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 30px;
}
.white-button {
  color: #514de0;
  background: #fff;
}
.ghost-button {
  color: #fff;
  border: 1px solid rgb(255 255 255/35%);
}
.cta-orb {
  position: absolute;
  border-radius: 50%;
  background: rgb(255 255 255/8%);
}
.orb-one {
  width: 380px;
  height: 380px;
  top: -210px;
  left: 8%;
}
.orb-two {
  width: 290px;
  height: 290px;
  right: 8%;
  bottom: -190px;
}
.footer {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 70px;
  padding-block: 70px 28px;
}
.footer-brand p {
  color: #898b9c;
  font-size: 13px;
}
.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 35px;
}
.footer-links div {
  display: grid;
  align-content: start;
  gap: 12px;
}
.footer-links b {
  margin-bottom: 5px;
  font-size: 13px;
}
.footer-links a {
  color: #858797;
  font-size: 12px;
}
.copyright {
  display: flex;
  grid-column: 1/-1;
  justify-content: space-between;
  padding-top: 25px;
  color: #aaa;
  border-top: 1px solid #eeeef2;
  font-size: 11px;
}
@media (max-width: 900px) {
  .nav {
    display: none;
  }
  .topbar {
    justify-content: space-between;
  }
  .quickstart {
    grid-template-columns: 1fr;
    gap: 52px;
  }
  .feature-grid,
  .model-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .footer {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .topbar {
    height: 64px;
    padding-inline: 17px;
  }
  .brand > span:last-child {
    display: none;
  }
  .header-actions {
    gap: 10px;
  }
  .icon-button,
  .user-name {
    display: none;
  }
  .register-link {
    padding: 9px 13px;
  }
  .hero {
    min-height: 560px;
    padding-top: 72px;
  }
  .hero-actions,
  .cta-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .hero-note {
    flex-wrap: wrap;
    gap: 7px 12px;
  }
  .provider-list {
    flex-wrap: nowrap;
    justify-content: start;
    overflow-x: auto;
    padding-bottom: 6px;
  }
  .quickstart,
  .feature-section,
  .models-section {
    padding-block: 78px;
  }
  .section-shell {
    width: min(100% - 32px, 1180px);
  }
  .feature-grid,
  .model-grid {
    grid-template-columns: 1fr;
  }
  .feature-card p {
    min-height: 0;
  }
  .models-title {
    align-items: start;
    gap: 20px;
  }
  .footer-links {
    gap: 18px;
  }
  .copyright {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
