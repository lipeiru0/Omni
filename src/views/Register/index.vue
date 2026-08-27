<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthFormShell from '@/components/auth/AuthFormShell.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { getCurrentUser, register } from '@/api/auth'
import { getErrorMessage } from '@/api/errors'
import { useAuthStore } from '@/stores/auth'
import { passwordByteLengthRule } from '@/utils/validation'

interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
  acceptedTerms: boolean
}

const formRef = ref<FormInstance>()
const loading = ref(false)
const router = useRouter()
const authStore = useAuthStore()
const form = reactive<RegisterForm>({
  email: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
})

const rules: FormRules<RegisterForm> = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] },
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, passwordByteLengthRule],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== form.password) callback(new Error('两次输入的密码不一致'))
        else callback()
      },
      trigger: ['blur', 'change'],
    },
  ],
  acceptedTerms: [
    {
      validator: (_rule, value: boolean, callback) => {
        if (!value) callback(new Error('请先阅读并同意服务条款和隐私政策'))
        else callback()
      },
      trigger: 'change',
    },
  ],
}

async function handleSubmit(): Promise<void> {
  if (!formRef.value || !(await formRef.value.validate().catch(() => false))) return
  loading.value = true
  try {
    const tokens = await register({ email: form.email, password: form.password })
    authStore.setSession(tokens, { email: form.email })
    try {
      authStore.setUser(await getCurrentUser())
    } catch (error) {
      if (!authStore.isAuthenticated) throw error
      ElMessage.warning('注册成功，但暂时无法读取完整用户资料。')
    }
    ElMessage.success('注册成功，已自动登录')
    await router.replace('/')
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout
    eyebrow="START EXPLORING"
    title="创建 OmniMind 账号"
    subtitle="注册后即可开始探索主流 AI 模型。"
  >
    <AuthFormShell footer-text="已有账号？" link-label="立即登录" link-to="/login">
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
        <ElFormItem label="密码" prop="password">
          <ElInput
            v-model="form.password"
            autocomplete="new-password"
            placeholder="请输入 8–72 字节密码"
            show-password
            size="large"
          />
        </ElFormItem>
        <ElFormItem label="确认密码" prop="confirmPassword">
          <ElInput
            v-model="form.confirmPassword"
            autocomplete="new-password"
            placeholder="请再次输入密码"
            show-password
            size="large"
            @keyup.enter="handleSubmit"
          />
        </ElFormItem>
        <ElFormItem prop="acceptedTerms" class="terms-item">
          <ElCheckbox v-model="form.acceptedTerms">
            我已阅读并同意
            <RouterLink class="text-link" to="/terms" @click.stop>《服务条款》</RouterLink>
            和
            <RouterLink class="text-link" to="/privacy" @click.stop>《隐私政策》</RouterLink>
          </ElCheckbox>
        </ElFormItem>
        <ElButton type="primary" native-type="submit" :loading="loading">
          {{ loading ? '注册中...' : '创建账号' }}
        </ElButton>
      </ElForm>
    </AuthFormShell>
  </AuthLayout>
</template>

<style scoped>
.terms-item {
  margin-top: -2px;
}
:deep(.terms-item .el-form-item__content) {
  line-height: 1.6;
}
:deep(.terms-item .el-checkbox) {
  height: auto;
  align-items: flex-start;
  white-space: normal;
}
:deep(.terms-item .el-checkbox__input) {
  margin-top: 4px;
}
:deep(.terms-item .el-checkbox__label) {
  color: var(--om-muted);
  font-size: 12px;
  white-space: normal;
}
</style>
