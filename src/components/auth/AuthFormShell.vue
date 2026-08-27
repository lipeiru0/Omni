<script setup lang="ts">
defineProps<{ footerText: string; linkLabel: string; linkTo: string }>()
</script>

<template>
  <div class="form-shell">
    <slot />
    <p class="switch-copy">
      {{ footerText }}
      <RouterLink class="text-link" :to="linkTo">{{ linkLabel }}</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.form-shell :deep(.el-form-item) {
  margin-bottom: 22px;
}
.form-shell :deep(.el-form-item__label) {
  padding-bottom: 8px;
  color: #36384d;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
}
.form-shell :deep(.el-input__wrapper) {
  min-height: 48px;
  padding-inline: 14px;
  border-radius: 11px;
  background: #f3f6ff;
  box-shadow: 0 0 0 1px var(--om-border) inset;
}
.form-shell :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c8cad6 inset;
}
.form-shell :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px var(--om-primary) inset,
    0 0 0 3px rgb(89 87 232 / 10%);
}
.form-shell :deep(.el-button--primary) {
  width: 100%;
  min-height: 49px;
  margin-top: 7px;
  border-radius: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  box-shadow: 0 9px 22px rgb(89 87 232 / 20%);
}
.switch-copy {
  margin: 36px 0 0;
  color: var(--om-muted);
  font-size: 13px;
  text-align: center;
}
</style>
