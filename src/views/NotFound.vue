<template>
  <main class="not-found">
    <div>
      <p>404</p>
      <h1>Not Found</h1>
      <span>你访问的页面不存在或尚未开放。</span>
      <RouterLink to="/">返回首页</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.not-found {
  display: grid;
  min-height: 100vh;
  padding: 24px;
  place-items: center;
  text-align: center;
}
.not-found p {
  margin: 0;
  color: var(--om-primary);
  font-size: 76px;
  font-weight: 750;
  letter-spacing: -0.06em;
}
.not-found h1 {
  margin: 0 0 12px;
  font-size: 32px;
}
.not-found span {
  display: block;
  color: var(--om-muted);
}
.not-found a {
  display: inline-block;
  margin-top: 28px;
  padding: 11px 22px;
  color: #fff;
  border-radius: 10px;
  background: var(--om-primary);
  font-weight: 600;
}
</style>
