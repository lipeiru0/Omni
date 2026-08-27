<script setup lang="ts">
defineProps<{ eyebrow: string; title: string; subtitle: string }>()
</script>

<template>
  <main class="auth-shell">
    <section class="brand-panel" aria-label="OmniMind 品牌介绍">
      <RouterLink class="brand" to="/" aria-label="返回 OmniMind 首页">
        <span class="brand-icon">O</span><strong>OmniMind</strong>
      </RouterLink>
      <div class="brand-copy">
        <span class="brand-kicker">OMNIMIND PLATFORM</span>
        <h1>全球大模型的统一 API</h1>
        <ul>
          <li><i>✓</i> 一个 BaseURL 接入主流模型</li>
          <li><i>✓</i> 兼容 OpenAI SDK，只改一行</li>
          <li><i>✓</i> 灵活路由，按量透明计费</li>
        </ul>
      </div>
      <p class="panel-footer">© 2026 OmniMind · 全模智域</p>
    </section>

    <section class="form-panel">
      <div class="mobile-brand"><span class="brand-icon">O</span><strong>OmniMind</strong></div>
      <div class="form-card">
        <p class="form-eyebrow">{{ eyebrow }}</p>
        <h2>{{ title }}</h2>
        <p class="form-subtitle">{{ subtitle }}</p>
        <slot />
      </div>
    </section>
  </main>
</template>

<style scoped>
.auth-shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 1fr 1fr;
  color: #15172b;
  background: #fff;
}
.brand-panel {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 70px clamp(54px, 6vw, 110px);
  background-color: #f5f7fb;
  background-image:
    linear-gradient(rgb(84 87 120 / 5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(84 87 120 / 5%) 1px, transparent 1px);
  background-size: 48px 48px;
}
.brand-panel::after {
  position: absolute;
  inset: 0;
  content: '';
  background: radial-gradient(circle at 45% 52%, rgb(255 255 255 / 10%), #f5f7fb 72%);
  pointer-events: none;
}
.brand,
.mobile-brand {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 13px;
  font-size: 26px;
  letter-spacing: -0.025em;
}
.brand-icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  color: #fff;
  border-radius: 11px;
  background: linear-gradient(145deg, #716bff, #5957e8);
  font-size: 20px;
  font-weight: 800;
  box-shadow: 0 10px 24px rgb(89 87 232 / 22%);
}
.brand-copy {
  position: absolute;
  z-index: 1;
  top: 50%;
  max-width: 620px;
  transform: translateY(-48%);
}
.brand-kicker {
  color: #8d90a2;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
}
.brand-copy h1 {
  margin: 18px 0 46px;
  color: #8e91a1;
  font-size: clamp(40px, 3.5vw, 62px);
  line-height: 1.12;
  letter-spacing: -0.045em;
}
.brand-copy ul {
  display: grid;
  gap: 23px;
  padding: 0;
  margin: 0;
  color: #a6a9b8;
  list-style: none;
  font-size: 17px;
}
.brand-copy li {
  display: flex;
  align-items: center;
  gap: 14px;
}
.brand-copy i {
  color: #7772ef;
  font-style: normal;
}
.panel-footer {
  position: absolute;
  z-index: 1;
  bottom: 34px;
  margin: 0;
  color: #b2b4c0;
  font-size: 11px;
}
.form-panel {
  position: relative;
  display: grid;
  min-height: 100vh;
  padding: 68px clamp(45px, 8vw, 150px);
  place-items: center;
  background: #fff;
}
.form-card {
  width: min(100%, 575px);
}
.form-eyebrow {
  margin: 0 0 10px;
  color: #6662e9;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.17em;
}
.form-card h2 {
  margin: 0;
  font-size: 38px;
  line-height: 1.2;
  letter-spacing: -0.04em;
}
.form-subtitle {
  margin: 12px 0 42px;
  color: #9296ae;
  font-size: 16px;
}
.mobile-brand {
  display: none;
}
@media (max-width: 900px) {
  .auth-shell {
    display: block;
  }
  .brand-panel {
    display: none;
  }
  .form-panel {
    min-height: 100vh;
    padding: 100px 24px 55px;
    background: #f5f7fb;
  }
  .mobile-brand {
    position: absolute;
    top: 26px;
    left: 24px;
    display: flex;
    font-size: 18px;
  }
  .mobile-brand .brand-icon {
    width: 38px;
    height: 38px;
    font-size: 16px;
  }
  .form-card {
    padding: 34px 28px;
    border: 1px solid #e7e8ef;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 20px 55px rgb(35 38 75 / 8%);
  }
  .form-card h2 {
    font-size: 31px;
  }
}
@media (max-width: 480px) {
  .form-panel {
    padding-inline: 14px;
  }
  .form-card {
    padding: 30px 21px;
  }
  .form-eyebrow {
    display: none;
  }
}
</style>
