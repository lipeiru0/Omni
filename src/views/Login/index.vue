<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AuthFormShell from '@/components/auth/AuthFormShell.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { getCurrentUser, getOAuthAuthorizeUrl, login } from '@/api/auth'
import { getErrorMessage } from '@/api/errors'
import { useAuthStore } from '@/stores/auth'
import type { LoginRequest } from '@/types/auth'
import type { OAuthProvider } from '@/types/auth'
import { passwordByteLengthRule } from '@/utils/validation'

interface LoginForm extends LoginRequest {
  remember: boolean
}

const formRef = ref<FormInstance>()
const loading = ref(false)
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const form = reactive<LoginForm>({ email: '', password: '', totp_code: '', remember: false })
const rules: FormRules<LoginForm> = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] },
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, passwordByteLengthRule],
}

async function handleSubmit(): Promise<void> {
  if (!formRef.value || !(await formRef.value.validate().catch(() => false))) return
  loading.value = true
  try {
    const tokens = await login({
      email: form.email,
      password: form.password,
      ...(form.totp_code ? { totp_code: form.totp_code } : {}),
    })
    authStore.setSession(tokens, { email: form.email }, form.remember)
    try {
      authStore.setUser(await getCurrentUser())
    } catch (error) {
      if (!authStore.isAuthenticated) throw error
      ElMessage.warning('登录成功，但暂时无法读取完整用户资料。')
    }
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    loading.value = false
  }
}

function beginOAuth(provider: OAuthProvider): void {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  sessionStorage.setItem('omnimind_oauth_redirect', redirect)
  window.location.assign(getOAuthAuthorizeUrl(provider))
}
</script>

<template>
  <AuthLayout eyebrow="WELCOME BACK" title="欢迎回来" subtitle="登录你的 OmniMind 账号">
    <AuthFormShell footer-text="还没有账号？" link-label="立即注册" link-to="/register">
      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <ElFormItem label="邮箱" prop="email">
          <ElInput
            v-model.trim="form.email"
            autocomplete="email"
            placeholder="请输入邮箱"
            size="large"
          />
        </ElFormItem>
        <div class="password-label">
          <span><i>*</i> 密码</span><RouterLink to="/forgot-password">忘记密码？</RouterLink>
        </div>
        <ElFormItem prop="password">
          <ElInput
            v-model="form.password"
            autocomplete="current-password"
            placeholder="请输入密码"
            show-password
            size="large"
            @keyup.enter="handleSubmit"
          />
        </ElFormItem>
        <details class="two-factor">
          <summary>使用两步验证码登录</summary>
          <ElFormItem prop="totp_code">
            <ElInput
              v-model.trim="form.totp_code"
              autocomplete="one-time-code"
              inputmode="numeric"
              placeholder="请输入 6 位验证码或备份码"
              size="large"
              @keyup.enter="handleSubmit"
            />
          </ElFormItem>
        </details>

        <ElCheckbox v-model="form.remember" class="remember">记住我</ElCheckbox>

        <ElButton type="primary" native-type="submit" :loading="loading">
          {{ loading ? '登录中...' : '登录' }}
        </ElButton>
      </ElForm>

      <div class="divider"><span>或使用第三方登录</span></div>
      <div class="oauth-grid">
        <button type="button" class="oauth-button" @click="beginOAuth('github')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.28-5.27-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.95 10.95 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.71 5.38-5.29 5.67.42.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"
            />
          </svg>
          GitHub
        </button>
        <button type="button" class="oauth-button" @click="beginOAuth('google')">
          <span class="google-icon">G</span>Google
        </button>
      </div>
    </AuthFormShell>
  </AuthLayout>
</template>

<style scoped>
.password-label {
  display: flex;
  width: 100%;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #36384d;
  font-size: 13px;
  font-weight: 600;
}
.password-label i {
  color: #f56c6c;
  font-style: normal;
}
.password-label a {
  color: #777a92;
  font-weight: 500;
}
.two-factor {
  margin: -6px 0 12px;
  color: #777a92;
  font-size: 12px;
}
.two-factor summary {
  cursor: pointer;
}
.two-factor :deep(.el-form-item) {
  margin: 12px 0 0;
}
.remember {
  margin: 0 0 13px;
}
:deep(.el-checkbox__label) {
  color: var(--om-muted);
  font-size: 13px;
}
.divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 32px 0 22px;
  color: #9396a9;
  font-size: 13px;
}
.divider::before,
.divider::after {
  height: 1px;
  flex: 1;
  content: '';
  background: #e7e8ef;
}
.oauth-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.oauth-button {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: center;
  gap: 11px;
  color: #17182b;
  border: 1px solid #dfe1e9;
  border-radius: 11px;
  background: #fff;
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  transition:
    border-color 0.2s,
    transform 0.2s;
}
.oauth-button:hover {
  transform: translateY(-1px);
  border-color: #bbbde0;
}
.oauth-button svg {
  width: 21px;
  height: 21px;
}
.google-icon {
  color: #4285f4;
  font-size: 21px;
  font-weight: 800;
}
@media (max-width: 480px) {
  .oauth-grid {
    grid-template-columns: 1fr;
  }
}
</style>
